const fetch = require('node-fetch');
const logger = require('./loggerService');
const User = require('../models/User');

class NotificationService {
  /**
   * Dispatch system notification across configured channels (Slack, Discord, Telegram, Email)
   */
  async notify({ title, message, type = 'info', metadata = {} }) {
    logger.info(`[Notification] [${type.toUpperCase()}] ${title}: ${message}`);

    try {
      const user = await User.findOne({ role: 'admin' }) || await User.findOne({});
      if (!user || !user.notifications) return;

      const config = user.notifications;
      const notifyOn = config.notifyOn || {};

      // Check if event type matches settings
      if (type === 'success' && !notifyOn.success) return;
      if (type === 'failure' && !notifyOn.failure) return;
      if (type === 'rate_limit' && !notifyOn.rateLimit) return;
      if (type === 'token_expiration' && !notifyOn.tokenExpiration) return;

      const promises = [];

      // 1. Discord Webhook
      if (config.discord?.enabled && config.discord?.webhookUrl) {
        promises.push(this.sendDiscord(config.discord.webhookUrl, title, message, type, metadata));
      }

      // 2. Slack Webhook
      if (config.slack?.enabled && config.slack?.webhookUrl) {
        promises.push(this.sendSlack(config.slack.webhookUrl, title, message, type, metadata));
      }

      // 3. Telegram Bot
      if (config.telegram?.enabled && config.telegram?.botToken && config.telegram?.chatId) {
        promises.push(this.sendTelegram(config.telegram.botToken, config.telegram.chatId, title, message));
      }

      await Promise.allSettled(promises);
    } catch (err) {
      logger.error(`Error in NotificationService: ${err.message}`);
    }
  }

  async sendDiscord(webhookUrl, title, message, type, metadata) {
    const colorMap = { success: 0x10b981, failure: 0xef4444, rate_limit: 0xf59e0b, info: 0x3b82f6 };
    const embed = {
      title: `${type === 'success' ? '✅' : type === 'failure' ? '❌' : 'ℹ️'} ${title}`,
      description: message,
      color: colorMap[type] || colorMap.info,
      fields: Object.keys(metadata).map(k => ({ name: k, value: String(metadata[k]), inline: true })),
      timestamp: new Date().toISOString()
    };

    return fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    }).catch(err => logger.error(`Discord notification failed: ${err.message}`));
  }

  async sendSlack(webhookUrl, title, message, type, metadata) {
    const text = `*${title}*\n${message}\n` + Object.entries(metadata).map(([k, v]) => `• *${k}*: ${v}`).join('\n');
    return fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }).catch(err => logger.error(`Slack notification failed: ${err.message}`));
  }

  async sendTelegram(botToken, chatId, title, message) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const text = `<b>${title}</b>\n\n${message}`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    }).catch(err => logger.error(`Telegram notification failed: ${err.message}`));
  }
}

module.exports = new NotificationService();
