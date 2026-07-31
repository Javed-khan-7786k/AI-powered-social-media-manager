const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'UTC' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String, default: null },
    executedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
