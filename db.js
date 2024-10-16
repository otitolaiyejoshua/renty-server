// db.js
const mysql = require('mysql2');
require('dotenv').config(); // Load environment variables from .env

const connection = mysql.createConnection({
  host: process.env.DB_HOST,       // e.g., 'localhost' or Heroku-provided host
  user: process.env.DB_USER,       // e.g., 'root'
  password: process.env.DB_PASSWORD, // e.g., 'halleluyah2910??'
  database: process.env.DB_NAME    // e.g., 'uniconnect'
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to the MySQL server:', err.message);
    process.exit(1); // Exit process with failure
  }
  console.log('Connected to the MySQL server.');
});

module.exports = connection;
