const Post = require('../models/Post');
const Draft = require('../models/Draft');
const { memoryStore } = require('../config/db');

exports.getOverview = async (req, res) => {
  try {
    let posts = [];
    let drafts = [];

    if (Post.db && Post.db.readyState === 1) {
      posts = await Post.find();
      drafts = await Draft.find();
    } else {
      posts = memoryStore.posts;
      drafts = memoryStore.drafts;
    }

    const totalPosts = posts.length;
    const publishedCount = posts.filter((p) => p.status === 'published').length;
    const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
    const failedCount = posts.filter((p) => p.status === 'failed').length;
    const draftsCount = drafts.length;

    // Simulated engagement calculations for live analytics visualization
    const totalImpressions = publishedCount * 1420 + 850;
    const totalReactions = publishedCount * 98 + 42;
    const totalComments = publishedCount * 24 + 11;
    const avgEngagementRate = publishedCount > 0 ? '4.8%' : '0.0%';

    res.json({
      success: true,
      data: {
        summary: {
          totalPosts,
          publishedCount,
          scheduledCount,
          failedCount,
          draftsCount,
        },
        engagement: {
          impressions: totalImpressions,
          reactions: totalReactions,
          comments: totalComments,
          avgEngagementRate,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
