import React from 'react';
import { Linkedin, CheckCircle, ShieldCheck } from 'lucide-react';

export default function LinkedInButton({ isConnected, profileName }) {
  const handleConnect = () => {
    window.location.href = 'http://localhost:3000/auth/linkedin';
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 bg-blue-950/60 border border-blue-500/30 px-4 py-2 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
          <Linkedin className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-400">
            <span>{profileName || 'LinkedIn Connected'}</span>
            <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
          </div>
          <p className="text-xs text-slate-400">OAuth 2.0 Token Active</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <Linkedin className="w-5 h-5 fill-current" />
      <span>Connect LinkedIn Account</span>
    </button>
  );
}
