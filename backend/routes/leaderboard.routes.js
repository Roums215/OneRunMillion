const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const authController = require('../controllers/auth.controller');

// Get global leaderboard (public)
router.get('/global', leaderboardController.getGlobalLeaderboard);

// Get weekly leaderboard (public)
router.get('/weekly', leaderboardController.getWeeklyLeaderboard);

// Get monthly leaderboard (public)
router.get('/monthly', leaderboardController.getMonthlyLeaderboard);

// Get user position details (authenticated)
router.get('/position', authController.verifyToken, leaderboardController.getUserPosition);

// Get nearby competitors (above and below current user)
router.get('/nearby', authController.verifyToken, leaderboardController.getNearbyCompetitors);

// Get top 10 leaderboard
router.get('/top10', leaderboardController.getTop10);

// Get top 100 leaderboard
router.get('/top100', leaderboardController.getTop100);

module.exports = router;
