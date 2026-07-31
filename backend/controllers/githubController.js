const crypto = require('crypto');
const Event = require('../models/Event');
const Repository = require('../models/Repository');
const GitHubInstallation = require('../models/GitHubInstallation');
const githubService = require('../services/githubService');
const queueService = require('../services/queueService');
const logger = require('../services/loggerService');
const { isConnected, memoryStore, nextMemoryId } = require('../config/db');

/**
 * Handle incoming GitHub Webhook
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const eventType = req.headers['x-github-event'] || 'push';
    const deliveryId = req.headers['x-github-delivery'] || `del_${Date.now()}`;

    logger.info(`Received GitHub Webhook [Event: ${eventType}] [Delivery: ${deliveryId}]`);

    // Verify HMAC-SHA256 signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const isValid = githubService.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid && !req.isSimulation) {
      logger.warn(`Rejected GitHub Webhook with invalid signature for delivery: ${deliveryId}`);
      return res.status(401).json({ status: 'error', message: 'Invalid Webhook Signature' });
    }

    const payload = req.body;
    if (!payload || !payload.repository) {
      return res.status(400).json({ status: 'error', message: 'Missing repository in payload' });
    }

    // Parse event details
    const parsedEvent = githubService.parseWebhookEvent(eventType, payload);

    const repoDoc = {
      repoId: String(payload.repository.id),
      name: parsedEvent.repoName,
      fullName: parsedEvent.repoFullName,
      owner: parsedEvent.repoOwner,
      htmlUrl: parsedEvent.repoUrl,
      description: parsedEvent.repoDescription,
      isPrivate: payload.repository.private || false,
      language: parsedEvent.repoLanguage,
      starsCount: parsedEvent.starsCount,
      forksCount: parsedEvent.forksCount,
      openIssuesCount: parsedEvent.openIssuesCount,
      lastEventAt: new Date()
    };

    const eventDoc = {
      eventId: deliveryId,
      eventType: parsedEvent.eventType,
      repoName: parsedEvent.repoName,
      repoOwner: parsedEvent.repoOwner,
      repoUrl: parsedEvent.repoUrl,
      sender: parsedEvent.sender,
      branch: parsedEvent.branch,
      commitSha: parsedEvent.commitSha,
      commitMessage: parsedEvent.commitMessage,
      commitUrl: parsedEvent.commitUrl,
      prUrl: parsedEvent.prUrl,
      prTitle: parsedEvent.prTitle,
      releaseName: parsedEvent.releaseName,
      addedFiles: parsedEvent.addedFiles,
      modifiedFiles: parsedEvent.modifiedFiles,
      removedFiles: parsedEvent.removedFiles,
      changedFileCount: parsedEvent.changedFileCount,
      rawPayload: payload,
      status: 'received'
    };

    let eventRecord;

    if (isConnected()) {
      // Save/Update Repository details in DB
      await Repository.findOneAndUpdate(
        { repoId: repoDoc.repoId },
        repoDoc,
        { upsert: true, new: true }
      );

      // Save Event record in DB
      eventRecord = await Event.create(eventDoc);
    } else {
      // MongoDB not reachable — persist to the in-memory standalone store instead
      // of hanging/erroring, so the app still works for local/dev/test usage.
      logger.warn('MongoDB not connected — storing GitHub event/repository in-memory (non-persistent).');

      const existingRepoIdx = memoryStore.repositories.findIndex(r => r.repoId === repoDoc.repoId);
      if (existingRepoIdx >= 0) {
        memoryStore.repositories[existingRepoIdx] = { ...memoryStore.repositories[existingRepoIdx], ...repoDoc };
      } else {
        memoryStore.repositories.push({ _id: nextMemoryId(), ...repoDoc });
      }

      eventRecord = { _id: nextMemoryId(), ...eventDoc, createdAt: new Date() };
      memoryStore.events.push(eventRecord);
    }

    // Trigger async job processor
    setImmediate(() => {
      queueService.processGitHubEventJob(eventRecord._id).catch(err => {
        logger.error(`Background job execution failed for event ${eventRecord._id}: ${err.message}`);
      });
    });

    return res.status(200).json({
      status: 'success',
      message: 'GitHub Webhook received and queued for AI post generation',
      eventId: deliveryId,
      eventType: parsedEvent.eventType,
      repository: parsedEvent.repoName
    });

  } catch (err) {
    logger.error(`Error handling GitHub Webhook: ${err.message}`);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Webhook Event Simulator (Allows testing GitHub events directly from Admin Dashboard)
 */
exports.simulateEvent = async (req, res) => {
  try {
    const { eventType = 'push', repoName = 'ai-social-manager', commitMessage = 'Added real-time webhook event simulation', author = 'DevTeam' } = req.body;

    const simulatedPayload = {
      repository: {
        id: 9991238,
        name: repoName,
        full_name: `owner/${repoName}`,
        owner: { login: 'owner' },
        html_url: `https://github.com/owner/${repoName}`,
        description: 'AI-Powered Automated Social Media Engine',
        language: 'TypeScript',
        stargazers_count: 42,
        forks_count: 12,
        open_issues_count: 3
      },
      sender: { login: author },
      ref: 'refs/heads/main',
      head_commit: {
        id: 'a1b2c3d4e5f6',
        message: commitMessage,
        url: `https://github.com/owner/${repoName}/commit/a1b2c3d4e5f6`,
        author: { name: author },
        added: ['src/services/aiService.ts'],
        modified: ['README.md', 'package.json'],
        removed: []
      }
    };

    req.body = simulatedPayload;
    req.rawBody = Buffer.from(JSON.stringify(simulatedPayload));
    req.isSimulation = true;

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      req.headers['x-hub-signature-256'] = 'sha256=' + hmac.update(req.rawBody).digest('hex');
    }

    req.headers['x-github-event'] = eventType;
    req.headers['x-github-delivery'] = `sim_${Date.now()}`;

    return exports.handleWebhook(req, res);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Get Recent GitHub Events List
 */
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).limit(50);
    return res.json({ status: 'success', data: events });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Get Repositories List
 */
exports.getRepositories = async (req, res) => {
  try {
    const repos = await Repository.find().sort({ updatedAt: -1 });
    return res.json({ status: 'success', data: repos });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Get GitHub App Installations List
 */
exports.getInstallations = async (req, res) => {
  try {
    const installations = await GitHubInstallation.find().sort({ createdAt: -1 });
    return res.json({ status: 'success', data: installations });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
