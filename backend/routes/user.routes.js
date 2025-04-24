const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authController = require('../controllers/auth.controller');

// Get user profile (authenticated)
router.get('/profile', authController.verifyToken, userController.getProfile);

// Update user profile (authenticated)
router.put('/profile', authController.verifyToken, userController.updateProfile);

// Update avatar (authenticated)
router.put('/avatar', authController.verifyToken, userController.updateAvatar);

// Toggle anonymity (authenticated)
router.put('/anonymity', authController.verifyToken, userController.toggleAnonymity);

// Get user badges (authenticated)
router.get('/badges', authController.verifyToken, userController.getUserBadges);

module.exports = router;
