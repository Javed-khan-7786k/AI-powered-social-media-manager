const express = require('express');
const router = express.Router();
const githubController = require('../controllers/githubController');

/**
 * @openapi
 * /api/v1/github/webhook:
 *   post:
 *     summary: GitHub App Webhook Listener
 *     description: Receives GitHub events (push, pull_request, release, etc.), validates HMAC signature, and triggers AI post generation.
 */
router.post('/webhook', githubController.handleWebhook);

/**
 * @openapi
 * /api/v1/github/test-event:
 *   post:
 *     summary: Webhook Event Simulator
 *     description: Simulates incoming GitHub webhook events for manual testing from the dashboard.
 */
router.post('/test-event', githubController.simulateEvent);

/**
 * @openapi
 * /api/v1/github/events:
 *   get:
 *     summary: Get recent GitHub events
 */
router.get('/events', githubController.getEvents);

/**
 * @openapi
 * /api/v1/github/repos:
 *   get:
 *     summary: Get tracked repositories
 */
router.get('/repos', githubController.getRepositories);

/**
 * @openapi
 * /api/v1/github/installations:
 *   get:
 *     summary: Get GitHub App installations
 */
router.get('/installations', githubController.getInstallations);

module.exports = router;
