const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/dashboard-stats', systemController.getDashboardStats);
router.get('/failed-jobs', systemController.getFailedJobs);
router.post('/retry-job/:jobId', systemController.retryJob);
router.get('/logs', systemController.getLogs);
router.post('/settings', systemController.updateSettings);
router.post('/test-notification', systemController.testNotification);

module.exports = router;
