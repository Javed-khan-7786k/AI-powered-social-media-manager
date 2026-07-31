const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    linkedInPostUrn: { type: String, required: true },
    impressions: { type: Number, default: 0 },
    uniqueImpressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0.0 },
    lastFetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Analytics || mongoose.model('Analytics', analyticsSchema);
