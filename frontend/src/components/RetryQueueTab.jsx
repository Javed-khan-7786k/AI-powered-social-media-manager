import React, { useState, useEffect } from 'react';
import { AlertOctagon, RotateCw, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { getFailedJobs, retryFailedJob } from '../services/api';

export default function RetryQueueTab({ setToast }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await getFailedJobs();
      setJobs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRetry = async (jobId) => {
    setRetryingId(jobId);
    try {
      await retryFailedJob(jobId);
      setToast({ type: 'success', message: 'Job retried successfully!' });
      fetchJobs();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Retry failed.' });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Retry Queue & Error Diagnostics
            </h2>
            <p className="text-xs text-slate-400">Failed webhook jobs or publishing dispatches pending automatic/manual retry</p>
          </div>
          <button
            onClick={fetchJobs}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400" />
            <p className="text-sm font-semibold text-slate-200">No Failed Jobs in Queue</p>
            <p className="text-xs text-slate-500">All background webhook jobs and LinkedIn posts are executing cleanly!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.jobId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                  <div>
                    <span className="font-mono text-xs text-purple-400 font-bold">{job.jobId}</span>
                    <span className="ml-2 uppercase text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {job.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Attempts: <strong className="text-slate-200">{job.attempts}/{job.maxAttempts}</strong></span>
                    <button
                      onClick={() => handleRetry(job.jobId)}
                      disabled={retryingId === job.jobId}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 ${retryingId === job.jobId ? 'animate-spin' : ''}`} /> Retry Now
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-red-400 font-mono bg-red-950/30 border border-red-900/40 p-2.5 rounded-lg">
                    {job.lastError || 'Unknown Error'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
