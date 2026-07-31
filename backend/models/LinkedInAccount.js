const mongoose = require('mongoose');

const linkedInAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    memberId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    headline: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    vanityName: { type: String, default: '' },
    authorUrn: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    scope: { type: String, default: 'w_member_social' },
    isConnected: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.LinkedInAccount || mongoose.model('LinkedInAccount', linkedInAccountSchema);
