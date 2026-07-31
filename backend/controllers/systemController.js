const FailedJob = require('../models/FailedJob');
const Log = require('../models/Log');
const User = require('../models/User');
const Event = require('../models/Event');
const Post = require('../models/Post');
const Repository = require('../models/Repository');
const queueService = require('../services/queueService');
const notificationService = require('../services/notificationService');
const { isConnected, memoryStore } = require('../config/db');

/**
 * Get Dashboard Stats & Account Integrations Overview
 */
exports.getDashboardStats = async (req, res) => {
  try {
    let totalEvents, totalPosts, totalRepos, failedJobsCount, recentLogs, user;

    if (isConnected()) {
      [totalEvents, totalPosts, totalRepos, failedJobsCount, recentLogs] = await Promise.all([
        Event.countDocuments(),
        Post.countDocuments({ status: 'published' }),
        Repository.countDocuments(),
        FailedJob.countDocuments({ status: { $in: ['pending_retry', 'retrying'] } }),
        Log.find().sort({ createdAt: -1 }).limit(20)
      ]);
      user = (await User.findOne({ role: 'admin' })) || {};
    } else {
      // MongoDB not reachable — serve stats from the in-memory standalone store
      totalEvents = memoryStore.events.length;
      totalPosts = memoryStore.posts.filter(p => p.status === 'published').length;
      totalRepos = memoryStore.repositories.length;
      failedJobsCount = memoryStore.failedJobs.filter(j => ['pending_retry', 'retrying'].includes(j.status)).length;
      recentLogs = memoryStore.logs.slice(-20).reverse();
      user = memoryStore.users.find(u => u.role === 'admin') || {};
    }

    return res.json({
      status: 'success',
      data: {
        totalEvents,
        totalPosts,
        totalRepos,
        failedJobsCount,
        recentLogs,
        activeLinkedInToken: Boolean(global.activeLinkedInToken || process.env.LINKEDIN_ACCESS_TOKEN),
        webhookSecretConfigured: Boolean(process.env.GITHUB_WEBHOOK_SECRET || user.githubWebhookSecret),
        notificationsConfig: user.notifications || {}
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Get Queue of Failed Jobs
 */
exports.getFailedJobs = async (req, res) => {
  try {
    const jobs = await FailedJob.find().sort({ createdAt: -1 }).limit(50);
    return res.json({ status: 'success', data: jobs });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Retry a specific failed job
 */
exports.retryJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await queueService.retryFailedJob(jobId);
    return res.json({ status: 'success', data: result });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Get System Logs
 */
exports.getLogs = async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    return res.json({ status: 'success', data: logs });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Update Notification & System Settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { githubWebhookSecret, notifications } = req.body;
    let user = await User.findOne({ role: 'admin' });
    if (!user) {
      user = new User({ name: 'Admin', email: 'admin@local.host', role: 'admin' });
    }

    if (githubWebhookSecret !== undefined) {
      user.githubWebhookSecret = githubWebhookSecret;
      process.env.GITHUB_WEBHOOK_SECRET = githubWebhookSecret;
    }

    if (notifications) {
      user.notifications = { ...user.notifications, ...notifications };
    }

    await user.save();
    return res.json({ status: 'success', message: 'System settings updated successfully', user });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Test Notification Dispatch
 */
exports.testNotification = async (req, res) => {
  try {
    const { channel = 'all' } = req.body;
    await notificationService.notify({
      title: '🔔 Test Notification System',
      message: `System notification channels test triggered manually from Admin Dashboard (${channel}).`,
      type: 'info',
      metadata: { Channel: channel, Timestamp: new Date().toISOString() }
    });

    return res.json({ status: 'success', message: 'Test notification dispatched across active channels.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
