import React, { useState } from 'react';
import { Sparkles, Hash, Wand2, ArrowRight, Loader2 } from 'lucide-react';
import { generateAICaption, generateAIHashtags, transformAITone } from '../services/api';

export default function AIContentGenerator({ onApplyContent, currentContent }) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('Professional');
  const [includeCTA, setIncludeCTA] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState('');
  const [hashtags, setHashtags] = useState([]);

  const tones = ['Professional', 'Casual', 'Marketing', 'Corporate', 'Startup'];

  const handleGenerate = async () => {
    if (!prompt.trim() && !currentContent.trim()) {
      alert('Please enter a topic prompt or existing post copy.');
      return;
    }

    setLoading(true);
    try {
      const inputTopic = prompt.trim() || currentContent;
      const res = await generateAICaption(inputTopic, tone, includeCTA);
      if (res.success) {
        setGeneratedResult(res.data.caption);
        setHashtags(res.data.hashtags || []);
      }
    } catch (err) {
      alert(`AI Generation Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransformCurrent = async () => {
    if (!currentContent.trim()) {
      alert('Write or paste some post content first to transform tone.');
      return;
    }
    setLoading(true);
    try {
      const res = await transformAITone(currentContent, tone);
      if (res.success) {
        setGeneratedResult(res.content);
        const tagsRes = await generateAIHashtags(res.content, 5);
        if (tagsRes.success) setHashtags(tagsRes.hashtags);
      }
    } catch (err) {
      alert(`Tone Transformation Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    let finalCopy = generatedResult;
    if (hashtags.length > 0) {
      finalCopy += `\n\n${hashtags.join(' ')}`;
    }
    onApplyContent(finalCopy, hashtags);
  };

  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex items-center gap-2 text-purple-400">
        <Sparkles className="w-5 h-5" />
        <h3 className="font-bold text-slate-100 text-sm">AI Content & Hashtag Generator</h3>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Topic or Idea Prompt</label>
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. AI-driven social media management strategy in 2026..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Brand Tone Voice</label>
        <div className="flex flex-wrap gap-1.5">
          {tones.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                tone === t
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCTA}
            onChange={(e) => setIncludeCTA(e.target.checked)}
            className="rounded border-slate-800 bg-slate-950 text-purple-600"
          />
          Include Call-To-Action (CTA)
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Generate AI Copy
        </button>

        <button
          type="button"
          onClick={handleTransformCurrent}
          disabled={loading}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold transition"
        >
          Re-tone Draft
        </button>
      </div>

      {generatedResult && (
        <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl space-y-2">
          <p className="text-xs text-slate-200 whitespace-pre-wrap">{generatedResult}</p>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {hashtags.map((h, i) => (
                <span key={i} className="text-[11px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                  {h}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition mt-2"
          >
            Apply to Composer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
