import React, { useState } from 'react';
import { Send, Clock, FileText, Eye, Sparkles, Image, Video, FileCode, Smile, Hash, AlertCircle, Loader2 } from 'lucide-react';
import MediaUploader from './MediaUploader';
import AIContentGenerator from './AIContentGenerator';
import PreviewModal from './PreviewModal';
import ScheduleModal from './ScheduleModal';
import { createPost, saveDraft } from '../services/api';

export default function PostEditor({ profile, onPostSuccess, setToast }) {
  const [postType, setPostType] = useState('text'); // text, quote, single_image, multi_image, video, document
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [mediaDetails, setMediaDetails] = useState([]);
  
  const [showAI, setShowAI] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const characterCount = content.length;
  const maxCharacters = 3000;

  const handleApplyAICopy = (newContent, newHashtags = []) => {
    setContent(newContent);
    setHashtags(newHashtags);
    setShowAI(false);
  };

  const handlePublishNow = async () => {
    if (!content.trim()) {
      setToast({ type: 'error', message: 'Please enter post copy content.' });
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        title,
        description,
        content,
        author: author || profile?.displayName || 'Anonymous',
        hashtags,
        postType,
        mediaDetails,
        simulate: false,
      };

      const res = await createPost(payload);
      if (res.success) {
        if (res.data?.mode === 'sandbox' || res.mode === 'sandbox') {
          setToast({ type: 'success', message: '✅ Post saved in Sandbox mode successfully!' });
        } else {
          setToast({ type: 'success', message: res.message || '✅ Post published to LinkedIn successfully!' });
        }
        setContent('');
        setTitle('');
        setMediaDetails([]);
        if (onPostSuccess) onPostSuccess();
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.details || err.message || '';
      // Detect LinkedIn token revocation — prompt re-auth
      if (errMsg.includes('LINKEDIN_TOKEN_REVOKED') || errMsg.includes('REVOKED_ACCESS_TOKEN') || errMsg.includes('EXPIRED_ACCESS_TOKEN')) {
        setToast({
          type: 'reauth',
          message: '🔐 LinkedIn token expired/revoked. Click to Re-Connect your account.',
          action: () => window.open('http://localhost:3000/auth/linkedin', '_self'),
        });
      } else {
        setToast({ type: 'error', message: `Publication Failed: ${errMsg}` });
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleScheduleConfirm = async (scheduledISO, timezone) => {
    if (!content.trim()) {
      setToast({ type: 'error', message: 'Please enter post copy content before scheduling.' });
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        title,
        description,
        content,
        author: author || profile?.displayName || 'Anonymous',
        hashtags,
        postType,
        mediaDetails,
        scheduledFor: scheduledISO,
        simulate: false,
      };

      const res = await createPost(payload);
      if (res.success) {
        setToast({ type: 'success', message: 'Post queued for automatic background scheduling!' });
        setContent('');
        setMediaDetails([]);
        if (onPostSuccess) onPostSuccess();
      }
    } catch (err) {
      setToast({ type: 'error', message: `Scheduling Failed: ${err.message}` });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!content.trim()) {
      setToast({ type: 'error', message: 'Content is required to save a draft.' });
      return;
    }

    try {
      const res = await saveDraft({
        title,
        content,
        author: author || profile?.displayName,
        hashtags,
        postType,
        mediaDetails,
      });
      if (res.success) {
        setToast({ type: 'success', message: 'Draft saved successfully!' });
        if (onPostSuccess) onPostSuccess();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Composer Pane (2 Columns) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          
          {/* Post Type Tab Selector */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
            {[
              { id: 'text', label: 'Text / Quote', icon: FileText },
              { id: 'single_image', label: 'Single Image', icon: Image },
              { id: 'multi_image', label: 'Multi-Image', icon: Image },
              { id: 'video', label: 'Video', icon: Video },
              { id: 'document', label: 'Document (PDF)', icon: FileCode },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPostType(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    postType === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Title & Author Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Post Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly Thought Leadership"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Author Attribution</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={profile?.displayName || 'Javed Khan'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-400">Post Copy & Content *</label>
              <button
                type="button"
                onClick={() => setShowAI(!showAI)}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Copy Assistant
              </button>
            </div>

            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your LinkedIn post here... Use @mentions, #hashtags, and compelling insights."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
            />

            {/* Character & Formatting Footer */}
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
              <div className="flex items-center gap-3">
                <span className={characterCount > maxCharacters ? 'text-rose-400 font-bold' : ''}>
                  {characterCount} / {maxCharacters} chars
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold"
              >
                <Eye className="w-4 h-4" /> Live Feed Preview
              </button>
            </div>
          </div>

          {/* Media Upload Section if not plain text */}
          {postType !== 'text' && (
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Media File Attachments</label>
              <MediaUploader mediaType={postType} mediaDetails={mediaDetails} setMediaDetails={setMediaDetails} />
            </div>
          )}

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              <FileText className="w-4 h-4" /> Save Draft
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
              >
                <Clock className="w-4 h-4 text-purple-400" /> Schedule Post
              </button>

              <button
                type="button"
                onClick={handlePublishNow}
                disabled={publishing}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish Now
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Right Drawer Pane (AI Assistant / Help) */}
      <div className="space-y-4">
        {showAI ? (
          <AIContentGenerator onApplyContent={handleApplyAICopy} currentContent={content} />
        ) : (
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 text-xs text-slate-400">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> LinkedIn Posting Tips
            </h3>
            <ul className="space-y-2 list-disc list-inside text-slate-400 leading-relaxed">
              <li>Keep hook sentences under 150 characters to grab attention before "see more".</li>
              <li>Include 3-5 relevant hashtags for maximum algorithmic reach.</li>
              <li>Ask a closing question to boost comment engagement.</li>
              <li>PDF document carousels get 3x higher impressions on LinkedIn.</li>
            </ul>
            <button
              onClick={() => setShowAI(true)}
              className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/30 transition mt-2 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Open AI Assistant
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        postData={{ content, author, hashtags, mediaDetails, postType }}
        profile={profile}
      />

      <ScheduleModal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        onScheduleConfirm={handleScheduleConfirm}
      />
    </div>
  );
}
