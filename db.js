const mysql = require('mysql');
const fs = require('fs'); // ⬅️ Import fs to read the CA certificate
require('dotenv').config();

let connection;

console.log('Connecting to DB with:', process.env.DB_HOST, process.env.DB_USER);

function handleDisconnect() {
  connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
      ca: fs.readFileSync('./ca.pem') // ✅ Load Aiven's certificate
    }
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      setTimeout(handleDisconnect, 2000); // Try reconnecting after delay
    } else {
      console.log('Connected to the Aiven MySQL database ✅');
    }
  });

  connection.on('error', (err) => {
    console.error('Database error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect(); // Reconnect on connection loss
    } else {
      throw err;
    }
  });
}

handleDisconnect();

module.exports = connection;
