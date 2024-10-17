// backend/index.js
const authRoutes = require('./routes/auth');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const forumRoutes = require('./routes/forum');
const propertyRoutes = require('./routes/property');
const paymentsRouter = require('./routes/payment'); 
const analyticsRoutes = require('./routes/analytics');
const userSettingsRoutes = require('./routes/userSettings'); // New
const agentSettingsRoutes = require('./routes/agentSettings'); // New
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: 'http://localhost:3000', // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(express.static(path.join(__dirname, '../uniconnect/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../uniconnect/build', 'index.html'));
});

  
app.use(bodyParser.json());
app.use('/api/properties', propertyRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/userSettings', userSettingsRoutes); // Mount user settings routes
app.use('/api/agentSettings', agentSettingsRoutes); // Mount agent settings routes

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
