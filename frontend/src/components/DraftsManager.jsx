import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Send, Clock, Sparkles } from 'lucide-react';
import { getDrafts, deleteDraft } from '../services/api';

export default function DraftsManager({ onSelectDraft }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDraftsList = async () => {
    setLoading(true);
    try {
      const res = await getDrafts();
      if (res.success) setDrafts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraftsList();
  }, []);

  const handleDelete = async (id) => {
    await deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d._id !== id && d.id !== id));
  };

  if (loading) {
    return <div className="text-xs text-slate-400 p-4">Loading saved drafts...</div>;
  }

  if (drafts.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center border border-slate-800 space-y-2">
        <FileText className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-300">No Drafts Saved Yet</h4>
        <p className="text-xs text-slate-500">Save post ideas as drafts while working in the post composer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {drafts.map((draft, idx) => (
        <div key={idx} className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                {draft.postType || 'text'}
              </span>
              <span className="text-[11px] text-slate-500">
                {new Date(draft.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-slate-200 line-clamp-3 font-mono">{draft.content}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={() => onSelectDraft(draft)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" /> Load into Composer
            </button>

            <button
              onClick={() => handleDelete(draft._id || draft.id)}
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
