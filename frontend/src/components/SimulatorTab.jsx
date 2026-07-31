import React, { useState } from 'react';
import { Send, Play, Sparkles, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { simulateWebhookEvent } from '../services/api';

export default function SimulatorTab({ setToast, onSimulationSuccess }) {
  const [eventType, setEventType] = useState('push');
  const [repoName, setRepoName] = useState('ai-social-media-manager');
  const [author, setAuthor] = useState('parvej-alam');
  const [commitMessage, setCommitMessage] = useState('feat(auth): implement GitHub Webhook HMAC validation and AI summary generator');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await simulateWebhookEvent({
        eventType,
        repoName,
        author,
        commitMessage
      });

      setResult(res);
      setToast({ type: 'success', message: 'GitHub Webhook simulation successfully triggered!' });
      if (onSimulationSuccess) onSimulationSuccess();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Simulation failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">GitHub Webhook Event Simulator</h2>
            <p className="text-xs text-slate-400">Test the entire end-to-end AI generation & LinkedIn posting flow without pushing code to GitHub</p>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">GitHub Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="push">Push / Code Commit</option>
                <option value="pull_request">Pull Request Merged</option>
                <option value="release">Official Release Published</option>
                <option value="star">Repository Starred</option>
                <option value="issues">Issue Created / Updated</option>
                <option value="fork">Repository Forked</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Repository Name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="e.g. ai-social-media-manager"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Commit Author / Sender</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Commit / Event Message</label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <Play className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Processing Webhook Event...' : 'Trigger Simulated Webhook Event'}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" /> Webhook Event Accepted & Queued!
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto space-y-1">
            <div className="text-slate-500">// Processing Response Payload</div>
            <div>Status: <span className="text-emerald-400">{result.status}</span></div>
            <div>Delivery Event ID: <span className="text-blue-400">{result.eventId}</span></div>
            <div>Target Repository: <span className="text-purple-400">{result.repository}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
