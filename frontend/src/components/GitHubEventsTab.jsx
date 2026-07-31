import React, { useState, useEffect } from 'react';
import { GitCommit, GitPullRequest, Tag, Star, Folder, RefreshCw, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { getGitHubEvents, getRepositories } from '../services/api';

export default function GitHubEventsTab({ setToast }) {
  const [events, setEvents] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, reposRes] = await Promise.all([
        getGitHubEvents().catch(() => ({ data: [] })),
        getRepositories().catch(() => ({ data: [] }))
      ]);
      setEvents(eventsRes.data || []);
      setRepos(reposRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getEventIcon = (type) => {
    switch (type) {
      case 'push': return <GitCommit className="w-5 h-5 text-blue-400" />;
      case 'pull_request': return <GitPullRequest className="w-5 h-5 text-purple-400" />;
      case 'release': return <Tag className="w-5 h-5 text-emerald-400" />;
      case 'star': return <Star className="w-5 h-5 text-amber-400" />;
      default: return <Folder className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tracked Repositories Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Tracked Repositories</h2>
            <p className="text-xs text-slate-400">Repositories sending Webhook events to this AI platform</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {repos.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-400">
            No repositories registered yet. Send a simulated webhook or push code to a connected GitHub repo!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {repos.map((repo) => (
              <div key={repo._id || repo.repoId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div className="font-bold text-sm text-blue-400 truncate max-w-[200px]">{repo.name}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Auto-Post Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{repo.description || 'No description provided.'}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                  <span>⭐ {repo.starsCount || 0} stars</span>
                  <span>🍴 {repo.forksCount || 0} forks</span>
                  <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live GitHub Webhook Events Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-100 mb-1">Detected GitHub Events</h2>
        <p className="text-xs text-slate-400 mb-6">Real-time log of GitHub events received via GitHub App Webhooks</p>

        {events.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-500 animate-pulse" />
            <p className="text-sm font-semibold text-slate-300">No Webhook Events Recorded Yet</p>
            <p className="text-xs text-slate-500">Go to the "Webhook Simulator" tab to trigger a test GitHub push!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt._id || evt.eventId}
                onClick={() => setSelectedEvent(selectedEvent === evt ? null : evt)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    {getEventIcon(evt.eventType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{evt.repoName}</span>
                      <span className="uppercase text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {evt.eventType}
                      </span>
                      {evt.branch && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {evt.branch}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-mono mt-1 line-clamp-1">{evt.commitMessage || evt.prTitle || 'Event details'}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Author: {evt.sender || evt.author} • {new Date(evt.createdAt || evt.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {evt.status === 'processed' ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> AI Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" /> Received
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
