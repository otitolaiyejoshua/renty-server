const mysql = require('mysql2');
require('dotenv').config();

let connection;

console.log(
    'Connecting to DB with:',
    process.env.DB_HOST,
    process.env.DB_USER,
    process.env.DB_NAME
);

function handleDisconnect() {
    connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT)
    });

    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to the database:', err);

            setTimeout(handleDisconnect, 2000);
        } else {
            console.log('Connected to local MySQL database ✅');
        }
    });

    connection.on('error', (err) => {
        console.error('Database error:', err);

        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

module.exports = connection;