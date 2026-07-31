import React, { useState } from 'react';
import { Calendar, Clock, Globe, X, Check } from 'lucide-react';

export default function ScheduleModal({ isOpen, onClose, onScheduleConfirm }) {
  if (!isOpen) return null;

  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('10:00');
  const [timezone, setTimezone] = useState('UTC');

  const handleConfirm = () => {
    if (!date || !time) {
      alert('Please select valid date and time.');
      return;
    }
    const scheduledISO = new Date(`${date}T${time}:00`).toISOString();
    onScheduleConfirm(scheduledISO, timezone);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl border border-slate-700 w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold text-slate-100 text-base">Schedule LinkedIn Post</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> Publication Date
          </label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" /> Publication Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" /> Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="Asia/Kolkata">IST (Indian Standard Time)</option>
            <option value="America/New_York">EST (Eastern Standard Time)</option>
            <option value="Europe/London">GMT (London Time)</option>
          </select>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition mt-2"
        >
          <Check className="w-4 h-4" /> Confirm Schedule
        </button>
      </div>
    </div>
  );
}
