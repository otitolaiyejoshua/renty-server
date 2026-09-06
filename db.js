const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.message);
    return;
  }

  console.log('Connected to local MySQL database ✅');
  connection.release();
});

// Handle pool errors
db.on('error', (err) => {
  console.error('❌ Database error:', err.message);
});

module.exports = db;