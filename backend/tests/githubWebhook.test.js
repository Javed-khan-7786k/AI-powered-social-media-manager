const crypto = require('crypto');
const githubService = require('../services/githubService');

describe('GitHub Webhook Service Unit Tests', () => {
  const secret = 'test_webhook_secret_12345';
  const payload = JSON.stringify({
    repository: {
      name: 'ai-automation-repo',
      full_name: 'owner/ai-automation-repo',
      owner: { login: 'owner' },
      html_url: 'https://github.com/owner/ai-automation-repo',
      language: 'TypeScript',
      stargazers_count: 50,
      forks_count: 10,
      open_issues_count: 2
    },
    sender: { login: 'octocat' }
  });
  const payloadBuffer = Buffer.from(payload);

  it('should generate and verify valid HMAC-SHA256 signature', () => {
    const hmac = crypto.createHmac('sha256', secret);
    const validSignature = 'sha256=' + hmac.update(payloadBuffer).digest('hex');

    const result = githubService.verifyWebhookSignature(payloadBuffer, validSignature, secret);
    expect(result).toBe(true);
  });

  it('should reject invalid HMAC signature', () => {
    const invalidSignature = 'sha256=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = githubService.verifyWebhookSignature(payloadBuffer, invalidSignature, secret);
    expect(result).toBe(false);
  });

  it('should parse PUSH event payload correctly', () => {
    const pushPayload = {
      repository: { name: 'my-app', full_name: 'user/my-app', html_url: 'https://github.com/user/my-app' },
      sender: { login: 'user' },
      ref: 'refs/heads/main',
      head_commit: {
        id: 'commit123',
        message: 'feat: add automated AI LinkedIn posting feature',
        author: { name: 'user' },
        added: ['src/index.ts'],
        modified: ['README.md'],
        removed: []
      }
    };

    const parsed = githubService.parseWebhookEvent('push', pushPayload);
    expect(parsed.eventType).toBe('push');
    expect(parsed.repoName).toBe('my-app');
    expect(parsed.branch).toBe('main');
    expect(parsed.commitSha).toBe('commit123');
    expect(parsed.commitMessage).toBe('feat: add automated AI LinkedIn posting feature');
    expect(parsed.changedFileCount).toBe(2);
  });

  it('should parse PULL REQUEST event payload correctly', () => {
    const prPayload = {
      repository: { name: 'my-app', full_name: 'user/my-app' },
      sender: { login: 'contributor' },
      pull_request: {
        title: 'Fix race condition in queue processor',
        html_url: 'https://github.com/user/my-app/pull/42',
        head: { ref: 'fix/queue-race', sha: 'sha999' },
        user: { login: 'contributor' },
        changed_files: 5
      }
    };

    const parsed = githubService.parseWebhookEvent('pull_request', prPayload);
    expect(parsed.eventType).toBe('pull_request');
    expect(parsed.prTitle).toBe('Fix race condition in queue processor');
    expect(parsed.changedFileCount).toBe(5);
  });

  it('should parse RELEASE event payload correctly', () => {
    const releasePayload = {
      repository: { name: 'my-app', full_name: 'user/my-app' },
      sender: { login: 'maintainer' },
      release: {
        name: 'v2.0.0 Stable',
        tag_name: 'v2.0.0',
        html_url: 'https://github.com/user/my-app/releases/tag/v2.0.0',
        body: 'Major production update with AI features'
      }
    };

    const parsed = githubService.parseWebhookEvent('release', releasePayload);
    expect(parsed.eventType).toBe('release');
    expect(parsed.releaseName).toBe('v2.0.0 Stable');
  });

  it('should parse STAR event payload correctly', () => {
    const starPayload = {
      repository: { name: 'my-app', full_name: 'user/my-app' },
      sender: { login: 'stargazer123' }
    };

    const parsed = githubService.parseWebhookEvent('star', starPayload);
    expect(parsed.eventType).toBe('star');
    expect(parsed.author).toBe('stargazer123');
  });
});
