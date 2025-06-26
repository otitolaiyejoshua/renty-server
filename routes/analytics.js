// server/routes/analytics.js
const express = require('express');
const router = express.Router();
const db = require('../db');
router.get('/:agentId', (req, res) => {
    const { agentId } = req.params;
  
    const query = 'SELECT COUNT(*) AS propertyCount FROM properties WHERE agentId = ?';
    db.query(query, [agentId], (err, results) => {
      if (err) {
        console.error('Error fetching properties:', err);
        res.status(500).json({ error: 'Failed to fetch properties.' });
      } else {
        res.json(results);
      }
    });
  });
module.exports = router;
