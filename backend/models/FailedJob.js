const mongoose = require('mongoose');

const failedJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['webhook_processing', 'ai_generation', 'linkedin_publishing', 'notification'], required: true },
    payload: { type: Object, required: true },
    attempts: { type: Number, default: 1 },
    maxAttempts: { type: Number, default: 5 },
    lastError: { type: String, default: '' },
    stackTrace: { type: String, default: '' },
    status: { type: String, enum: ['pending_retry', 'retrying', 'exhausted', 'resolved'], default: 'pending_retry', index: true },
    nextRetryAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.models.FailedJob || mongoose.model('FailedJob', failedJobSchema);
