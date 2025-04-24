const express = require('express');
const router = express.Router();

// Endpoint de santé simple pour Railway
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'OneRun Premium API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
