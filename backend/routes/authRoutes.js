const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

router.get('/linkedin', authLimiter, authController.connectLinkedIn);
router.get('/linkedin/callback', authController.handleCallback);
router.post('/linkedin/exchange', authLimiter, authController.exchangeCode);
router.get('/status', authController.getStatus);
router.post('/disconnect', authController.disconnect);

module.exports = router;
