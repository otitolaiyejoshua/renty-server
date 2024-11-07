// routes/userSettings.js
const express = require('express');
const db = require('../db'); // Assuming db is your database connection file
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Replace with your actual secret

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.userId = user.id; // Save user id for later use
        next();
    });
};

// Get user settings
router.get('/:userId', authenticateToken, (req, res) => {
    const { userId } = req.params;
    const sql = 'SELECT id, username, email, role FROM users WHERE id = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];
        res.json({
            id: user.id,
            email: user.email,
            username:user.username,
            role: user.role
        });
    });
});

// Update user settings
router.put('/profile', authenticateToken, (req, res) => {
    const userId = req.userId;
    const { email } = req.body;

    const sql = 'UPDATE users SET email = ? WHERE id = ?';
    db.query(sql, [email, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        res.json({ message: 'Profile updated successfully' });
    });
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    const sql = 'SELECT password FROM users WHERE id = ?';
    db.query(sql, [userId], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
        db.query(updateSql, [hashedPassword, userId], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            res.json({ message: 'Password changed successfully' });
        });
    });
});

module.exports = router;
