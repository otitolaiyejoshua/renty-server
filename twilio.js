// server/twilio.js

const twilio = require('twilio');
require('dotenv').config();

// Initialize Twilio client with credentials from .env
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

module.exports = client;
