const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get current user (authenticated)
router.get('/me', authController.verifyToken, authController.getCurrentUser);

// Logout user
router.post('/logout', authController.logout);

// Change password
router.post('/change-password', authController.verifyToken, authController.changePassword);

module.exports = router;
