// server/routes/paymentRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db'); // Adjust the path if necessary
require('dotenv').config();

// Middleware to parse JSON
router.use(express.json());

// POST /api/payments/initiate
router.post('/payments/initiate', async (req, res) => {
    const { email, amount, propertyId, userId, paymentType } = req.body;

    // Validate request body
    if (!amount || !propertyId || !userId || !paymentType || !email) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        // Initialize Paystack transaction
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: email,
            amount: amount,
            metadata: {
                propertyId: propertyId,
                userId: userId,
                paymentType: paymentType,
            }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.data.status) {
            res.json({ reference: response.data.data.reference });
        } else {
            res.status(400).json({ message: 'Payment initiation failed.' });
        }
    } catch (error) {
        console.error('Payment Initialization Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            message: 'There is an error initiating payment.', 
            error: error.response ? error.response.data : error.message 
        });
    }
});

// POST /api/payments/verify
router.post('/payments/verify', async (req, res) => {
    const { reference, propertyId, userId, paymentType } = req.body;

    // Validate request body
    if (!reference || !propertyId || !userId || !paymentType) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        // Verify transaction with Paystack
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            }
        });

        const data = response.data.data;

        if (data.status === 'success') {
            // Check if payment already exists to prevent duplicates
            const checkQuery = 'SELECT * FROM payment WHERE reference = ?';
            db.query(checkQuery, [data.reference], (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false, message: 'Database error.' });
                }

                if (results.length > 0) {
                    return res.json({ success: true, message: 'Payment already recorded.' });
                }

                // Insert payment record
                const amount = data.amount / 100; // Convert kobo to Naira
                const status = data.status;
                const paidAt = new Date(data.paid_at);

                const insertPaymentQuery = `
                    INSERT INTO payment (user_id, property_id, amount, reference, status, payment_type, paid_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                const paymentValues = [userId, propertyId, amount, data.reference, status, paymentType, paidAt];

                db.query(insertPaymentQuery, paymentValues, (insertErr) => {
                    if (insertErr) {
                        console.error('Error inserting payment:', insertErr);
                        return res.status(500).json({ success: false, message: 'Error recording payment.' });
                    }

                    res.json({ success: true, payment: { userId, propertyId, amount, reference, status, paymentType, paidAt } });
                });
            });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }
    } catch (error) {
        console.error('Payment Verification Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Error verifying payment.', error: error.response ? error.response.data : error.message });
    }
});

module.exports = router;
