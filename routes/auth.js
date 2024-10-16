// server/routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db'); // Ensure this points to your DB connection
const twilioClient = require('../twilio'); // Import Twilio client
const moment = require('moment'); // For time calculations
require('dotenv').config();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, pnumber, password, role } = req.body;

  // Input validation
  if (!username || !pnumber || !password || !role) {
    return res.status(400).send({ success: false, message: 'Please fill in all fields.' });
  }

  // Hash the password
  const hashedPassword = bcrypt.hashSync(password, 8);

  let query;
  let params;

  if (role === 'user') {
    query = 'INSERT INTO users (username, pnumber, password, role) VALUES (?, ?, ?, ?)';
    params = [username, pnumber, hashedPassword, role];
  } else if (role === 'agent') {
    query = 'INSERT INTO agents (name, pnumber, password, role) VALUES (?, ?, ?, ?)'; // Assuming `name` maps to `username`
    params = [username, pnumber, hashedPassword, role];
  } else {
    return res.status(400).send({ success: false, message: 'Invalid role specified.' });
  }

  // Execute query to insert user or agent
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error inserting into the database:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).send({ success: false, message: 'Phone number already exists.' });
      }
      return res.status(500).send({ success: false, message: 'Server error.' });
    }

    const userId = results.insertId;

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert OTP into the otps table
    const insertOTPQuery = 'INSERT INTO otps (pnumber, otp) VALUES (?, ?)';
    db.query(insertOTPQuery, [pnumber, otp], (err) => {
      if (err) {
        console.error('Error inserting OTP into database:', err);
        return res.status(500).send({ success: false, message: 'Server error while generating OTP.' });
      }

      // Send OTP via Twilio
      twilioClient.messages
        .create({
          body: `Your OTP code is ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: pnumber,
        })
        .then((message) => {
          console.log('OTP sent:', message.sid);
          res.status(201).send({
            success: true,
            message: `${role} registered successfully. OTP sent to ${pnumber}.`,
            userId,
          });
        })
        .catch((error) => {
          console.error('Twilio Error:', error);
          res.status(500).send({ success: false, message: 'Failed to send OTP. Please try again.' });
        });
    });
  });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { pnumber, otp } = req.body;

  // Input validation
  if (!pnumber || !otp) {
    return res.status(400).send({ success: false, message: 'Please provide phone number and OTP.' });
  }

  // Fetch the latest OTP for the phone number
  const fetchOTPQuery = 'SELECT * FROM otps WHERE pnumber = ? ORDER BY created_at DESC LIMIT 1';
  db.query(fetchOTPQuery, [pnumber], (err, results) => {
    if (err) {
      console.error('Error fetching OTP:', err);
      return res.status(500).send({ success: false, message: 'Server error.' });
    }

    if (results.length === 0) {
      return res.status(400).send({ success: false, message: 'No OTP found for this phone number.' });
    }

    const latestOTP = results[0];

    // Check if OTP matches
    if (latestOTP.otp !== otp) {
      return res.status(400).send({ success: false, message: 'Invalid OTP.' });
    }

    // Check if OTP is within 5 minutes
    const otpCreationTime = moment(latestOTP.created_at);
    const currentTime = moment();
    const diffMinutes = currentTime.diff(otpCreationTime, 'minutes');

    if (diffMinutes > 5) {
      return res.status(400).send({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // OTP is valid; mark the user as verified
    // Determine if the pnumber exists in users or agents table
    const checkUserQuery = 'SELECT * FROM users WHERE pnumber = ?';
    db.query(checkUserQuery, [pnumber], (err, userResults) => {
      if (err) {
        console.error('Error checking user table:', err);
        return res.status(500).send({ success: false, message: 'Server error.' });
      }

      if (userResults.length > 0) {
        // Update verified status in users table
        const updateUserQuery = 'UPDATE users SET verified = TRUE WHERE pnumber = ?';
        db.query(updateUserQuery, [pnumber], (err) => {
          if (err) {
            console.error('Error updating user verification:', err);
            return res.status(500).send({ success: false, message: 'Server error.' });
          }

          return res.status(200).send({ success: true, message: 'Phone number verified successfully.' });
        });
      } else {
        // Check in agents table
        const checkAgentQuery = 'SELECT * FROM agents WHERE pnumber = ?';
        db.query(checkAgentQuery, [pnumber], (err, agentResults) => {
          if (err) {
            console.error('Error checking agents table:', err);
            return res.status(500).send({ success: false, message: 'Server error.' });
          }

          if (agentResults.length > 0) {
            // Update verified status in agents table
            const updateAgentQuery = 'UPDATE agents SET verified = TRUE WHERE pnumber = ?';
            db.query(updateAgentQuery, [pnumber], (err) => {
              if (err) {
                console.error('Error updating agent verification:', err);
                return res.status(500).send({ success: false, message: 'Server error.' });
              }

              return res.status(200).send({ success: true, message: 'Phone number verified successfully.' });
            });
          } else {
            // Phone number not found in any table
            return res.status(400).send({ success: false, message: 'User not found.' });
          }
        });
      }
    });
  });
});

// POST /api/auth/resend-otp
router.post('/resend-otp', (req, res) => {
  const { pnumber } = req.body;

  // Input validation
  if (!pnumber) {
    return res.status(400).send({ success: false, message: 'Please provide a phone number.' });
  }

  // Check if user exists and is not verified
  const checkUserQuery = 'SELECT * FROM users WHERE pnumber = ?';
  db.query(checkUserQuery, [pnumber], (err, userResults) => {
    if (err) {
      console.error('Error checking users table:', err);
      return res.status(500).send({ success: false, message: 'Server error.' });
    }

    if (userResults.length > 0) {
      const user = userResults[0];
      if (user.verified) {
        return res.status(400).send({ success: false, message: 'Phone number already verified.' });
      }
    } else {
      // Check in agents table
      const checkAgentQuery = 'SELECT * FROM agents WHERE pnumber = ?';
      db.query(checkAgentQuery, [pnumber], (err, agentResults) => {
        if (err) {
          console.error('Error checking agents table:', err);
          return res.status(500).send({ success: false, message: 'Server error.' });
        }

        if (agentResults.length > 0) {
          const agent = agentResults[0];
          if (agent.verified) {
            return res.status(400).send({ success: false, message: 'Phone number already verified.' });
          }
        } else {
          // Phone number not found in any table
          return res.status(400).send({ success: false, message: 'User not found.' });
        }
      });
    }

    // Generate a new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert the new OTP into the otps table
    const insertOTPQuery = 'INSERT INTO otps (pnumber, otp) VALUES (?, ?)';
    db.query(insertOTPQuery, [pnumber, otp], (err) => {
      if (err) {
        console.error('Error inserting OTP into database:', err);
        return res.status(500).send({ success: false, message: 'Server error while generating OTP.' });
      }

      // Send OTP via Twilio
      twilioClient.messages
        .create({
          body: `Your OTP code is ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: pnumber,
        })
        .then((message) => {
          console.log('OTP resent:', message.sid);
          res.status(200).send({ success: true, message: 'OTP resent successfully.' });
        })
        .catch((error) => {
          console.error('Twilio Error:', error);
          res.status(500).send({ success: false, message: 'Failed to resend OTP. Please try again.' });
        });
    });
  });
});

module.exports = router;
