const express = require('express');
const router = express.Router();
const db = require('../db'); // Ensure this points to your DB configuration

// Fetch chat history for a specific user
router.get('/history/:userId', (req, res) => {
    const { userId } = req.params;
    const query = `
        SELECT DISTINCT pm.receiverId, u.username AS receiverName 
        FROM private_messages pm
        JOIN users u ON pm.receiverId = u.id
        WHERE pm.senderId = ?`;

    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// Search for users by phone number
router.get('/users/:email', (req, res) => {
    const { email } = req.params;
    const query = 'SELECT id, username as name, email FROM users WHERE email LIKE ?';
    db.query(query, [`%${email}%`], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch user.' });
        res.json(results);
    });
});
router.get('/group', (req, res) => {
    const query = 'SELECT * FROM group_messages ORDER BY timestamp ASC';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});
// Fetch private messages between two users
router.get('/private/:userId/:receiverId', (req, res) => {
    const { userId, receiverId } = req.params;
    const query = `
        SELECT * FROM private_messages 
        WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) 
        ORDER BY timestamp ASC
    `;
    db.query(query, [userId, receiverId, receiverId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// Store a new private message
router.post('/private', (req, res) => {
    const { senderId, receiverId, senderName, message } = req.body;
    const timestamp = new Date();

    const query = `INSERT INTO private_messages (senderId, receiverId, senderName, message, timestamp) VALUES (?, ?, ?, ?, ?)`;
    db.query(query, [senderId, receiverId, senderName, message, timestamp], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Message sent successfully' });
    });
});

module.exports = router;
