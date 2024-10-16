// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expected format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token is not valid' });
        }
        req.user = user; // Contains user information like id and role
        next();
    });
};

module.exports = authenticateToken;
