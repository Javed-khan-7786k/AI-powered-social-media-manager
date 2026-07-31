import React, { useState, useEffect } from 'react';
import { Send, Clock, AlertCircle, ExternalLink, Trash2, CheckCircle2, Shield } from 'lucide-react';
import { getPostHistory, deletePost } from '../services/api';

export default function PostHistory() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getPostHistory();
      if (res.success) setPosts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    await deletePost(id);
    setPosts((prev) => prev.filter((p) => p._id !== id && p.id !== id));
  };

  if (loading) {
    return <div className="text-xs text-slate-400 p-4">Loading post execution logs...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center border border-slate-800 space-y-2">
        <Send className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-300">No Post Execution History</h4>
        <p className="text-xs text-slate-500">Published and scheduled LinkedIn posts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post, idx) => {
        const isPublished = post.status === 'published';
        const isScheduled = post.status === 'scheduled';
        const isFailed = post.status === 'failed';

        return (
          <div key={idx} className="glass-card p-4 rounded-2xl border border-slate-800 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              {isPublished && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isScheduled && <Clock className="w-5 h-5 text-purple-400" />}
              {isFailed && <AlertCircle className="w-5 h-5 text-rose-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isPublished
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : isScheduled
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {post.status.toUpperCase()}
                </span>
                <span className="text-[11px] font-medium text-slate-400">Type: {post.postType || 'text'}</span>
                {post.mode === 'sandbox' && (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    SANDBOX
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-200 line-clamp-2 mb-2 whitespace-pre-wrap">{post.content}</p>

              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                {isPublished && <span>Published: {new Date(post.publishedAt || post.createdAt).toLocaleString()}</span>}
                {isScheduled && <span>Scheduled for: {new Date(post.scheduledFor).toLocaleString()}</span>}
                {post.linkedInPostUrn && <span className="font-mono">URN: {post.linkedInPostUrn}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {post.linkedInPostUrl && (
                <a
                  href={post.linkedInPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                  title="View on LinkedIn"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={() => handleDelete(post._id || post.id)}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                title="Delete Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
