// backend/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
// Get all chats for a user
router.get('/chats', async (req, res) => {
    const userId = req.user.id;

    try {
        const [chats] = await pool.query(`
            SELECT c.id, 
                   CASE 
                       WHEN c.user_one_id = ? THEN c.user_two_id 
                       ELSE c.user_one_id 
                   END AS other_user_id,
                   u.username
            FROM Chats c
            JOIN Users u ON (
                (c.user_one_id = ? AND u.id = c.user_two_id) OR 
                (c.user_two_id = ? AND u.id = c.user_one_id)
            )
            WHERE c.user_one_id = ? OR c.user_two_id = ?
            ORDER BY c.created_at DESC
        `, [userId, userId, userId, userId, userId]);

        res.json(chats);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Get messages in a chat
router.get('/chats/:chatId/messages',async (req, res) => {
    const chatId = req.params.chatId;
    const userId = req.user.id;

    try {
        // Verify that the user is part of the chat
        const [chat] = await pool.query('SELECT * FROM Chats WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)', [chatId, userId, userId]);
        if (chat.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const [messages] = await pool.query(`
            SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at, u.username AS sender_username
            FROM Messages m
            JOIN Users u ON m.sender_id = u.id
            WHERE m.chat_id = ?
            ORDER BY m.created_at ASC
        `, [chatId]);

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Start a new chat or get existing chat between two users
router.post('/chats', async (req, res) => {
    const userId = req.user.id;
    const { otherUserId } = req.body;

    try {
        // Check if chat already exists
        const [existingChat] = await pool.query(`
            SELECT * FROM Chats 
            WHERE (user_one_id = ? AND user_two_id = ?) 
               OR (user_one_id = ? AND user_two_id = ?)
        `, [userId, otherUserId, otherUserId, userId]);

        let chat;
        if (existingChat.length > 0) {
            chat = existingChat[0];
        } else {
            // Create new chat
            const [result] = await pool.query(
                'INSERT INTO Chats (user_one_id, user_two_id, created_at) VALUES (?, ?, NOW())',
                [userId, otherUserId]
            );
            chat = { id: result.insertId, user_one_id: userId, user_two_id: otherUserId };
        }

        res.status(200).json(chat);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Send a message in a chat
router.post('/chats/:chatId/messages', async (req, res) => {
    const chatId = req.params.chatId;
    const { content } = req.body;
    const userId = req.user.id;

    try {
        // Verify that the user is part of the chat
        const [chat] = await pool.query('SELECT * FROM Chats WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)', [chatId, userId, userId]);
        if (chat.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Determine receiver_id
        const receiver_id = chat[0].user_one_id === userId ? chat[0].user_two_id : chat[0].user_one_id;

        // Insert message
        const [result] = await pool.query(
            'INSERT INTO Messages (chat_id, sender_id, receiver_id, content, created_at, is_read) VALUES (?, ?, ?, ?, NOW(), FALSE)',
            [chatId, userId, receiver_id, content]
        );

        res.status(201).json({ id: result.insertId, chat_id: chatId, sender_id: userId, receiver_id, content });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
