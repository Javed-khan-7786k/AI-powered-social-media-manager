const mongoose = require('mongoose');

const gitHubInstallationSchema = new mongoose.Schema(
  {
    installationId: { type: String, required: true, unique: true, index: true },
    accountName: { type: String, required: true },
    accountId: { type: String, required: true },
    accountType: { type: String, enum: ['User', 'Organization'], default: 'User' },
    avatarUrl: { type: String, default: '' },
    htmlUrl: { type: String, default: '' },
    repositories: [{ type: String }],
    permissions: { type: Map, of: String },
    events: [{ type: String }],
    isActive: { type: Boolean, default: true },
    installedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.models.GitHubInstallation || mongoose.model('GitHubInstallation', gitHubInstallationSchema);
