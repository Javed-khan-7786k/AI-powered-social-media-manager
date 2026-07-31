import React from 'react';
import { Linkedin, Key, ShieldCheck, Power, RefreshCw, AlertCircle } from 'lucide-react';
import { disconnectAccount } from '../services/api';

export default function ConnectionCard({ authStatus, onStatusChange }) {
  const profile = authStatus?.profile || {};
  const isConnected = authStatus?.authenticated;

  const handleDisconnect = async () => {
    await disconnectAccount();
    if (onStatusChange) onStatusChange();
  };

  const handleReconnect = () => {
    window.location.href = 'http://localhost:3000/auth/linkedin';
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            <Linkedin className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">LinkedIn Account</h2>
        </div>
        {isConnected ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Sandbox / Ready
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 py-3 border-y border-slate-800 my-4">
        <img
          src={profile.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
          alt={profile.displayName || 'Profile'}
          className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/40"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-100 truncate">{profile.displayName || 'Javed Khan'}</h3>
          <p className="text-xs text-slate-400 truncate">{profile.headline || 'AI & Social Media Strategist'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono text-slate-500 truncate">URN: {profile.authorUrn || 'urn:li:person:me'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs text-slate-400 mb-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-blue-400" /> Token Preview:</span>
          <span className="font-mono text-slate-300">{authStatus?.tokenPreview || 'AQV7RTha6V...'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> OAuth Scope:</span>
          <span className="font-semibold text-slate-300">w_member_social</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        {isConnected ? (
          <>
            <button
              onClick={handleReconnect}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-600/20"
            >
              <RefreshCw className="w-4 h-4" /> Re-Connect LinkedIn
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold transition"
            >
              <Power className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={handleReconnect}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-600/20"
          >
            <RefreshCw className="w-4 h-4" /> Connect LinkedIn Account
          </button>
        )}
      </div>
    </div>
  );
}
