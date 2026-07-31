const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    linkedInAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'LinkedInAccount', required: false },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null, index: true },
    repositoryName: { type: String, default: '' },
    repositoryUrl: { type: String, default: '' },
    
    // AI Generated Structured Breakdown
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    technicalExplanation: { type: String, default: '' },
    keyFeatures: [{ type: String }],
    businessImpact: { type: String, default: '' },
    imagePrompt: { type: String, default: '' },
    
    // Final Post Output
    content: { type: String, required: true },
    author: { type: String, default: '' },
    hashtags: [{ type: String }],
    postType: {
      type: String,
      enum: ['text', 'quote', 'single_image', 'multi_image', 'video', 'document', 'article'],
      default: 'text',
      required: true,
    },
    mediaUrls: [{ type: String }],
    mediaUrns: [{ type: String }],
    mediaDetails: [
      {
        url: String,
        filename: String,
        mimeType: String,
        altText: String,
        title: String,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
      default: 'draft',
      index: true,
    },
    scheduledFor: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null },
    linkedInPostUrn: { type: String, default: null },
    linkedInPostUrl: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    mode: { type: String, enum: ['live', 'sandbox'], default: 'live' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);
