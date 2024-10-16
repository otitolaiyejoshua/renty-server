// db.js
const mysql = require('mysql2'); // Using mysql2 for better support of promises
require('dotenv').config(); // Load environment variables from .env

// Create a connection using the DATABASE_URL or individual environment variables
const connection = mysql.createConnection(process.env.DATABASE_URL || {
  host: process.env.DB_HOST,       // e.g., 'localhost' or Heroku-provided host
  user: process.env.DB_USER,       // e.g., 'root'
  password: process.env.DB_PASSWORD, // e.g., 'halleluyah2910??'
  database: process.env.DB_NAME    // e.g., 'uniconnect'
});

// Connect to the database
connection.connect(err => {
  if (err) {
    console.error('Error connecting to the MySQL server:', err.message);
    process.exit(1); // Exit process with failure
  }
  console.log('Connected to the MySQL server.');
});

// Export the connection for use in other modules
module.exports = connection;
