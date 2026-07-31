/**
 * LinkedIn Post Main Component - Comprehensive Test Suite
 * Tests: publishPost(), getProfile(), refreshAccessToken(), registerImageUpload()
 *
 * Architecture (REST-first dual-API strategy):
 *  1. publishPost() tries LinkedIn REST Posts API first (rest/posts, v202501)
 *  2. Falls back to UGC Posts API (/v2/ugcPosts) if REST fails
 *  3. Token error on any path → sandbox fallback (or throw if forceReal=true)
 *
 * Mocking strategy:
 *  - All live tests pass authorUrn explicitly (bypasses resolveAuthorUrn() fetch)
 *  - REST API mock returns failure → UGC mock returns success
 *  - node-fetch is mocked via jest.mock factory
 */

// ─── Mock node-fetch and fs before any requires ───────────────────────────
const mockFetch = jest.fn();

jest.mock('node-fetch', () => mockFetch);
jest.mock('fs');

const fs = require('fs');

// Set default fs behaviour (overridden per describe as needed)
fs.existsSync = jest.fn().mockReturnValue(false);
fs.readFileSync = jest.fn().mockReturnValue(Buffer.from(''));

// Helper: build a resolved fetch-like response object
function mockOkResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: jest.fn().mockReturnValue(null) },
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

// Helper: mock REST fail (NONEXISTENT_VERSION 426) then UGC success
function mockRestFailUgcSuccess(ugcBody = { id: 'urn:li:ugcPost:default' }) {
  mockFetch
    .mockResolvedValueOnce(
      mockOkResponse(JSON.stringify({ status: 426, code: 'NONEXISTENT_VERSION' }), 426)
    )
    .mockResolvedValueOnce(mockOkResponse(ugcBody, 201));
}

// Test URNs — authorUrn is passed explicitly so resolveAuthorUrn() is not called
const TEST_PERSON_URN = 'urn:li:person:testUser123';
const TEST_MEMBER_URN = 'urn:li:member:testUser123';

// Require linkedinService ONCE at top level — mocks are already in place
const linkedinService = require('../services/linkedinService');

beforeEach(() => {
  mockFetch.mockReset();
  fs.existsSync.mockReturnValue(false);
  fs.readFileSync.mockReturnValue(Buffer.from(''));
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. SANDBOX / SIMULATION MODE
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – Sandbox / Simulation Mode', () => {
  it('should return sandbox result when simulate=true', async () => {
    const result = await linkedinService.publishPost({
      commentary: '🚀 New GitHub release is live! Exciting updates ahead.',
      postType: 'text',
      simulate: true,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('sandbox');
    expect(result.postId).toMatch(/^sim_post_/);
    expect(result.postUrl).toContain('https://www.linkedin.com/feed/update/');
    expect(result.publishedAt).toBeDefined();
    // No real API calls should be made
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should automatically fall back to sandbox when no accessToken is provided', async () => {
    const result = await linkedinService.publishPost({
      commentary: 'Automated GitHub event detected!',
      postType: 'text',
      // no accessToken, no simulate flag
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('sandbox');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should include a valid ISO timestamp in sandbox result', async () => {
    const result = await linkedinService.publishPost({ simulate: true, commentary: 'Test post' });
    const parsed = new Date(result.publishedAt);
    expect(parsed.toString()).not.toBe('Invalid Date');
  });

  it('should return unique postIds for multiple sandbox calls', async () => {
    const r1 = await linkedinService.publishPost({ simulate: true, commentary: 'Post 1' });
    await new Promise(r => setTimeout(r, 2));
    const r2 = await linkedinService.publishPost({ simulate: true, commentary: 'Post 2' });
    expect(r1.postId).not.toBe(r2.postId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. TEXT POST – LIVE MODE (REST → UGC fallback)
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – Text Post (Live)', () => {
  it('should succeed via REST Posts API when it returns 201', async () => {
    // REST API succeeds → returns 201 with x-restli-id header
    const restOk = {
      ...mockOkResponse({}, 201),
      headers: { get: jest.fn().mockReturnValue('urn:li:share:987654321') },
    };
    mockFetch.mockResolvedValueOnce(restOk);

    const result = await linkedinService.publishPost({
      accessToken: 'fake_live_token',
      authorUrn: TEST_PERSON_URN,
      commentary: '🔧 Deployed a new feature to production today.',
      postType: 'text',
      simulate: false,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.linkedin.com/rest/posts');
    expect(opts.method).toBe('POST');
    expect(opts.headers['LinkedIn-Version']).toMatch(/^\d{6}$/);

    const body = JSON.parse(opts.body);
    expect(body.author).toBe(TEST_PERSON_URN);
    expect(body.commentary).toBe('🔧 Deployed a new feature to production today.');
    expect(body.visibility).toBe('PUBLIC');

    expect(result.success).toBe(true);
    expect(result.mode).toBe('live');
    expect(result.postId).toBe('urn:li:share:987654321');
  });

  it('should fall back to UGC Posts API when REST API fails with non-token error', async () => {
    mockRestFailUgcSuccess({ id: 'urn:li:ugcPost:fallback111' });

    const result = await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Testing UGC fallback path',
      postType: 'text',
      simulate: false,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // First call: REST Posts
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.linkedin.com/rest/posts');
    // Second call: UGC Posts fallback
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.linkedin.com/v2/ugcPosts');

    expect(result.success).toBe(true);
    expect(result.mode).toBe('live');
    expect(result.postId).toBe('urn:li:ugcPost:fallback111');
  });

  it('should use urn:li:person: format (not urn:li:member:) in UGC fallback body', async () => {
    mockRestFailUgcSuccess({ id: 'urn:li:ugcPost:urncheck' });

    await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,   // urn:li:person:testUser123
      commentary: 'URN format check',
      postType: 'text',
      simulate: false,
    });

    const ugcBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    // LinkedIn's Posts APIs (REST and UGC) both require urn:li:person: as the
    // author — urn:li:member: is not a valid URN type here and LinkedIn
    // rejects it with a 403 "Data Processing Exception ... [/author]".
    expect(ugcBody.author).toBe(TEST_PERSON_URN);
    expect(ugcBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('NONE');
    expect(ugcBody.lifecycleState).toBe('PUBLISHED');
    expect(ugcBody.visibility['com.linkedin.ugc.MemberNetworkVisibility']).toBe('PUBLIC');
  });

  it('should throw when both REST and UGC APIs fail with non-token errors', async () => {
    mockFetch
      .mockResolvedValueOnce(mockOkResponse('REST error', 500))
      .mockResolvedValueOnce(mockOkResponse('UGC error', 500));

    await expect(
      linkedinService.publishPost({
        accessToken: 'token',
        authorUrn: TEST_PERSON_URN,
        commentary: 'Will fail',
        simulate: false,
      })
    ).rejects.toThrow('LinkedIn Posts API Error');
  });

  it('should include X-Restli-Protocol-Version header in REST request', async () => {
    const restOk = {
      ...mockOkResponse({}, 201),
      headers: { get: jest.fn().mockReturnValue('urn:li:share:222') },
    };
    mockFetch.mockResolvedValueOnce(restOk);

    await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Header check test',
      simulate: false,
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['X-Restli-Protocol-Version']).toBe('2.0.0');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer token');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. ARTICLE / LINK POST
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – Article / Link Post', () => {
  it('should post article type directly via UGC API and include GitHub URL in media array', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'urn:li:ugcPost:333' }, 201));

    const result = await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Check out our latest repo!',
      postType: 'article',
      articleUrl: 'https://github.com/parvej-alam/ai-social-manager',
      articleTitle: 'AI Social Media Manager',
      articleDescription: 'Automated LinkedIn posting from GitHub events.',
      simulate: false,
    });

    expect(result.success).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const shareContent = body.specificContent['com.linkedin.ugc.ShareContent'];
    expect(shareContent.shareMediaCategory).toBe('ARTICLE');
    expect(shareContent.media[0].originalUrl).toBe('https://github.com/parvej-alam/ai-social-manager');
    expect(shareContent.media[0].title.text).toBe('AI Social Media Manager');
    expect(shareContent.media[0].description.text).toBe('Automated LinkedIn posting from GitHub events.');
  });

  it('should use default title when articleTitle is not provided', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'urn:li:ugcPost:334' }, 201));

    await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Article with no title',
      postType: 'article',
      articleUrl: 'https://github.com/user/repo',
      simulate: false,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const media = body.specificContent['com.linkedin.ugc.ShareContent'].media[0];
    expect(media.title.text).toBe('GitHub Repository Link');
  });

  it('should treat postType=text with articleUrl set as article post (auto-detection)', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'urn:li:ugcPost:444' }, 201));

    await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Shared link',
      articleUrl: 'https://github.com/user/repo',
      simulate: false,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('ARTICLE');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. IMAGE POST
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – Image Post', () => {
  beforeEach(() => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'));
  });

  it('should register image, upload binary, and publish image post (3 API calls)', async () => {
    // 1. registerImageUpload response
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({
        value: {
          uploadMechanism: {
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
              uploadUrl: 'https://api.linkedin.com/mediaUpload/uploadXYZ',
            },
          },
          asset: 'urn:li:digitalmediaAsset:image_001',
        },
      }, 200)
    );
    // 2. uploadBinaryFile (PUT) response
    mockFetch.mockResolvedValueOnce(mockOkResponse('', 201));
    // 3. ugcPost publish response
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'urn:li:ugcPost:img_555' }, 201));

    const result = await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Sharing a screenshot of our new feature!',
      postType: 'single_image',
      mediaItems: [
        { filePath: '/fake/path/screenshot.png', mimeType: 'image/png', altText: 'New Feature Screenshot' },
      ],
      simulate: false,
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
    expect(result.postId).toBe('urn:li:ugcPost:img_555');
    expect(result.mode).toBe('live');

    // Verify the UGC post body has IMAGE category
    const ugcBody = JSON.parse(mockFetch.mock.calls[2][1].body);
    expect(ugcBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('IMAGE');
    expect(ugcBody.specificContent['com.linkedin.ugc.ShareContent'].media[0].media).toBe('urn:li:digitalmediaAsset:image_001');
  });

  it('should skip upload when file does not exist and post with NONE media category', async () => {
    fs.existsSync.mockReturnValue(false);
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'urn:li:ugcPost:img_nofile' }, 201));

    const result = await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'No file found',
      postType: 'single_image',
      mediaItems: [{ filePath: '/nonexistent/file.png' }],
      simulate: false,
    });

    // Only 1 API call (ugcPost), no registerUpload or PUT
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('NONE');
    expect(result.success).toBe(true);
  });

  it('should handle empty mediaItems array and post with NONE category', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ id: 'urn:li:ugcPost:img_empty' }, 201));

    const result = await linkedinService.publishPost({
      accessToken: 'token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'No images provided',
      postType: 'single_image',
      mediaItems: [],
      simulate: false,
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should throw LinkedIn Image Post API Error when ugcPost fails', async () => {
    fs.existsSync.mockReturnValue(false);
    mockFetch.mockResolvedValueOnce(mockOkResponse('Forbidden', 403));

    await expect(
      linkedinService.publishPost({
        accessToken: 'token',
        authorUrn: TEST_PERSON_URN,
        commentary: 'Image post failure',
        postType: 'single_image',
        mediaItems: [],
        simulate: false,
      })
    ).rejects.toThrow('LinkedIn Image Post API Error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. getProfile()
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – getProfile()', () => {
  it('should return profile data with correct authorUrn when API succeeds', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({
        sub: 'MEMBER_ID_XYZ',
        name: 'Parvej Alam',
        given_name: 'Parvej',
        family_name: 'Alam',
        email: 'parvej@example.com',
        picture: 'https://media.licdn.com/dms/image/profile.jpg',
      }, 200)
    );

    const profile = await linkedinService.getProfile('valid_token');

    expect(profile.memberId).toBe('MEMBER_ID_XYZ');
    expect(profile.displayName).toBe('Parvej Alam');
    expect(profile.authorUrn).toBe('urn:li:person:MEMBER_ID_XYZ');
    expect(profile.email).toBe('parvej@example.com');
    expect(profile.picture).toBe('https://media.licdn.com/dms/image/profile.jpg');
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.linkedin.com/v2/userinfo');
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer valid_token');
  });

  it('should return fallback profile when API returns 401 non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse('Unauthorized', 401));

    const profile = await linkedinService.getProfile('bad_token');

    expect(profile.displayName).toBe('LinkedIn User');
    expect(profile.authorUrn).toBe('urn:li:person:me');
    expect(profile.memberId).toBe('me');
  });

  it('should return fallback profile when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error: connection refused'));

    const profile = await linkedinService.getProfile('any_token');

    expect(profile.displayName).toBe('LinkedIn User');
    expect(profile.authorUrn).toBe('urn:li:person:me');
  });

  it('should concatenate given_name + family_name when name field is missing', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({
        sub: 'ID_789',
        given_name: 'Parvej',
        family_name: 'Alam',
        // deliberately no 'name' field
      }, 200)
    );

    const profile = await linkedinService.getProfile('token');

    expect(profile.displayName).toBe('Parvej Alam');
    expect(profile.authorUrn).toBe('urn:li:person:ID_789');
  });

  it('should return empty string for picture if not provided by API', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ sub: 'ID_000', name: 'Test User' }, 200)
    );

    const profile = await linkedinService.getProfile('token');
    expect(profile.picture).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. refreshAccessToken()
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – refreshAccessToken()', () => {
  it('should return new access token on successful refresh', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({
        access_token: 'new_access_token_abc',
        expires_in: 5184000,
        refresh_token: 'new_refresh_token_xyz',
      }, 200)
    );

    const result = await linkedinService.refreshAccessToken('old_refresh_token');

    expect(result.accessToken).toBe('new_access_token_abc');
    expect(result.expiresIn).toBe(5184000);
    expect(result.refreshToken).toBe('new_refresh_token_xyz');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://www.linkedin.com/oauth/v2/accessToken');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(opts.body).toContain('grant_type=refresh_token');
    expect(opts.body).toContain('refresh_token=old_refresh_token');
  });

  it('should fall back to original refresh token if API does not return a new one', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({ access_token: 'new_token', expires_in: 3600 }, 200)
    );

    const result = await linkedinService.refreshAccessToken('my_old_refresh_token');
    expect(result.refreshToken).toBe('my_old_refresh_token');
    expect(result.accessToken).toBe('new_token');
  });

  it('should throw "Refresh token is required" if no token is provided', async () => {
    await expect(linkedinService.refreshAccessToken(null)).rejects.toThrow('Refresh token is required');
    await expect(linkedinService.refreshAccessToken(undefined)).rejects.toThrow('Refresh token is required');
  });

  it('should throw "LinkedIn OAuth Token Refresh Failed" when API returns failure', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse('invalid_grant', 400));

    await expect(linkedinService.refreshAccessToken('expired_refresh_token')).rejects.toThrow(
      'LinkedIn OAuth Token Refresh Failed'
    );
  });

  it('should throw if network error occurs during token refresh', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(linkedinService.refreshAccessToken('some_token')).rejects.toThrow('ECONNREFUSED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. registerImageUpload()
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – registerImageUpload()', () => {
  it('should return uploadUrl and assetUrn from LinkedIn media registration API', async () => {
    mockFetch.mockResolvedValueOnce(
      mockOkResponse({
        value: {
          uploadMechanism: {
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
              uploadUrl: 'https://api.linkedin.com/mediaUpload/abc123',
            },
          },
          asset: 'urn:li:digitalmediaAsset:ASSET_001',
        },
      }, 200)
    );

    const result = await linkedinService.registerImageUpload('token', 'urn:li:person:abc');

    expect(result.uploadUrl).toBe('https://api.linkedin.com/mediaUpload/abc123');
    expect(result.assetUrn).toBe('urn:li:digitalmediaAsset:ASSET_001');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.registerUploadRequest.owner).toBe('urn:li:person:abc');
    expect(body.registerUploadRequest.recipes).toContain('urn:li:digitalmediaRecipe:feedshare-image');
    expect(body.registerUploadRequest.serviceRelationships[0].relationshipType).toBe('OWNER');
  });

  it('should throw "Failed to register image upload" error when API returns 403', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse('Forbidden', 403));

    await expect(
      linkedinService.registerImageUpload('bad_token', 'urn:li:person:x')
    ).rejects.toThrow('Failed to register image upload');
  });

  it('should throw if network error occurs during image registration', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(
      linkedinService.registerImageUpload('token', 'urn:li:person:abc')
    ).rejects.toThrow('Network timeout');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. TOKEN ERROR HANDLING (REVOKED / EXPIRED) – AUTO SANDBOX FALLBACK
// ═══════════════════════════════════════════════════════════════════════════
describe('LinkedIn Post – Token Error Auto-Sandbox Fallback', () => {
  it('should auto-sandbox when REST API returns REVOKED_ACCESS_TOKEN (code 65601)', async () => {
    const revokedBody = JSON.stringify({
      status: 401,
      serviceErrorCode: 65601,
      code: 'REVOKED_ACCESS_TOKEN',
      message: 'The token used in the request has been revoked by the user',
    });
    mockFetch.mockResolvedValueOnce(mockOkResponse(revokedBody, 401));

    const result = await linkedinService.publishPost({
      accessToken: 'revoked_token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Post with revoked token',
      postType: 'text',
      simulate: false,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('sandbox');
    expect(result.tokenError).toBe(true);
    expect(result.postId).toMatch(/^sim_post_/);
    expect(result.message).toContain('token issue');
  });

  it('should auto-sandbox when REST API returns EXPIRED_ACCESS_TOKEN (code 65600)', async () => {
    const expiredBody = JSON.stringify({
      status: 401,
      serviceErrorCode: 65600,
      code: 'EXPIRED_ACCESS_TOKEN',
      message: 'Access token expired',
    });
    mockFetch.mockResolvedValueOnce(mockOkResponse(expiredBody, 401));

    const result = await linkedinService.publishPost({
      accessToken: 'expired_token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Post with expired token',
      simulate: false,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('sandbox');
    expect(result.tokenError).toBe(true);
  });

  it('should auto-sandbox for image post when token is revoked', async () => {
    fs.existsSync.mockReturnValue(false);
    const revokedBody = JSON.stringify({
      status: 401,
      serviceErrorCode: 65601,
      code: 'REVOKED_ACCESS_TOKEN',
      message: 'Token revoked',
    });
    mockFetch.mockResolvedValueOnce(mockOkResponse(revokedBody, 401));

    const result = await linkedinService.publishPost({
      accessToken: 'revoked_token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'Image post with revoked token',
      postType: 'single_image',
      mediaItems: [],
      simulate: false,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('sandbox');
    expect(result.tokenError).toBe(true);
  });

  it('should still throw for non-token API errors (e.g. 500) after both REST and UGC fail', async () => {
    mockFetch
      .mockResolvedValueOnce(mockOkResponse('Internal Server Error', 500))
      .mockResolvedValueOnce(mockOkResponse('Internal Server Error', 500));

    await expect(
      linkedinService.publishPost({
        accessToken: 'token',
        authorUrn: TEST_PERSON_URN,
        commentary: 'Will hard-fail',
        simulate: false,
      })
    ).rejects.toThrow('LinkedIn Posts API Error');
  });

  it('should sandbox fallback postUrl contain linkedin.com/feed/update/', async () => {
    const revokedBody = JSON.stringify({ status: 401, serviceErrorCode: 65601, code: 'REVOKED_ACCESS_TOKEN' });
    mockFetch.mockResolvedValueOnce(mockOkResponse(revokedBody, 401));

    const result = await linkedinService.publishPost({
      accessToken: 'bad_token',
      authorUrn: TEST_PERSON_URN,
      commentary: 'URL check',
      simulate: false,
    });

    expect(result.postUrl).toContain('https://www.linkedin.com/feed/update/');
    expect(result.publishedAt).toBeDefined();
  });
});
