const authRoutes = require('./routes/auth');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const chatRoutes = require('./routes/chat.js');
const propertyRoutes = require('./routes/property');
const paymentsRouter = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');
const userSettingsRoutes = require('./routes/userSettings'); // New
const agentSettingsRoutes = require('./routes/agentSettings'); // New
const path = require('path');
const http = require('http'); // Import http
const { Server } = require('socket.io'); // Import Socket.IO
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS
const corsOptions = {
    origin: 'http://localhost:3000', // Your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions // Apply CORS options to Socket.IO
});

// Set up socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle group messages
    socket.on('sendGroupMessage', (message) => {
        // Broadcast the message to all connected clients
        io.emit('receiveGroupMessage', message);

        // Save the message to the database
        const { userId, userName, message: msg } = message;
        const timestamp = new Date();

        const query = 'INSERT INTO group_messages (userId, userName, message, timestamp) VALUES (?, ?, ?, ?)';
        db.query(query, [userId, userName, msg, timestamp], (err) => {
            if (err) {
                console.error('Error saving message to database:', err);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
app.use(express.static(path.join(__dirname, 'uniconnect/build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/uniconnect/build/index.html'));
});

app.use(bodyParser.json());
app.use('/api/properties', propertyRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/userSettings', userSettingsRoutes); // Mount user settings routes
app.use('/api/agentSettings', agentSettingsRoutes); // Mount agent settings routes
app.use('/api/chat', chatRoutes); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
