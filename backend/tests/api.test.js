const request = require('supertest');
const app = require('../server');

describe('REST API Endpoints Integration Tests', () => {
  it('GET /auth/status - LinkedIn Connection Status', async () => {
    const res = await request(app).get('/auth/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('authenticated');
  });

  it('POST /api/v1/ai/generate-caption - AI Generator', async () => {
    const res = await request(app)
      .post('/api/v1/ai/generate-caption')
      .send({ prompt: 'Building scalable AI applications in 2026', tone: 'Startup' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.caption).toContain('Building scalable AI');
  });

  it('POST /api/v1/github/test-event - Simulated GitHub Event Webhook', async () => {
    const res = await request(app)
      .post('/api/v1/github/test-event')
      .send({
        eventType: 'push',
        repoName: 'test-repo',
        commitMessage: 'feat: add real-time webhook listener'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.repository).toBe('test-repo');
  });

  it('POST /api/v1/drafts - Save Post Draft', async () => {
    const res = await request(app)
      .post('/api/v1/drafts')
      .send({ title: 'Draft Strategy', content: 'Exciting product updates coming soon!' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/posts/upload - Direct Post (Sandbox Mode)', async () => {
    const res = await request(app)
      .post('/api/v1/posts/upload')
      .send({
        content: 'Innovation and execution are the core pillars of technology development.',
        author: 'Javed Khan',
        hashtags: ['Tech', 'Innovation'],
        simulate: true,
      });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/analytics/overview - Analytics Metrics', async () => {
    const res = await request(app).get('/api/v1/analytics/overview');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/system/dashboard-stats - System Stats', async () => {
    const res = await request(app).get('/api/v1/system/dashboard-stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
  });
});
