const aiService = require('../services/aiService');

describe('AI Content Generator Service Unit Tests', () => {
  it('should build structured fallback LinkedIn post when OpenAI API key is unconfigured', async () => {
    const eventData = {
      eventType: 'push',
      repoName: 'smart-social-bot',
      repoOwner: 'my-org',
      repoUrl: 'https://github.com/my-org/smart-social-bot',
      author: 'dev-lead',
      branch: 'main',
      commitMessage: 'feat: add automated AI LinkedIn post generator',
      changedFileCount: 3,
      modifiedFiles: ['src/services/aiService.ts', 'package.json']
    };

    const repoInfo = {
      language: 'TypeScript',
      starsCount: 15,
      forksCount: 4
    };

    const result = await aiService.generateGitHubUpdatePost(eventData, repoInfo);

    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('technicalExplanation');
    expect(result).toHaveProperty('keyFeatures');
    expect(result).toHaveProperty('businessImpact');
    expect(result).toHaveProperty('hashtags');
    expect(result).toHaveProperty('formattedPost');

    expect(Array.isArray(result.hashtags)).toBe(true);
    expect(result.hashtags.length).toBeGreaterThan(0);
    expect(result.formattedPost).toContain('smart-social-bot');
  });

  it('should format release events with release highlights', async () => {
    const eventData = {
      eventType: 'release',
      repoName: 'smart-social-bot',
      releaseName: 'v2.0.0 Production Release',
      repoUrl: 'https://github.com/my-org/smart-social-bot',
      author: 'dev-lead'
    };

    const result = await aiService.generateGitHubUpdatePost(eventData);
    expect(result.title).toContain('Release');
    expect(result.summary).toContain('v2.0.0 Production Release');
  });

  it('should generate trending hashtags based on content', async () => {
    const tags = await aiService.generateHashtags('Artificial Intelligence and Automated Engineering', 5);
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBe(5);
  });
});
