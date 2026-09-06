const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();
console.log('EMAIL USER:', process.env.EMAIL_USER);
console.log('EMAIL PASS LOADED:', !!process.env.EMAIL_PASS);
console.log('EMAIL PASS LENGTH:', process.env.EMAIL_PASS?.length);
// Nodemailer transporter setup for Yahoo mail
const transporter = nodemailer.createTransport({
  host: 'smtp.mail.yahoo.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ EMAIL CONFIGURATION ERROR:');
    console.error(error);
  } else {
    console.log('✅ Yahoo email transporter is ready');
  }
});
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Function to generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).send({ success: false, message: 'Please fill in all fields.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  const query = role === 'user'
    ? 'INSERT INTO users (username, email, password, role, verified) VALUES (?, ?, ?, ?, ?)'
    : 'INSERT INTO agents (name, email, password, role, verified) VALUES (?, ?, ?, ?, ?)';

  db.query(query, [username, email, hashedPassword, role, false], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).send({ success: false, message: 'Email already exists.' });
      }
      return res.status(500).send({ success: false, message: 'Database error during registration.' });
    }

    // Generate and store verification code
    const verificationCode = generateVerificationCode();
    const insertCodeQuery = 'INSERT INTO email_verifications (email, verification_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE verification_code = ?';
    
    db.query(insertCodeQuery, [email, verificationCode, verificationCode], (err) => {
      if (err) {
        return res.status(500).send({ success: false, message: 'Database error while generating verification code.' });
      }

      // Send verification email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification Code',
        text: `Your verification code is ${verificationCode}`,
      };

     transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ EMAIL SEND ERROR:');
    console.error(error);

    return res.status(500).send({
      success: false,
      message: 'Failed to send verification code. Please try again.'
    });
  }

  console.log('✅ VERIFICATION EMAIL SENT');
  console.log('Message ID:', info.messageId);
  console.log('Response:', info.response);

  return res.status(201).send({
    success: true,
    message: `${role} registered successfully. Verification code sent to ${email}.`,
  });
});
    });
  });
});

// POST /api/auth/login
// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).send({
      success: false,
      message: 'Please provide email, password and account type.'
    });
  }

  let query;

  if (role === 'agent') {
    query = 'SELECT * FROM agents WHERE email = ?';
  } else {
    query = 'SELECT * FROM users WHERE email = ?';
  }

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Login database error:', err);

      return res.status(500).send({
        success: false,
        message: 'Database error during login.'
      });
    }

    if (results.length === 0) {
      return res.status(404).send({
        success: false,
        message: role === 'agent'
          ? 'Agent account not found.'
          : 'User account not found.'
      });
    }

    handleLogin(results[0], password, role, res);
  });
});
// Helper function to handle login
function handleLogin(user, password, role, res) {
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).send({
      success: false,
      message: 'Invalid password.'
    });
  }

  if (!user.verified) {
    return res.status(403).send({
      success: false,
      message: 'Please verify your email to log in.'
    });
  }

  const token = generateToken({
    id: user.id,
    role: role
  });

  res.status(200).send({
    success: true,
    message: 'Login successful.',
    token,

    userId: role === 'user' ? user.id : null,
    agentId: role === 'agent' ? user.id : null,

    email: user.email,
    userRole: role,

    // Users have username, agents have name
    name: role === 'agent'
      ? user.name
      : user.username
  });
}
// POST /api/auth/verify-email
router.post('/verify-email', (req, res) => {
  const { email, verificationCode } = req.body;

  if (!email || !verificationCode) {
    return res.status(400).send({ success: false, message: 'Please provide email and verification code.' });
  }

  const verifyCodeQuery = 'SELECT * FROM email_verifications WHERE email = ? AND verification_code = ?';

  db.query(verifyCodeQuery, [email, verificationCode], (err, results) => {
    if (err) {
      return res.status(500).send({ success: false, message: 'Database error while verifying code.' });
    }

    if (results.length === 0) {
      return res.status(400).send({ success: false, message: 'Invalid verification code.' });
    }

    const updateQuery = email.endsWith('@agentdomain.com')
      ? 'UPDATE agents SET verified = TRUE WHERE email = ?'
      : 'UPDATE users SET verified = TRUE WHERE email = ?';

    db.query(updateQuery, [email], (err) => {
      if (err) {
        return res.status(500).send({ success: false, message: 'Database error while updating verification status.' });
      }

      db.query('DELETE FROM email_verifications WHERE email = ?', [email], (err) => {
        if (err) {
          return res.status(500).send({ success: false, message: 'Database error during cleanup.' });
        }

        res.status(200).send({ success: true, message: 'Email verified successfully.' });
      });
    });
  });
});

module.exports = router;
