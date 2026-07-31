const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const Event = require('../models/Event');
const Post = require('../models/Post');
const FailedJob = require('../models/FailedJob');
const aiService = require('./aiService');
const linkedinService = require('./linkedinService');
const notificationService = require('./notificationService');
const logger = require('./loggerService');

class QueueService {
  /**
   * Enqueues and processes a GitHub Webhook event asynchronously
   */
  async processGitHubEventJob(eventRecordId) {
    try {
      const eventRecord = await Event.findById(eventRecordId);
      if (!eventRecord) {
        throw new Error(`Event record ${eventRecordId} not found.`);
      }

      logger.info(`⚡ Processing Queue Job for GitHub Event: ${eventRecord.eventType} on ${eventRecord.repoName}`);

      // 1. Generate AI LinkedIn Post
      const repoInfo = {
        language: eventRecord.rawPayload?.repository?.language || '',
        starsCount: eventRecord.rawPayload?.repository?.stargazers_count || 0,
        forksCount: eventRecord.rawPayload?.repository?.forks_count || 0,
        htmlUrl: eventRecord.repoUrl
      };

      const aiResult = await aiService.generateGitHubUpdatePost(eventRecord, repoInfo);

      // 2. Create Post record in DB 
      const post = await Post.create({
        eventId: eventRecord._id,
        repositoryName: eventRecord.repoName,
        repositoryUrl: eventRecord.repoUrl,
        title: aiResult.title,
        summary: aiResult.summary,
        technicalExplanation: aiResult.technicalExplanation,
        keyFeatures: aiResult.keyFeatures,
        businessImpact: aiResult.businessImpact,
        imagePrompt: aiResult.imagePrompt,
        content: aiResult.formattedPost,
        hashtags: aiResult.hashtags,
        postType: 'text',
        status: 'draft',
        author: eventRecord.author || 'AI Social Manager'
      });

      eventRecord.aiPostId = post._id;
      eventRecord.status = 'processed';
      eventRecord.processedAt = new Date();
      await eventRecord.save();

      // Generate Image via Puppeteer Screenshot
      let localImagePath = null;
      let pubPostType = 'text';
      let mediaItems = [];
      
      try {
        const targetUrl = eventRecord.commitUrl || eventRecord.repoUrl;
        if (targetUrl) {
          logger.info(`Taking screenshot of GitHub page: ${targetUrl}`);
          const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
          });
          try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: 800 });
            // GitHub pages keep background requests alive (notifications polling,
            // etc.), so 'networkidle2' frequently never fires and the default
            // 30s timeout is blown. 'domcontentloaded' plus a longer explicit
            // timeout is a better fit, with one retry for transient slowness.
            const gotoOptions = { waitUntil: 'domcontentloaded', timeout: 60000 };
            try {
              await page.goto(targetUrl, gotoOptions);
            } catch (firstErr) {
              logger.warn(`GitHub navigation retry after: ${firstErr.message}`);
              await page.goto(targetUrl, gotoOptions);
            }

            const uploadsDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            localImagePath = path.join(uploadsDir, `github_ss_${Date.now()}.jpg`);

            await page.screenshot({ path: localImagePath, type: 'jpeg', quality: 90 });

            pubPostType = 'single_image';
            mediaItems = [{ filePath: localImagePath, mimeType: 'image/jpeg', filename: 'github_changes.jpg' }];
            logger.info(`Successfully saved GitHub screenshot to ${localImagePath}`);
          } finally {
            // Always close the browser, even if goto/screenshot throws above.
            // Previously a failed goto skipped browser.close() entirely and
            // leaked a headless Chromium process on every timeout.
            await browser.close();
          }
        }
      } catch (imgErr) {
        logger.warn(`Failed to take GitHub screenshot: ${imgErr.message}. Falling back to text post.`);
      }

      // 3. Publish to LinkedIn (or Sandbox mode)
      const linkedInToken = global.activeLinkedInToken || process.env.LINKEDIN_ACCESS_TOKEN;
      const pubResult = await linkedinService.publishPost({
        accessToken: linkedInToken,
        commentary: post.content,
        postType: pubPostType,
        mediaItems: mediaItems,
        articleUrl: pubPostType === 'text' ? eventRecord.repoUrl : '',
        simulate: !linkedInToken
      });
      
      // Cleanup temp image
      if (localImagePath && fs.existsSync(localImagePath)) {
        fs.unlinkSync(localImagePath);
      }

      if (pubResult.success) {
        post.status = 'published';
        post.publishedAt = new Date();
        post.linkedInPostUrn = pubResult.postId;
        post.linkedInPostUrl = pubResult.postUrl;
        post.mode = pubResult.mode;
        await post.save();

        logger.info(`✅ Successfully published LinkedIn Post for ${eventRecord.repoName}: ${pubResult.postUrl}`);

        await notificationService.notify({
          title: `Post Published to LinkedIn`,
          message: `Update for ${eventRecord.repoName} (${eventRecord.eventType}) published successfully!`,
          type: 'success',
          metadata: { Repo: eventRecord.repoName, Event: eventRecord.eventType, Mode: pubResult.mode }
        });
      }

      return { success: true, postId: post._id, postUrl: pubResult.postUrl };
    } catch (err) {
      logger.error(`❌ Queue Job Processing Error: ${err.message}`);

      // Log to FailedJob queue for auto-retry
      await FailedJob.create({
        jobId: `job_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'webhook_processing',
        payload: { eventRecordId },
        lastError: err.message,
        stackTrace: err.stack || '',
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // retry in 5 minutes
      });

      await notificationService.notify({
        title: `GitHub Event Job Failed`,
        message: `Failed to process event ${eventRecordId}: ${err.message}`,
        type: 'failure',
        metadata: { Error: err.message }
      });

      throw err;
    }
  }

  /**
   * Process retries for failed jobs
   */
  async retryFailedJob(jobId) {
    const failedJob = await FailedJob.findOne({ jobId });
    if (!failedJob) throw new Error('Failed job not found');

    failedJob.status = 'retrying';
    failedJob.attempts += 1;
    await failedJob.save();

    try {
      if (failedJob.type === 'webhook_processing') {
        await this.processGitHubEventJob(failedJob.payload.eventRecordId);
      }
      failedJob.status = 'resolved';
      await failedJob.save();
      return { success: true, message: 'Job successfully retried and resolved.' };
    } catch (err) {
      failedJob.lastError = err.message;
      if (failedJob.attempts >= failedJob.maxAttempts) {
        failedJob.status = 'exhausted';
      } else {
        failedJob.status = 'pending_retry';
        failedJob.nextRetryAt = new Date(Date.now() + Math.pow(2, failedJob.attempts) * 60 * 1000);
      }
      await failedJob.save();
      throw err;
    }
  }
}

module.exports = new QueueService();
