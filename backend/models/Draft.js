const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    title: { type: String, default: '' },
    content: { type: String, required: true },
    author: { type: String, default: '' },
    hashtags: [{ type: String }],
    postType: {
      type: String,
      enum: ['text', 'quote', 'single_image', 'multi_image', 'video', 'document'],
      default: 'text',
    },
    mediaDetails: [
      {
        url: String,
        filename: String,
        mimeType: String,
        altText: String,
      },
    ],
    tone: { type: String, default: 'Professional' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Draft || mongoose.model('Draft', draftSchema);
