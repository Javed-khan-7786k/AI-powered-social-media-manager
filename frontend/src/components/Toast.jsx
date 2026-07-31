import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, LogIn, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isReauth = toast.type === 'reauth';

  const handleClick = () => {
    if (toast.action) toast.action();
    onClose();
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all animate-bounce-short glass-card max-w-md ${isReauth ? 'cursor-pointer hover:opacity-90 border-amber-500/40' : ''}`}
      onClick={isReauth ? handleClick : undefined}
    >
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
      {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
      {isReauth && <LogIn className="w-5 h-5 text-amber-400 shrink-0" />}
      {!isSuccess && !isError && !isWarning && !isReauth && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
      <span className={`text-sm font-medium flex-1 ${
        isWarning || isReauth ? 'text-amber-200' : 'text-slate-200'
      }`}>{toast.message}</span>
      {isReauth && (
        <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30 shrink-0 font-semibold">
          Connect →
        </span>
      )}
      {!isReauth && (
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
