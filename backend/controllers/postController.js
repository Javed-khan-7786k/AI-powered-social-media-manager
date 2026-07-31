const Post = require('../models/Post');
const Schedule = require('../models/Schedule');
const linkedinService = require('../services/linkedinService');
const logger = require('../services/loggerService');
const { memoryStore } = require('../config/db');

// LinkedIn only keeps roughly the last 12 months of REST API versions active;
// a hardcoded "YYYYMM" value silently goes stale. See linkedinService.js.
function getLinkedInApiVersion() {
  if (process.env.LINKEDIN_API_VERSION) return process.env.LINKEDIN_API_VERSION;
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * Helper function to format a quote for social media posts
 */
function formatQuotePost(quote, author, hashtags = []) {
  let formatted = `💬 Quote of the Day:\n\n"${quote.trim()}"`;
  if (author && author.trim()) {
    formatted += `\n— ${author.trim()}`;
  }
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    const tags = hashtags
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
      .join(' ');
    formatted += `\n\n${tags}`;
  } else {
    formatted += `\n\n#Inspiration #Quotes #Motivation #AI`;
  }
  return formatted;
}

/**
 * Handle Quote Post Upload Endpoint
 * POST /api/v1/posts/quote  or  POST /upload-quote
 *
 * Logic from user's working snippet:
 * 1. Format the quote
 * 2. Resolve token from body / header / session / env
 * 3. If no token or simulate=true → sandbox mode
 * 4. Live mode:
 *    a. Resolve authorUrn from userinfo
 *    b. Try LinkedIn REST Posts API (rest/posts, LinkedIn-Version: 202304)
 *    c. Fallback to UGC Posts API (/v2/ugcPosts)
 */
exports.uploadQuote = async (req, res) => {
  try {
    const { quote, author, hashtags, accessToken: bodyToken, authorUrn: bodyUrn, simulate } = req.body;

    if (!quote || typeof quote !== 'string' || !quote.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Quote text is required.',
      });
    }

    const formattedPost = formatQuotePost(quote, author, hashtags);
    const token =
      bodyToken ||
      req.headers.authorization?.replace('Bearer ', '') ||
      req.session?.accessToken ||
      global.activeLinkedInToken ||
      process.env.LINKEDIN_ACCESS_TOKEN ||
      process.env.LINKEDIN_AUTH_ID;

    // Explicit request to live post without a token should return a clear error
    if (simulate === false && !token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required for Live Account Posting.',
        message: 'No LinkedIn Access Token was provided. To post to your real LinkedIn feed, please click "Connect LinkedIn Account" or provide your Access Token.',
      });
    }

    // Determine if we should perform live upload or sandbox
    const isLive = Boolean(token) && simulate !== true;

    if (!isLive) {
      const simData = {
        id: `sim_quote_${Date.now()}`,
        rawQuote: quote,
        author: author || 'Anonymous',
        formattedContent: formattedPost,
        platform: 'LinkedIn',
        publishedAt: new Date().toISOString(),
        simulatedUrl: `https://www.linkedin.com/feed/update/urn:li:share:sim_${Date.now()}`,
      };

      const newPost = {
        _id: simData.id,
        content: formattedPost,
        author: author || 'Anonymous',
        postType: 'quote',
        status: 'published',
        publishedAt: new Date(),
        linkedInPostUrl: simData.simulatedUrl,
        mode: 'sandbox',
      };
      if (Post.db && Post.db.readyState === 1) {
        await Post.create(newPost).catch(() => {});
      } else {
        memoryStore.posts.unshift(newPost);
      }

      return res.status(200).json({
        success: true,
        mode: 'sandbox_test',
        message: 'Quote formatted and verified successfully in sandbox test mode.',
        data: simData,
        notice: token
          ? 'Passed simulate=true in request, so post was simulated.'
          : 'NOTE: Currently in Sandbox mode. Switch to "Live LinkedIn Post" and provide a LinkedIn Access Token to post onto your real account feed.',
      });
    }

    // ── LIVE UPLOAD TO LINKEDIN ──────────────────────────────────────────
    // Resolve authorUrn: body param → env → fetch from userinfo
    // Both REST Posts API and UGC Posts API use the same urn:li:person:SUB
    // value as `author` — there is no valid "urn:li:member" URN for posting.
    const fetch = require('node-fetch');
    let personUrn = bodyUrn || process.env.LINKEDIN_AUTHOR_URN || null;
    if (!personUrn) {
      try {
        const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const sub = profileData.sub;
          if (sub) {
            personUrn = `urn:li:person:${sub}`;
          }
        }
      } catch (err) {
        logger.warn('Failed to fetch userinfo from LinkedIn API:', err.message);
      }
    }

    // Cannot post without a real member ID
    if (!personUrn) {
      return res.status(401).json({
        success: false,
        error: 'LINKEDIN_TOKEN_REVOKED: Unable to resolve LinkedIn member ID. Please re-connect your account.',
      });
    }

    // Try REST Posts API first (newer, preferred) — uses personUrn
    const restPayload = {
      author: personUrn,
      commentary: formattedPost,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
    };

    const restRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': getLinkedInApiVersion(),
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(restPayload),
    });

    if (restRes.ok) {
      const postId = restRes.headers.get('x-restli-id') || `post_${Date.now()}`;
      logger.info(`✅ Quote posted via LinkedIn REST Posts API. postId: ${postId}`);

      const livePost = {
        content: formattedPost,
        author: author || 'Anonymous',
        postType: 'quote',
        status: 'published',
        publishedAt: new Date(),
        linkedInPostUrn: postId,
        linkedInPostUrl: `https://www.linkedin.com/feed/update/${postId}`,
        mode: 'live',
      };
      if (Post.db && Post.db.readyState === 1) {
        await Post.create(livePost).catch(() => {});
      } else {
        memoryStore.posts.unshift(livePost);
      }

      return res.status(201).json({
        success: true,
        mode: 'live_linkedin',
        message: 'Quote successfully posted to your live LinkedIn account feed!',
        data: {
          postId,
          formattedContent: formattedPost,
          publishedAt: new Date().toISOString(),
          postUrl: `https://www.linkedin.com/feed/update/${postId}`,
        },
      });
    }

    // REST failed — try UGC Posts fallback
    const restErrorText = await restRes.text();
    logger.warn(`REST Posts API failed (${restRes.status}), trying UGC fallback. Error: ${restErrorText}`);

    const ugcPayload = {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: formattedPost },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const ugcRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPayload),
    });

    if (!ugcRes.ok) {
      const ugcError = await ugcRes.text();
      return res.status(ugcRes.status || 500).json({
        success: false,
        error: 'LinkedIn API error while publishing post to your account.',
        details: { restPostsError: restErrorText, ugcPostsError: ugcError },
      });
    }

    const ugcData = await ugcRes.json();
    logger.info(`✅ Quote posted via LinkedIn UGC Posts fallback. postId: ${ugcData.id}`);

    const livePost = {
      content: formattedPost,
      author: author || 'Anonymous',
      postType: 'quote',
      status: 'published',
      publishedAt: new Date(),
      linkedInPostUrn: ugcData.id,
      linkedInPostUrl: `https://www.linkedin.com/feed/update/${ugcData.id}`,
      mode: 'live',
    };
    if (Post.db && Post.db.readyState === 1) {
      await Post.create(livePost).catch(() => {});
    } else {
      memoryStore.posts.unshift(livePost);
    }

    return res.status(201).json({
      success: true,
      mode: 'live_linkedin',
      message: 'Quote successfully posted to your live LinkedIn account feed!',
      data: {
        postId: ugcData.id,
        formattedContent: formattedPost,
        publishedAt: new Date().toISOString(),
        postUrl: `https://www.linkedin.com/feed/update/${ugcData.id}`,
      },
    });
  } catch (error) {
    logger.error('Error uploading quote post:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing quote upload.',
      details: error.message,
    });
  }
};

/**
 * Universal Post Publisher — Text, Images, Videos, Documents
 * POST /api/v1/posts/upload
 */
exports.createPost = async (req, res) => {
  try {
    const { title, description, content, author, hashtags, postType = 'text', mediaDetails = [], scheduledFor, simulate } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Post content text is required.' });
    }

    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      req.session?.accessToken ||
      global.activeLinkedInToken ||
      process.env.LINKEDIN_ACCESS_TOKEN ||
      process.env.LINKEDIN_AUTH_ID;

    // Schedule for future publishing
    if (scheduledFor) {
      const scheduleDate = new Date(scheduledFor);
      if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be a valid future date.' });
      }

      const scheduledPostData = {
        title, description, content, author, hashtags, postType, mediaDetails,
        status: 'scheduled',
        scheduledFor: scheduleDate,
        mode: simulate ? 'sandbox' : 'live',
      };

      let savedPost;
      if (Post.db && Post.db.readyState === 1) {
        savedPost = await Post.create(scheduledPostData);
        await Schedule.create({ postId: savedPost._id, scheduledAt: scheduleDate });
      } else {
        savedPost = { _id: `sched_${Date.now()}`, ...scheduledPostData };
        memoryStore.posts.unshift(savedPost);
        memoryStore.schedules.unshift({ postId: savedPost._id, scheduledAt: scheduleDate, status: 'pending' });
      }

      return res.status(201).json({
        success: true,
        message: 'Post successfully scheduled for automatic publication!',
        data: savedPost,
      });
    }

    // Instant publish via linkedinService (handles REST → UGC fallback internally)
    const result = await linkedinService.publishPost({
      accessToken: token,
      commentary: content,
      postType,
      mediaItems: mediaDetails,
      simulate: Boolean(simulate || !token),
      forceReal: !simulate && Boolean(token),
    });

    const postRecord = {
      title, description, content, author, hashtags, postType, mediaDetails,
      status: 'published',
      publishedAt: new Date(),
      linkedInPostUrn: result.postId,
      linkedInPostUrl: result.postUrl,
      mode: result.mode,
    };

    let createdPost;
    if (Post.db && Post.db.readyState === 1) {
      createdPost = await Post.create(postRecord).catch(() => postRecord);
    } else {
      createdPost = { _id: `post_${Date.now()}`, ...postRecord };
      memoryStore.posts.unshift(createdPost);
    }

    return res.status(201).json({
      success: true,
      message: result.message || 'Post published successfully!',
      data: createdPost,
      postUrl: result.postUrl,
    });
  } catch (err) {
    logger.error('Error creating post:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Get Published & Scheduled Post History
 */
exports.getHistory = async (req, res) => {
  try {
    let posts = [];
    if (Post.db && Post.db.readyState === 1) {
      posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    } else {
      posts = memoryStore.posts;
    }
    res.json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Delete a Post Record
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (Post.db && Post.db.readyState === 1) {
      await Post.findByIdAndDelete(id);
    } else {
      memoryStore.posts = memoryStore.posts.filter((p) => p._id !== id && p.id !== id);
    }
    res.json({ success: true, message: 'Post record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
