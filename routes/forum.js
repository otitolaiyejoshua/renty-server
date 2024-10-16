// backend/routes/forumRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Create a new forum post
router.post('/posts',async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
        const [result] = await pool.query(
            'INSERT INTO ForumPosts (user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            [userId, title, content]
        );
        res.status(201).json({ id: result.insertId, title, content, user_id: userId });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Get all forum posts
router.get('/posts', async (req, res) => {
    try {
        const [posts] = await pool.query(`
            SELECT fp.id, fp.title, fp.content, fp.created_at, fp.updated_at, u.username 
            FROM ForumPosts fp
            JOIN Users u ON fp.user_id = u.id
            ORDER BY fp.created_at DESC
        `);
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Get a single forum post with replies
router.get('/posts/:id', async (req, res) => {
    const postId = req.params.id;

    try {
        const [post] = await pool.query(`
            SELECT fp.id, fp.title, fp.content, fp.created_at, fp.updated_at, u.username 
            FROM ForumPosts fp
            JOIN Users u ON fp.user_id = u.id
            WHERE fp.id = ?
        `, [postId]);

        if (post.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const [replies] = await pool.query(`
            SELECT fr.id, fr.content, fr.created_at, fr.updated_at, u.username 
            FROM ForumReplies fr
            JOIN Users u ON fr.user_id = u.id
            WHERE fr.post_id = ?
            ORDER BY fr.created_at ASC
        `, [postId]);

        res.json({ post: post[0], replies });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Add a reply to a forum post
router.post('/posts/:id/replies',  async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;

    try {
        const [result] = await pool.query(
            'INSERT INTO ForumReplies (post_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            [postId, userId, content]
        );
        res.status(201).json({ id: result.insertId, post_id: postId, user_id: userId, content });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

module.exports = router;
