const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const propertyRoutes = require('./routes/property');
const paymentsRouter = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');
const userSettingsRoutes = require('./routes/userSettings');
const agentSettingsRoutes = require('./routes/agentSettings');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Development CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://renty-client.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-access-token'
  ],
  credentials: true
}));

app.use(bodyParser.json());

// HTTP + Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://renty-client.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('🟢 A user connected');

  socket.on('sendGroupMessage', (message) => {
    io.emit('receiveGroupMessage', message);

    const { userId, userName, message: msg } = message;
    const timestamp = new Date();

    const query = 'INSERT INTO group_messages (userId, userName, message, timestamp) VALUES (?, ?, ?, ?)';
    db.query(query, [userId, userName, msg, timestamp], (err) => {
      if (err) {
        console.error('❌ Error saving message to DB:', err.message);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('🔴 A user disconnected');
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/userSettings', userSettingsRoutes);
app.use('/api/agentSettings', agentSettingsRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use((req, res, next) => {
  console.log('REQUEST:', req.method, req.path, 'ORIGIN:', req.headers.origin);
  next();
});
// Health check route
app.get('/', (req, res) => {
  res.send('✅ Renty backend is running');
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
