const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    role: { type: String, enum: ['user', 'admin'], default: 'admin' },
    avatar: { type: String, default: '' },
    activeLinkedInAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'LinkedInAccount', default: null },
    
    // Webhook Security
    githubWebhookSecret: { type: String, default: '' },
    
    // Notification Channels Settings
    notifications: {
      email: {
        enabled: { type: Boolean, default: true },
        recipient: { type: String, default: '' }
      },
      discord: {
        enabled: { type: Boolean, default: false },
        webhookUrl: { type: String, default: '' }
      },
      slack: {
        enabled: { type: Boolean, default: false },
        webhookUrl: { type: String, default: '' }
      },
      telegram: {
        enabled: { type: Boolean, default: false },
        botToken: { type: String, default: '' },
        chatId: { type: String, default: '' }
      },
      notifyOn: {
        success: { type: Boolean, default: true },
        failure: { type: Boolean, default: true },
        rateLimit: { type: Boolean, default: true },
        tokenExpiration: { type: Boolean, default: true }
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
