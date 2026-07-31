const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema(
  {
    repoId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    fullName: { type: String, required: true, index: true },
    owner: { type: String, required: true },
    htmlUrl: { type: String, required: true },
    description: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },
    language: { type: String, default: '' },
    topics: [{ type: String }],
    starsCount: { type: Number, default: 0 },
    forksCount: { type: Number, default: 0 },
    openIssuesCount: { type: Number, default: 0 },
    autoPostEnabled: { type: Boolean, default: true },
    customPromptTone: { type: String, default: 'Professional, engaging, and tech-focused' },
    defaultHashtags: [{ type: String }],
    lastEventAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Repository || mongoose.model('Repository', repositorySchema);
