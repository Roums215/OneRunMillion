const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authController = require('../controllers/auth.controller');

// Process payment (authenticated)
router.post('/process', authController.verifyToken, paymentController.processPayment);

// Get payment history for a user (authenticated)
router.get('/history', authController.verifyToken, paymentController.getPaymentHistory);

// Stripe webhook handler (public, but verified by Stripe signature)
router.post('/webhook', paymentController.handleStripeWebhook);

module.exports = router;
