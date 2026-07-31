import React from 'react';
import { Send, Github, FolderGit2, AlertOctagon, Eye, CheckCircle2 } from 'lucide-react';

export default function AnalyticsCard({ analytics, systemStats }) {
  const summary = analytics?.summary || { totalPosts: 0, publishedCount: 0, scheduledCount: 0, draftsCount: 0 };
  
  const stats = [
    { label: 'GitHub Events Detected', value: systemStats?.totalEvents ?? 0, icon: Github, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Tracked Repositories', value: systemStats?.totalRepos ?? 0, icon: FolderGit2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Published LinkedIn Posts', value: summary.publishedCount || systemStats?.totalPosts || 0, icon: Send, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Failed Jobs / Queue', value: systemStats?.failedJobsCount ?? 0, icon: AlertOctagon, color: systemStats?.failedJobsCount > 0 ? 'text-red-400' : 'text-slate-400', bg: systemStats?.failedJobsCount > 0 ? 'bg-red-500/10' : 'bg-slate-800' },
    { label: 'LinkedIn OAuth Status', value: systemStats?.activeLinkedInToken ? 'Connected' : 'Sandbox Mode', icon: CheckCircle2, color: systemStats?.activeLinkedInToken ? 'text-emerald-400' : 'text-amber-400', bg: 'bg-slate-800' },
    { label: 'Webhook Security', value: systemStats?.webhookSecretConfigured ? 'Secured (HMAC)' : 'Dev Mode', icon: CheckCircle2, color: systemStats?.webhookSecretConfigured ? 'text-sky-400' : 'text-slate-400', bg: 'bg-slate-800' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{item.label}</span>
              <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-100 mt-1 truncate">{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}
