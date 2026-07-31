import React, { useState } from 'react';
import { X, ThumbsUp, MessageSquare, Repeat2, Send, Globe, Smartphone, Monitor, FileText } from 'lucide-react';

export default function PreviewModal({ isOpen, onClose, postData, profile }) {
  const [device, setDevice] = useState('desktop');
  if (!isOpen) return null;

  const { content, author, hashtags = [], mediaDetails = [], postType = 'text' } = postData || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`glass-card rounded-2xl border border-slate-700 w-full overflow-hidden flex flex-col max-h-[90vh] ${device === 'mobile' ? 'max-w-md' : 'max-w-2xl'}`}>
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100">LinkedIn Feed Preview</span>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 ml-4">
              <button
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded ${device === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded ${device === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LinkedIn Post Body Container */}
        <div className="p-4 overflow-y-auto bg-slate-950 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100">
            
            {/* Profile Header */}
            <div className="flex items-center gap-3 mb-3">
              <img
                src={profile?.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={profile?.displayName || 'Author'}
                className="w-11 h-11 rounded-full object-cover border border-slate-700"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-100 leading-tight truncate">{profile?.displayName || 'Javed Khan'}</h4>
                <p className="text-xs text-slate-400 truncate">{profile?.headline || 'AI & Social Media Strategist'}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                  <span>Just now</span>
                  <span>•</span>
                  <Globe className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Content Text */}
            <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mb-3">
              {content || 'Your post caption copy will appear here...'}
            </div>

            {/* Media Attachment Previews */}
            {mediaDetails.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-slate-800 mb-3 bg-black/40">
                {postType === 'video' ? (
                  <div className="aspect-video bg-slate-900 flex items-center justify-center text-purple-400">
                    <p className="text-xs font-semibold">Video Stream Attachment Ready</p>
                  </div>
                ) : postType === 'document' ? (
                  <div className="p-4 bg-slate-900 flex items-center gap-3 text-amber-400">
                    <FileText className="w-8 h-8 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{mediaDetails[0]?.filename || 'Document.pdf'}</p>
                      <p className="text-[11px] text-slate-400">PDF Document Attachment • 1 Page</p>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-0.5 ${mediaDetails.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {mediaDetails.slice(0, 4).map((m, i) => (
                      <img key={i} src={m.url} alt={m.altText || 'Media'} className="w-full h-48 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reactions Counter */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 mb-2">
              <div className="flex items-center gap-1 text-blue-400">
                <ThumbsUp className="w-3.5 h-3.5 fill-blue-400/20" />
                <span className="text-slate-400">142 reactions</span>
              </div>
              <span>18 comments • 4 reposts</span>
            </div>

            {/* LinkedIn Action Buttons */}
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800 text-xs font-semibold text-slate-400">
              <button className="flex items-center justify-center gap-1.5 py-2 hover:bg-slate-800 rounded-lg transition text-slate-300">
                <ThumbsUp className="w-4 h-4" /> Like
              </button>
              <button className="flex items-center justify-center gap-1.5 py-2 hover:bg-slate-800 rounded-lg transition text-slate-300">
                <MessageSquare className="w-4 h-4" /> Comment
              </button>
              <button className="flex items-center justify-center gap-1.5 py-2 hover:bg-slate-800 rounded-lg transition text-slate-300">
                <Repeat2 className="w-4 h-4" /> Repost
              </button>
              <button className="flex items-center justify-center gap-1.5 py-2 hover:bg-slate-800 rounded-lg transition text-slate-300">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
