const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const propertyRoutes = require('./routes/property');
const paymentsRouter = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');
const userSettingsRoutes = require('./routes/userSettings'); // New
const agentSettingsRoutes = require('./routes/agentSettings'); // New

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
    origin: 'http://localhost:3000', // Your frontend URL (React development server)
    methods: ['GET', 'POST'],
    credentials: true,
};
app.use(cors(corsOptions));

// Middleware setup
app.use(bodyParser.json());

// Serve React frontend from the 'uniconnect/build' folder
// Ensure you provide the correct path to the React app's build directory
const buildPath = path.join(__dirname, '..', 'uniconnect', 'build');
app.use(express.static(buildPath));

// Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions,
});

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('A user connected');

    // Group message handling
    socket.on('sendGroupMessage', (message) => {
        io.emit('receiveGroupMessage', message);

        // Save to database
        const { userId, userName, message: msg } = message;
        const timestamp = new Date();

        const query = 'INSERT INTO group_messages (userId, userName, message, timestamp) VALUES (?, ?, ?, ?)';
        db.query(query, [userId, userName, msg, timestamp], (err) => {
            if (err) {
                console.error('Error saving message to database:', err);
            }
        });
    });

    // Disconnect event
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Routes setup
app.use('/api/properties', propertyRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/userSettings', userSettingsRoutes); // User settings route
app.use('/api/agentSettings', agentSettingsRoutes); // Agent settings route
app.use('/api/chat', chatRoutes); 

// Route to serve the React app's index.html for any non-API request
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// Static file serving for uploaded files (images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
