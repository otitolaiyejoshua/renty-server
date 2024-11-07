const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Nodemailer transporter setup for Yahoo mail
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to generate a 6-digit verification code
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

      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          return res.status(500).send({ success: false, message: 'Failed to send verification code. Please try again.' });
        }
        res.status(201).send({
          success: true,
          message: `${role} registered successfully. Verification code sent to ${email}.`,
        });
      });
    });
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ success: false, message: 'Please provide email and password.' });
  }

  const userQuery = 'SELECT * FROM users WHERE email = ?';
  const agentQuery = 'SELECT * FROM agents WHERE email = ?';

  // Check if user exists in either 'users' or 'agents' tables
  db.query(userQuery, [email], (err, userResults) => {
    if (err) {
      return res.status(500).send({ success: false, message: 'Database error during login.' });
    }

    if (userResults.length > 0) {
      return handleLogin(userResults[0], password, res);
    }

    db.query(agentQuery, [email], (err, agentResults) => {
      if (err) {
        return res.status(500).send({ success: false, message: 'Database error during login.' });
      }

      if (agentResults.length > 0) {
        return handleLogin(agentResults[0], password, res);
      }

      return res.status(404).send({ success: false, message: 'User not found.' });
    });
  });
});

// Helper function to handle login
function handleLogin(user, password, res) {
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).send({ success: false, message: 'Invalid password.' });
  }

  if (!user.verified) {
    return res.status(403).send({ success: false, message: 'Please verify your email to log in.' });
  }

  // Generate JWT token using the new helper function
  const token = generateToken(user);

  // Send additional user information in the response
  res.status(200).send({
    success: true,
    message: 'Login successful.',
    token,
    userId: user.id,
    email: user.email,
    userRole: user.role,
    name: user.username,
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
