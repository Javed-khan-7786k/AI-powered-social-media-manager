const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const logger = require('./loggerService');

// LinkedIn API token error codes that indicate an expired/revoked token
const TOKEN_ERROR_CODES = [
  'REVOKED_ACCESS_TOKEN',
  'EXPIRED_ACCESS_TOKEN',
  'ACCESS_TOKEN_VALIDATION_FAILED',
  'UNAUTHORIZED_SCOPE',
];
const TOKEN_ERROR_SERVICE_CODES = [65600, 65601, 65602];

// LinkedIn's REST API requires a "LinkedIn-Version: YYYYMM" header, and only keeps
// roughly the last 12 months of versions active — a hardcoded value silently goes
// stale and starts returning 426 NONEXISTENT_VERSION a year later. Default to last
// month (this month's version isn't always active yet) unless overridden via env.
function getLinkedInApiVersion() {
  if (process.env.LINKEDIN_API_VERSION) return process.env.LINKEDIN_API_VERSION;
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

class LinkedInService {
  /**
   * Resolve user profile details and author URN from LinkedIn API
   */
  async getProfile(accessToken) {
    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LinkedIn Profile API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      return {
        memberId: data.sub,
        displayName: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
        givenName: data.given_name || '',
        familyName: data.family_name || '',
        email: data.email || '',
        picture: data.picture || '',
        authorUrn: `urn:li:person:${data.sub}`,
      };
    } catch (err) {
      logger.warn(`Failed to fetch userinfo from LinkedIn API, using fallback member URN: ${err.message}`);
      return {
        memberId: 'me',
        displayName: 'LinkedIn User',
        authorUrn: 'urn:li:person:me',
        picture: '',
      };
    }
  }

  /**
   * Resolve authorUrn from LinkedIn userinfo endpoint.
   * Both the REST Posts API and the UGC Posts API expect the SAME
   * urn:li:person:{sub} value as `author` — there is no separate
   * "urn:li:member" URN type for posting. (An earlier version of this
   * code rewrote it to urn:li:member:{sub} for the UGC fallback, which
   * LinkedIn rejects with a 403 "Data Processing Exception ... [/author]".)
   */
  async resolveAuthorUrn(token) {
    try {
      const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const sub = profileData.sub;
        if (sub) {
          return {
            sub,
            personUrn: `urn:li:person:${sub}`,
            // kept for backward-compat with any callers still reading .memberUrn —
            // intentionally the SAME value, since urn:li:member is not a real
            // LinkedIn URN type for post authorship.
            memberUrn: `urn:li:person:${sub}`,
          };
        }
      }
    } catch (err) {
      logger.warn(`Failed to fetch userinfo for authorUrn: ${err.message}`);
    }
    return null;
  }

  /**
   * Refresh OAuth 2.0 Access Token using Refresh Token
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) throw new Error('Refresh token is required');
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('client_id', process.env.LINKEDIN_CLIENT_ID || '');
      params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET || '');

      const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LinkedIn OAuth Token Refresh Failed: ${errText}`);
      }

      const data = await res.json();
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token || refreshToken
      };
    } catch (err) {
      logger.error(`Error refreshing LinkedIn token: ${err.message}`);
      throw err;
    }
  }

  /**
   * Register image upload with LinkedIn UGC API
   */
  async registerImageUpload(accessToken, authorUrn) {
    const payload = {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: authorUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    };

    const res = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to register image upload: ${text}`);
    }

    const data = await res.json();
    const uploadUrl = data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const assetUrn = data.value.asset;
    return { uploadUrl, assetUrn };
  }

  /**
   * Upload binary file buffer to LinkedIn upload URL
   */
  async uploadBinaryFile(uploadUrl, filePath, mimeType) {
    const fileBuffer = fs.readFileSync(filePath);
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType || 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to upload binary file to LinkedIn upload URL: ${errText}`);
    }

    return true;
  }

  /**
   * Parse a LinkedIn API error body and return { isTokenError, code, message }
   */
  _parseLinkedInError(errText) {
    try {
      const parsed = JSON.parse(errText);
      const code = parsed.code || '';
      const svcCode = parsed.serviceErrorCode || 0;
      const isTokenError =
        TOKEN_ERROR_CODES.includes(code) ||
        TOKEN_ERROR_SERVICE_CODES.includes(svcCode) ||
        parsed.status === 401;
      return { isTokenError, code, svcCode, message: parsed.message || errText };
    } catch {
      return { isTokenError: false, code: '', svcCode: 0, message: errText };
    }
  }

  /**
   * Return a sandbox fallback OR throw a re-auth error depending on context.
   * forceReal=true  → throw LINKEDIN_TOKEN_REVOKED so frontend prompts re-auth
   * forceReal=false → silently fall back to sandbox (for automated webhook posts)
   */
  _sandboxFallback(reason, forceReal = false) {
    if (forceReal) {
      const err = new Error(
        `LINKEDIN_TOKEN_REVOKED: Your LinkedIn access token is expired or revoked (${reason}). ` +
        `Please re-connect your LinkedIn account at http://localhost:3000/auth/linkedin`
      );
      err.code = 'LINKEDIN_TOKEN_REVOKED';
      err.reason = reason;
      throw err;
    }
    const simId = `sim_post_${Date.now()}`;
    logger.warn(`LinkedIn token error – falling back to sandbox mode. Reason: ${reason}`);
    return {
      success: true,
      mode: 'sandbox',
      tokenError: true,
      postId: simId,
      postUrl: `https://www.linkedin.com/feed/update/urn:li:share:${simId}`,
      message: `Sandbox mode active (token issue: ${reason}). Re-connect LinkedIn to publish live.`,
      publishedAt: new Date().toISOString(),
    };
  }

  /**
   * Publish Text / Quote / Image / Article / Link Post to LinkedIn API
   *
   * Strategy (from user's working code):
   *  1. Try LinkedIn REST Posts API first (rest/posts with LinkedIn-Version: 202304)
   *  2. Fallback to UGC Posts API if rest/posts fails
   *  3. For image posts: register upload → PUT binary → ugcPosts
   *  4. forceReal=true throws on token errors instead of sandbox fallback
   */
  async publishPost({
    accessToken,
    authorUrn,
    commentary,
    postType = 'text',
    mediaItems = [],
    articleUrl = '',
    articleTitle = '',
    articleDescription = '',
    simulate = false,
    forceReal = false,
  }) {
    if (!accessToken && !simulate) {
      // Default to sandbox mode if no live access token is set
      simulate = true;
    }

    if (simulate) {
      logger.info('Executing post publication in Sandbox / Simulation mode.');
      const simId = `sim_post_${Date.now()}`;
      return {
        success: true,
        mode: 'sandbox',
        postId: simId,
        postUrl: `https://www.linkedin.com/feed/update/urn:li:share:${simId}`,
        message: 'Post successfully published in simulated sandbox mode.',
        publishedAt: new Date().toISOString(),
      };
    }

    // Resolve authorUrn. Both REST and UGC Posts APIs use the same
    // urn:li:person:{sub} value as `author`.
    let personUrn = authorUrn || process.env.LINKEDIN_AUTHOR_URN || null;

    if (!personUrn) {
      const resolved = await this.resolveAuthorUrn(accessToken);
      if (resolved) {
        personUrn = resolved.personUrn;
      } else {
        // Can't resolve URN without a valid token — throw so user is prompted to re-auth
        const err = new Error(
          'LINKEDIN_TOKEN_REVOKED: Unable to resolve LinkedIn member ID. ' +
          'Please re-connect your account at http://localhost:3000/auth/linkedin'
        );
        err.code = 'LINKEDIN_TOKEN_REVOKED';
        throw err;
      }
    }

    // ── 1. ARTICLE / LINK POST ────────────────────────────────────────────
    if (postType === 'article' || articleUrl) {
      const ugcPayload = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: commentary },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                originalUrl: articleUrl,
                title: { text: articleTitle || 'GitHub Repository Link' },
                description: { text: articleDescription || 'View updated repository and codebase on GitHub.' }
              }
            ]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const ugcRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(ugcPayload),
      });

      if (ugcRes.ok) {
        const data = await ugcRes.json();
        return {
          success: true,
          mode: 'live',
          postId: data.id,
          postUrl: `https://www.linkedin.com/feed/update/${data.id}`,
          publishedAt: new Date().toISOString(),
        };
      } else {
        const errText = await ugcRes.text();
        const { isTokenError, code } = this._parseLinkedInError(errText);
        if (isTokenError) return this._sandboxFallback(code || `HTTP ${ugcRes.status}`, forceReal);
        // For non-token article errors, fall through to text post path
      }
    }

    // ── 2. IMAGE POST ──────────────────────────────────────────────────────
    if (postType === 'single_image' || postType === 'multi_image') {
      const uploadedMediaAssets = [];

      for (const item of mediaItems) {
        if (item.filePath && fs.existsSync(item.filePath)) {
          const { uploadUrl, assetUrn } = await this.registerImageUpload(accessToken, personUrn);
          await this.uploadBinaryFile(uploadUrl, item.filePath, item.mimeType);
          uploadedMediaAssets.push({
            status: 'READY',
            description: { text: item.altText || item.filename || 'Post Image' },
            media: assetUrn,
            title: { text: item.filename || 'Image' },
          });
        }
      }

      const ugcPayload = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: commentary },
            shareMediaCategory: uploadedMediaAssets.length > 0 ? 'IMAGE' : 'NONE',
            media: uploadedMediaAssets,
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const ugcRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(ugcPayload),
      });

      if (!ugcRes.ok) {
        const ugcErr = await ugcRes.text();
        const { isTokenError, code } = this._parseLinkedInError(ugcErr);
        if (isTokenError) return this._sandboxFallback(code || `HTTP ${ugcRes.status}`, forceReal);
        throw new Error(`LinkedIn Image Post API Error: ${ugcErr}`);
      }

      const data = await ugcRes.json();
      return {
        success: true,
        mode: 'live',
        postId: data.id,
        postUrl: `https://www.linkedin.com/feed/update/${data.id}`,
        publishedAt: new Date().toISOString(),
      };
    }

    // ── 3. DEFAULT TEXT / QUOTE POST ──────────────────────────────────────
    // Strategy: Try LinkedIn REST Posts API first (personUrn), fallback to UGC Posts API (memberUrn)
    const restPayload = {
      author: personUrn,           // REST Posts API: urn:li:person:SUB
      commentary: commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
    };

    const restRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': getLinkedInApiVersion(),
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(restPayload),
    });

    if (restRes.ok) {
      // REST Posts API returns 201 with x-restli-id header
      const postId = restRes.headers.get('x-restli-id') || `post_${Date.now()}`;
      logger.info(`✅ LinkedIn REST Posts API success. postId: ${postId}`);
      return {
        success: true,
        mode: 'live',
        postId: postId,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`,
        publishedAt: new Date().toISOString(),
      };
    }

    // REST API failed — check for token error or fallback to UGC Posts API
    const restErrorText = await restRes.text();
    logger.warn(`LinkedIn REST Posts API failed (${restRes.status}), trying UGC Posts fallback. Error: ${restErrorText}`);

    const { isTokenError: restTokenError, code: restCode } = this._parseLinkedInError(restErrorText);
    if (restTokenError) return this._sandboxFallback(restCode || `HTTP ${restRes.status}`, forceReal);

    // Fallback: UGC Posts API — uses memberUrn (urn:li:member:SUB) format
    const ugcPayload = {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: commentary },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const ugcRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPayload),
    });

    if (!ugcRes.ok) {
      const ugcErr = await ugcRes.text();
      const { isTokenError, code } = this._parseLinkedInError(ugcErr);
      if (isTokenError) return this._sandboxFallback(code || `HTTP ${ugcRes.status}`, forceReal);
      throw new Error(`LinkedIn Posts API Error (REST: ${restErrorText} | UGC: ${ugcErr})`);
    }

    const ugcData = await ugcRes.json();
    logger.info(`✅ LinkedIn UGC Posts fallback success. postId: ${ugcData.id}`);
    return {
      success: true,
      mode: 'live',
      postId: ugcData.id,
      postUrl: `https://www.linkedin.com/feed/update/${ugcData.id}`,
      publishedAt: new Date().toISOString(),
    };
  }
}

module.exports = new LinkedInService();
