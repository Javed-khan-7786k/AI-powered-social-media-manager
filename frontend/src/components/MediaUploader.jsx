import React, { useState } from 'react';
import { UploadCloud, File, Image as ImageIcon, Video, FileText, X, CheckCircle2 } from 'lucide-react';
import { uploadMediaFiles } from '../services/api';

export default function MediaUploader({ mediaType = 'image', mediaDetails, setMediaDetails }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.target.files || e.dataTransfer.files);
    if (!files.length) return;

    setUploading(true);
    setProgress(30);

    try {
      const res = await uploadMediaFiles(files);
      setProgress(100);
      if (res.success && res.data) {
        const mapped = res.data.map((m) => ({
          url: m.fileUrl,
          filePath: m.filePath,
          filename: m.originalName,
          mimeType: m.mimeType,
          category: m.category,
          altText: '',
        }));
        setMediaDetails((prev) => [...prev, ...mapped]);
      }
    } catch (err) {
      alert(`Media upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeMedia = (index) => {
    setMediaDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAltText = (index, val) => {
    setMediaDetails((prev) => {
      const updated = [...prev];
      updated[index].altText = val;
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className="relative border-2 border-dashed border-slate-700 hover:border-blue-500/60 transition bg-slate-900/40 rounded-2xl p-6 text-center cursor-pointer group"
      >
        <input
          type="file"
          multiple={mediaType === 'image'}
          onChange={handleFileDrop}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:scale-110 transition">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Drag & Drop your {mediaType} files here, or <span className="text-blue-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports PNG, JPG, WEBP, MP4, MOV, PDF, DOCX, PPTX (Max 50MB)
            </p>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {mediaDetails.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {mediaDetails.map((item, idx) => (
            <div key={idx} className="glass-card p-3 rounded-xl border border-slate-800 flex flex-col gap-2 relative">
              <button
                type="button"
                onClick={() => removeMedia(idx)}
                className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                {item.category === 'image' && (
                  <img src={item.url} alt={item.filename} className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                )}
                {item.category === 'video' && (
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-slate-700">
                    <Video className="w-6 h-6" />
                  </div>
                )}
                {item.category === 'document' && (
                  <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-slate-700">
                    <FileText className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-xs font-semibold text-slate-200 truncate">{item.filename}</p>
                  <p className="text-[11px] text-slate-400">{item.mimeType}</p>
                </div>
              </div>

              {item.category === 'image' && (
                <input
                  type="text"
                  placeholder="Alt text for accessibility..."
                  value={item.altText || ''}
                  onChange={(e) => updateAltText(idx, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
