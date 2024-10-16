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
    const { email, amount, propertyId, userId, paymentType, userPhone } = req.body;

    // Validate request body
    if (!email || !amount || !propertyId || !userId || !paymentType || !userPhone) {
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
                userPhone: userPhone,
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
    const { reference, propertyId, userId, paymentType, userPhone } = req.body;

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

                    // Insert notification
                    const message = paymentType === 'booking' 
                        ? `You have successfully booked property ID ${propertyId} for ₦${amount}.`
                        : `You have successfully paid for a physical inspection of property ID ${propertyId} for ₦${amount}.`;

                    const insertNotificationQuery = `
                        INSERT INTO notifications (user_id, message)
                        VALUES (?, ?)
                    `;
                    db.query(insertNotificationQuery, [userId, message], (notifErr) => {
                        if (notifErr) {
                            console.error('Error inserting notification:', notifErr);
                            // Optionally, handle notification failure
                        }

                        // Respond with payment receipt
                        return res.json({ success: true, message: 'Payment verified and recorded.', payment: { amount, reference: data.reference, status, paidAt, message } });
                    });
                });
            });
        } else {
            return res.status(400).json({ success: false, message: 'Payment was not successful.' });
        }
    } catch (error) {
        console.error('Payment Verification Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Error verifying payment', error: error.response ? error.response.data : error.message });
    }
});

// POST /api/payments/webhook
router.post('/payments/webhook', async (req, res) => {
    const event = req.body;

    if (event.event === 'charge.success') {
        const { reference, metadata } = event.data;
        const { propertyId, userId, paymentType, userPhone } = metadata;

        try {
            // Verify transaction with Paystack
            const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                }
            });

            const data = response.data.data;

            if (data.status === 'success') {
                // Check if payment already exists
                const checkQuery = 'SELECT * FROM payment WHERE reference = ?';
                db.query(checkQuery, [reference], (err, results) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).send('Database error.');
                    }

                    if (results.length > 0) {
                        return res.status(200).send('Payment already recorded.');
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
                            return res.status(500).send('Error recording payment.');
                        }

                        // Insert notification
                        const message = paymentType === 'booking' 
                            ? `You have successfully booked property ID ${propertyId} for ₦${amount}.`
                            : `You have successfully paid for a physical inspection of property ID ${propertyId} for ₦${amount}.`;

                        const insertNotificationQuery = `
                            INSERT INTO notifications (user_id, message)
                            VALUES (?, ?)
                        `;
                        db.query(insertNotificationQuery, [userId, message], (notifErr) => {
                            if (notifErr) {
                                console.error('Error inserting notification:', notifErr);
                                // Optionally, handle notification failure
                            }

                            return res.status(200).send('Webhook received and processed.');
                        });
                    });
                });
            } else {
                return res.status(400).send('Payment was not successful.');
            }
        } catch (error) {
            console.error('Webhook Payment Verification Error:', error.response ? error.response.data : error.message);
            return res.status(500).send('Error verifying payment.');
        }
    } else {
        // Handle other event types if necessary
        return res.status(400).send('Unhandled event type.');
    }
});

module.exports = router;
