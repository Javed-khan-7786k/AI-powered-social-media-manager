const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'ping',
        'repository',
        'push',
        'pull_request',
        'release',
        'create',
        'delete',
        'fork',
        'issues',
        'issue_comment',
        'star',
        'watch',
        'discussion',
        'workflow_run',
        'workflow_job',
        'unknown'
      ]
    },
    repoName: { type: String, required: true, index: true },
    repoOwner: { type: String, required: true },
    repoUrl: { type: String, default: '' },
    sender: { type: String, required: true },
    branch: { type: String, default: '' },
    commitSha: { type: String, default: '' },
    commitMessage: { type: String, default: '' },
    commitUrl: { type: String, default: '' },
    prUrl: { type: String, default: '' },
    prTitle: { type: String, default: '' },
    releaseName: { type: String, default: '' },
    addedFiles: [{ type: String }],
    modifiedFiles: [{ type: String }],
    removedFiles: [{ type: String }],
    changedFileCount: { type: Number, default: 0 },
    rawPayload: { type: Object, default: {} },
    status: {
      type: String,
      enum: ['received', 'processed', 'failed', 'ignored'],
      default: 'received',
      index: true
    },
    aiPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    errorMessage: { type: String, default: null },
    processedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
