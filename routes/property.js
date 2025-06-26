// src/routes/properties.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const db = require('../db'); // Ensure this points to your DB configuration

// Set up Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Multer upload configuration
const upload = multer({
  storage: storage
}).fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'interiorImage1', maxCount: 1 },
  { name: 'interiorImage2', maxCount: 1 },
  { name: 'interiorImage3', maxCount: 1 }
]);

// POST route to add a new property
router.post('/', upload, (req, res) => {
  const { title, address, price, agentId, region, university, bathrooms, toilets, rooms, kitchens } = req.body;

  if (!req.files ||
      !req.files.mainImage ||
      !req.files.interiorImage1 ||
      !req.files.interiorImage2 ||
      !req.files.interiorImage3) {
    return res.status(400).json({ error: 'All image uploads are required.' });
  }

  const mainImage = req.files.mainImage[0].filename;
  const interiorImage1 = req.files.interiorImage1[0].filename;
  const interiorImage2 = req.files.interiorImage2[0].filename;
  const interiorImage3 = req.files.interiorImage3[0].filename;

  const query = `
    INSERT INTO properties 
    (title, address, price, agentId, region, university, mainImage, interiorImage1, interiorImage2, interiorImage3, bathrooms, toilets, rooms, kitchens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [title, address, price, agentId, region, university, mainImage, interiorImage1, interiorImage2, interiorImage3, bathrooms, toilets, rooms, kitchens];

  db.query(query, values, (error, results) => {
    if (error) {
      console.error('Error adding property:', error);
      return res.status(500).json({ error: 'Error adding property.' });
    }
    res.status(201).json({ message: 'Property added successfully.' });
  });
});

// PUT route to update a property
router.put('/:id', upload, (req, res) => {
  const { id } = req.params;
  const { title, address, region, university, price, bathrooms, toilets, rooms, kitchens } = req.body;

  const updates = {
    title,
    address,
    region,
    university,
    price,
    bathrooms,
    toilets,
    rooms,
    kitchens,
  };

  if (req.files.mainImage) {
    updates.mainImage = req.files.mainImage[0].filename;
  }

  if (req.files.interiorImage1) {
    updates.interiorImage1 = req.files.interiorImage1[0].filename;
  }

  if (req.files.interiorImage2) {
    updates.interiorImage2 = req.files.interiorImage2[0].filename;
  }

  if (req.files.interiorImage3) {
    updates.interiorImage3 = req.files.interiorImage3[0].filename;
  }

  const query = 'UPDATE properties SET ? WHERE id = ?';
  db.query(query, [updates, id], (error, results) => {
    if (error) {
      console.error('Error updating property:', error);
      return res.status(500).json({ message: 'Error updating property.', error });
    }
    res.status(200).json({ message: 'Property updated successfully.' });
  });
});

// DELETE route to remove a property
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM properties WHERE id = ?';
  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('Error deleting property:', error);
      return res.status(500).json({ message: 'Error deleting property.', error });
    }
    res.status(200).json({ message: 'Property deleted successfully.' });
  });
});

// GET route to fetch properties by agentId
router.get('/:agentId', (req, res) => {
  const { agentId } = req.params;

  const query = 'SELECT * FROM properties WHERE agentId = ?';
  db.query(query, [agentId], (err, results) => {
    if (err) {
      console.error('Error fetching properties:', err);
      res.status(500).json({ error: 'Failed to fetch properties.' });
    } else {
      res.json(results);
    }
  });
});

// GET route to fetch all properties
router.get('/', (req, res) => {
  const query = 'SELECT * FROM properties';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching properties:', err);
      res.status(500).json({ error: 'Failed to fetch properties.' });
    } else {
      res.json(results);
    }
  });
});

router.get('/search/:query', (req, res) => {
  const { query } = req.params;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }
  const searchQuery = `SELECT * FROM properties WHERE university = ?`;

  db.query(searchQuery, [query], (err, results) => {
    if (err) {
      console.error('Error fetching search results:', err);
      return res.status(500).json({ error: 'Error fetching search results.' });
    }

    res.json(results); // Array of property objects matching the university
  });
});

module.exports = router;