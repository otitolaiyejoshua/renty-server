const mysql = require('mysql'); // or mysql2

const connection = mysql.createConnection({
    url: process.env.JAWSDB_URL || 'your_local_db_url_here',
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});
