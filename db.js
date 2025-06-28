const mysql = require('mysql');
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
  socketPath: '/opt/lampp/var/mysql/mysql.sock' // 👈 THIS is important for XAMPP on Linux!
});

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      setTimeout(handleDisconnect, 2000); // Attempt reconnection after 2 seconds
    } else {
      console.log('Connected to the database');
    }
  });

  connection.on('error', (err) => {
    console.error('Database error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect(); // Reconnect if the connection is lost
    } else {
      throw err;
    }
  });
}

handleDisconnect();

module.exports = connection;
