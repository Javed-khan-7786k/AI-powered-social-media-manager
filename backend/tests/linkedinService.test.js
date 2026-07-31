const linkedinService = require('../services/linkedinService');

describe('LinkedIn Integration Service Unit Tests', () => {
  it('should publish post in Sandbox mode when simulate is true', async () => {
    const postData = {
      commentary: '🚀 Exciting GitHub update released for our community!',
      postType: 'text',
      simulate: true
    };

    const result = await linkedinService.publishPost(postData);

    expect(result.success).toBe(true);
    expect(result.mode).toBe('sandbox');
    expect(result.postId).toContain('sim_post_');
    expect(result.postUrl).toContain('https://www.linkedin.com/feed/update/');
  });

  it('should format fallback profile info when token is invalid or missing', async () => {
    const profile = await linkedinService.getProfile('invalid_token_xyz');
    expect(profile.displayName).toBe('LinkedIn User');
    expect(profile.authorUrn).toBe('urn:li:person:me');
  });
});
