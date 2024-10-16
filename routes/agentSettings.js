// routes/agentSettings.js
const express = require('express');
const db = require('../db'); // Assuming db is your database connection file
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Replace with your actual secret

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Folder to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    }
});
const upload = multer({ storage });

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
router.get('/:agentId', authenticateToken, (req, res) => {
    const { agentId } = req.params;
    const sql = 'SELECT id, pnumber, role, idDocument, ownershipCertificate, agency_name FROM agents WHERE id = ?';;
    db.query(sql, [agentId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        const agent = results[0];
        
        // Check if documents and agency name exist
        const documentsExist = !!(agent.idDocument && agent.ownershipCertificate);
        const agencyNameExists = !!agent.agency_name; // Check if agency name exists
        
        res.json({
            id: agent.id,
            pnumber: agent.pnumber,
            role: agent.role,
            idDocument: agent.idDocument,
            ownershipCertificate: agent.ownershipCertificate,
            agency_name: agent.agency_name, // Include agency_name in the response
            documentsExist: documentsExist,  // Add this field to indicate if documents exist
            agencyNameExists: agencyNameExists // Add this field to indicate if agency name exists
        });
    });
});



// Update agent settings
router.put('/profile/:id', authenticateToken, upload.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'ownershipCertificate', maxCount: 1 }
]), (req, res) => {
    const userId = req.params.id; // Get the agent ID from the URL parameters
    const { pnumber } = req.body;

    // Prepare file paths
    let idDocumentPath = req.files['idDocument'] ? `uploads/${req.files['idDocument'][0].filename}` : null;
    let ownershipCertificatePath = req.files['ownershipCertificate'] ? `uploads/${req.files['ownershipCertificate'][0].filename}` : null;

    const sql = 'UPDATE users SET pnumber = ?, idDocument = ?, ownershipCertificate = ? WHERE id = ?';
    db.query(sql, [pnumber, idDocumentPath, ownershipCertificatePath, userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        res.json({ message: 'Agent profile updated successfully' });
    });
});

// Change agent password
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
            return res.status(404).json({ message: 'Agent not found' });
        }

        const agent = results[0];

        const isMatch = await bcrypt.compare(currentPassword, agent.password);
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

            res.json({ message: 'Agent password changed successfully' });
        });
    });
});

module.exports = router;
