const axios = require('axios');

const TERMII_API_URL = 'https://termii.com/api';
const API_KEY = 'your_api_key'; // Replace with your actual Termii API key

// Send SMS Function
const sendSMS = async (to, message, from, channel = 'generic') => {
    try {
        const response = await axios.post(`${TERMII_API_URL}/sms/send`, {
            to,
            sms: message,
            from,
            api_key: API_KEY,
            channel,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error sending SMS:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// Send OTP Function
const sendOTP = async (to, from, channel = 'generic') => {
    try {
        const response = await axios.post(`${TERMII_API_URL}/sms/otp/send`, {
            api_key: API_KEY,
            message_type: 'NUMERIC',
            to,
            from,
            channel,
            pin_attempts: 10,
            pin_time_to_live: 5,
            pin_length: 6,
            pin_placeholder: '<1234>',
            message_text: 'Your OTP is <1234>',
            pin_type: 'NUMERIC',
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error sending OTP:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// Verify OTP Function
const verifyOTP = async (pin_id, pin) => {
    try {
        const response = await axios.post(`${TERMII_API_URL}/sms/otp/verify`, {
            api_key: API_KEY,
            pin_id,
            pin,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error verifying OTP:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = { sendSMS, sendOTP, verifyOTP };
