const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    event: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    linkedInAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'LinkedInAccount', required: false },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Log || mongoose.model('Log', logSchema);
