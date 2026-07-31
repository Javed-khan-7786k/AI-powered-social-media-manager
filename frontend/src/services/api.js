import axios from 'axios';

const API_BASE = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAuthStatus = async () => {
  const res = await api.get('/auth/status');
  return res.data;
};

export const disconnectAccount = async () => {
  const res = await api.post('/auth/disconnect');
  return res.data;
};

export const createPost = async (payload) => {
  const res = await api.post('/api/v1/posts/upload', payload);
  return res.data;
};

export const uploadQuote = async (payload) => {
  const res = await api.post('/api/v1/posts/quote', payload);
  return res.data;
};

export const getPostHistory = async () => {
  const res = await api.get('/api/v1/posts/history');
  return res.data;
};

export const deletePost = async (id) => {
  const res = await api.delete(`/api/v1/posts/${id}`);
  return res.data;
};

export const uploadMediaFiles = async (files) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  const res = await api.post('/api/v1/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const generateAICaption = async (prompt, tone, includeCTA) => {
  const res = await api.post('/api/v1/ai/generate-caption', { prompt, tone, includeCTA });
  return res.data;
};

export const transformAITone = async (content, tone) => {
  const res = await api.post('/api/v1/ai/transform-tone', { content, tone });
  return res.data;
};

export const generateAIHashtags = async (content, count = 5) => {
  const res = await api.post('/api/v1/ai/generate-hashtags', { content, count });
  return res.data;
};

export const getDrafts = async () => {
  const res = await api.get('/api/v1/drafts');
  return res.data;
};

export const saveDraft = async (draftData) => {
  const res = await api.post('/api/v1/drafts', draftData);
  return res.data;
};

export const deleteDraft = async (id) => {
  const res = await api.delete(`/api/v1/drafts/${id}`);
  return res.data;
};

export const getAnalyticsOverview = async () => {
  const res = await api.get('/api/v1/analytics/overview');
  return res.data;
};

// --- New GitHub & System API Helpers ---

export const getDashboardStats = async () => {
  const res = await api.get('/api/v1/system/dashboard-stats');
  return res.data;
};

export const getGitHubEvents = async () => {
  const res = await api.get('/api/v1/github/events');
  return res.data;
};

export const getRepositories = async () => {
  const res = await api.get('/api/v1/github/repos');
  return res.data;
};

export const simulateWebhookEvent = async (payload) => {
  const res = await api.post('/api/v1/github/test-event', payload);
  return res.data;
};

export const getFailedJobs = async () => {
  const res = await api.get('/api/v1/system/failed-jobs');
  return res.data;
};

export const retryFailedJob = async (jobId) => {
  const res = await api.post(`/api/v1/system/retry-job/${jobId}`);
  return res.data;
};

export const getSystemLogs = async () => {
  const res = await api.get('/api/v1/system/logs');
  return res.data;
};

export const updateSystemSettings = async (settings) => {
  const res = await api.post('/api/v1/system/settings', settings);
  return res.data;
};

export const sendTestNotification = async (channel = 'all') => {
  const res = await api.post('/api/v1/system/test-notification', { channel });
  return res.data;
};

export default api;
