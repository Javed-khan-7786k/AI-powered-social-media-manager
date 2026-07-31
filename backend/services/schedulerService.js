const cron = require('node-cron');
const Post = require('../models/Post');
const Schedule = require('../models/Schedule');
const Log = require('../models/Log');
const LinkedInAccount = require('../models/LinkedInAccount');
const linkedinService = require('./linkedinService');
const logger = require('./loggerService');
const { memoryStore } = require('../config/db');

class SchedulerService {
  init() {
    logger.info('⏰ Initializing LinkedIn Background Post Scheduler (running every minute)...');
    
    // Cron job running every 60 seconds
    cron.schedule('* * * * *', async () => {
      await this.processScheduledPosts();
    });
  }

  async processScheduledPosts() {
    const now = new Date();

    let duePosts = [];

    try {
      if (Post.db && Post.db.readyState === 1) {
        duePosts = await Post.find({
          status: 'scheduled',
          scheduledFor: { $lte: now },
        });
      } else {
        // In-memory fallback mode
        duePosts = memoryStore.posts.filter(
          (p) => p.status === 'scheduled' && new Date(p.scheduledFor) <= now
        );
      }

      if (duePosts.length === 0) {
        return;
      }

      logger.info(`🚀 Found ${duePosts.length} due post(s) to publish!`);

      for (const post of duePosts) {
        await this.executeScheduledPost(post);
      }
    } catch (err) {
      logger.error('Error during scheduled post lookup:', err);
    }
  }

  async executeScheduledPost(post) {
    try {
      logger.info(`📤 Processing scheduled post ID: ${post._id || post.id}`);

      let token = global.activeLinkedInToken || process.env.LINKEDIN_ACCESS_TOKEN || process.env.LINKEDIN_AUTH_ID;
      let authorUrn = process.env.LINKEDIN_AUTHOR_URN || 'urn:li:person:me';

      const simulate = post.mode === 'sandbox' || (!token && true);

      const result = await linkedinService.publishPost({
        accessToken: token,
        authorUrn: authorUrn,
        commentary: post.content,
        postType: post.postType,
        mediaItems: post.mediaDetails || [],
        simulate: simulate,
      });

      // Update post status
      post.status = 'published';
      post.publishedAt = new Date();
      post.linkedInPostUrn = result.postId;
      post.linkedInPostUrl = result.postUrl;

      if (Post.db && Post.db.readyState === 1) {
        await post.save();
      }

      logger.info(`✅ Scheduled post published successfully! Post URN: ${result.postId}`);
    } catch (err) {
      logger.error(`❌ Scheduled post execution failed for ID ${post._id || post.id}:`, err);
      post.retryCount = (post.retryCount || 0) + 1;
      post.errorMessage = err.message;

      if (post.retryCount >= 3) {
        post.status = 'failed';
      }

      if (Post.db && Post.db.readyState === 1) {
        await post.save();
      }
    }
  }
}

module.exports = new SchedulerService();
