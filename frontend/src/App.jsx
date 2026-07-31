import React, { useState, useEffect } from 'react';
import { Linkedin, Github, Terminal, Play, ShieldAlert, Settings, FileText, History, RefreshCw, PenTool } from 'lucide-react';
import LinkedInButton from './components/LinkedInButton';
import ConnectionCard from './components/ConnectionCard';
import AnalyticsCard from './components/AnalyticsCard';
import PostEditor from './components/PostEditor';
import DraftsManager from './components/DraftsManager';
import PostHistory from './components/PostHistory';
import GitHubEventsTab from './components/GitHubEventsTab';
import SimulatorTab from './components/SimulatorTab';
import RetryQueueTab from './components/RetryQueueTab';
import SettingsTab from './components/SettingsTab';
import Toast from './components/Toast';
import { getAuthStatus, getAnalyticsOverview, getDashboardStats } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('github'); // github, simulator, create, drafts, history, queue, settings
  const [authStatus, setAuthStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshDashboardData = async () => {
    try {
      const [authRes, analyticsRes, systemRes] = await Promise.all([
        getAuthStatus().catch(() => ({ authenticated: false })),
        getAnalyticsOverview().catch(() => ({ data: null })),
        getDashboardStats().catch(() => ({ data: null })),
      ]);
      setAuthStatus(authRes);
      setAnalytics(analyticsRes.data);
      setSystemStats(systemRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboardData();
  }, []);

  const triggerToast = (toastObj) => {
    setToast(toastObj);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl shadow-lg shadow-blue-600/30 text-white font-black text-xl flex items-center justify-center">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-100 flex items-center gap-2">
                GitHub → LinkedIn AI Platform <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">v2.0</span>
              </h1>
              <p className="text-xs text-slate-400">Automated GitHub Event Detector & AI Social Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshDashboardData}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <LinkedInButton isConnected={authStatus?.authenticated} profileName={authStatus?.profile?.displayName} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Analytics Stats Overview */}
        <AnalyticsCard analytics={analytics} systemStats={systemStats} />

        {/* Tab Navigation Workspace */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            {[
              { id: 'github', label: 'GitHub Events & Repos', icon: Github },
              { id: 'simulator', label: 'Webhook Simulator', icon: Terminal },
              { id: 'create', label: 'Manual Post Composer', icon: PenTool },
              { id: 'drafts', label: 'Saved Drafts', icon: FileText },
              { id: 'history', label: 'LinkedIn Post History', icon: History },
              { id: 'queue', label: 'Retry Queue & Errors', icon: ShieldAlert },
              { id: 'settings', label: 'Integrations & Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab View Rendering */}
          <div>
            {activeTab === 'github' && <GitHubEventsTab setToast={triggerToast} />}

            {activeTab === 'simulator' && (
              <SimulatorTab
                setToast={triggerToast}
                onSimulationSuccess={refreshDashboardData}
              />
            )}

            {activeTab === 'create' && (
              <PostEditor
                profile={authStatus?.profile}
                onPostSuccess={refreshDashboardData}
                setToast={triggerToast}
              />
            )}

            {activeTab === 'drafts' && (
              <DraftsManager
                onSelectDraft={() => {
                  setActiveTab('create');
                }}
              />
            )}

            {activeTab === 'history' && <PostHistory />}

            {activeTab === 'queue' && <RetryQueueTab setToast={triggerToast} />}

            {activeTab === 'settings' && (
              <div className="space-y-8">
                <SettingsTab setToast={triggerToast} />
                <div className="max-w-xl mx-auto">
                  <ConnectionCard authStatus={authStatus} onStatusChange={refreshDashboardData} />
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
