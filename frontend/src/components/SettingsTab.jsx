import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Key, Send, Save, CheckCircle } from 'lucide-react';
import { getDashboardStats, updateSystemSettings, sendTestNotification } from '../services/api';

export default function SettingsTab({ setToast }) {
  const [webhookSecret, setWebhookSecret] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [slackUrl, setSlackUrl] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((res) => {
      if (res.data?.notificationsConfig) {
        const nc = res.data.notificationsConfig;
        setDiscordUrl(nc.discord?.webhookUrl || '');
        setDiscordEnabled(nc.discord?.enabled || false);
        setSlackUrl(nc.slack?.webhookUrl || '');
        setSlackEnabled(nc.slack?.enabled || false);
        setTelegramToken(nc.telegram?.botToken || '');
        setTelegramChatId(nc.telegram?.chatId || '');
        setTelegramEnabled(nc.telegram?.enabled || false);
      }
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateSystemSettings({
        githubWebhookSecret: webhookSecret,
        notifications: {
          discord: { enabled: discordEnabled, webhookUrl: discordUrl },
          slack: { enabled: slackEnabled, webhookUrl: slackUrl },
          telegram: { enabled: telegramEnabled, botToken: telegramToken, chatId: telegramChatId }
        }
      });
      setToast({ type: 'success', message: 'System settings saved successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update settings.' });
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification('all');
      setToast({ type: 'success', message: 'Test notification dispatched across active channels!' });
    } catch (err) {
      setToast({ type: 'error', message: 'Notification test failed.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Webhook & Security Config */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">GitHub App Webhook Security</h2>
              <p className="text-xs text-slate-400">Configure HMAC-SHA256 signature secret for authenticating incoming webhooks</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">GitHub Webhook Secret</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              placeholder="Enter your GitHub Webhook Secret (or set in .env as GITHUB_WEBHOOK_SECRET)"
            />
          </div>
        </div>

        {/* Notifications Config */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Alert & Notification Integrations</h2>
                <p className="text-xs text-slate-400">Receive alerts on Discord, Slack, and Telegram for post publications & error events</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestNotification}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Test Notifications
            </button>
          </div>

          {/* Discord */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-indigo-400">Discord Webhook</span>
              <input
                type="checkbox"
                checked={discordEnabled}
                onChange={(e) => setDiscordEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
              />
            </div>
            <input
              type="text"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>

          {/* Slack */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-emerald-400">Slack Webhook</span>
              <input
                type="checkbox"
                checked={slackEnabled}
                onChange={(e) => setSlackEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
              />
            </div>
            <input
              type="text"
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>

          {/* Telegram */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-cyan-400">Telegram Bot</span>
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-600 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="Bot Token (e.g. 123456:ABC...)"
              />
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="Chat ID (e.g. -100123456789)"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition"
        >
          <Save className="w-4 h-4" /> Save System Settings
        </button>
      </form>

    </div>
  );
}
