const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http'); 
const { Server } = require('socket.io'); 

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const propertyRoutes = require('./routes/property');
const paymentsRouter = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');
const userSettingsRoutes = require('./routes/userSettings'); 
const agentSettingsRoutes = require('./routes/agentSettings');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: ['http://localhost:3000', 'https://your-react-app.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));
// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://127.0.0.1', // Match the CORS origin
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

// Set up socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('sendGroupMessage', (message) => {
        io.emit('receiveGroupMessage', message);
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

app.use(bodyParser.json());

// API Routes
app.use('/api/properties', propertyRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/userSettings', userSettingsRoutes);
app.use('/api/agentSettings', agentSettingsRoutes);
app.use('/api/chat', chatRoutes); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
