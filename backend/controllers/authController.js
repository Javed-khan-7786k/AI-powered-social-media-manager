const linkedinService = require('../services/linkedinService');
const logger = require('../services/loggerService');

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const LINKEDIN_CALLBACK_URL =
  process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3000/auth/linkedin/callback';

/**
 * Step 1: OAuth 2.0 Authorization URL
 * Directs user to LinkedIn login screen.
 * Requires BOTH:
 *  - openid + profile  → needed to call /v2/userinfo and resolve a real member URN
 *  - w_member_social    → needed to actually publish posts
 * Your LinkedIn app must have the "Sign In with LinkedIn using OpenID Connect"
 * AND "Share on LinkedIn" products added (see docs/LINKEDIN_OAUTH_SETUP.md),
 * or LinkedIn will silently grant a token that can't use these scopes.
 */
exports.connectLinkedIn = (req, res) => {
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    return res.status(400).json({
      error: 'LinkedIn Client Credentials missing in .env file.',
    });
  }

  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  req.session.oauthState = state;

  const scope = 'openid profile w_member_social';
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    LINKEDIN_CALLBACK_URL
  )}&state=${state}&scope=${encodeURIComponent(scope)}`;

  res.redirect(authUrl);
};

/**
 * Step 2 & 3: OAuth 2.0 Callback Handler
 * Receives authorization code from LinkedIn and exchanges it for an Access Token
 */
exports.handleCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    logger.error('LinkedIn OAuth Callback Error:', { error, error_description });
    return res.redirect(`/?auth=failed&error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?auth=failed&error=No authorization code received from LinkedIn.');
  }

  try {
    const fetch = require('node-fetch');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
      redirect_uri: LINKEDIN_CALLBACK_URL,
    });

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error('Failed to obtain LinkedIn access token:', tokenData);
      return res.redirect(
        `/?auth=failed&error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'Token exchange failed')}`
      );
    }

    // Successfully obtained Access Token
    const accessToken = tokenData.access_token;
    req.session.accessToken = accessToken;
    global.activeLinkedInToken = accessToken;

    // Persist token in MongoDB Database
    try {
      const LinkedInAccount = require('../models/LinkedInAccount');
      const profile = await linkedinService.getProfile(accessToken);
      
      if (profile && profile.memberId) {
        const expiresIn = tokenData.expires_in || 5184000;
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        
        await LinkedInAccount.findOneAndUpdate(
          { memberId: profile.memberId },
          {
            memberId: profile.memberId,
            displayName: profile.displayName,
            authorUrn: profile.authorUrn,
            profilePicture: profile.picture || '',
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            expiresAt: expiresAt,
            isConnected: true
          },
          { upsert: true, new: true }
        );
        logger.info('✅ LinkedIn Token saved to Database permanently.');
      }
    } catch (e) {
      logger.error('Failed to save token to Database', e);
    }

    logger.info('✅ LinkedIn Access Token obtained successfully!');
    return res.redirect(`/?auth=success&token=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    logger.error('Error during LinkedIn token exchange:', err);
    return res.redirect(`/?auth=failed&error=${encodeURIComponent(err.message)}`);
  }
};

/**
 * Exchange Authorization Code manually via API call
 */
exports.exchangeCode = async (req, res) => {
  const code = req.body.code || process.env.LINKEDIN_AUTH_ID;

  if (!code) {
    return res.status(400).json({ success: false, error: 'Authorization code is required.' });
  }

  try {
    const fetch = require('node-fetch');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
      redirect_uri: LINKEDIN_CALLBACK_URL,
    });

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(tokenRes.status || 400).json({
        success: false,
        error: tokenData.error_description || tokenData.error || 'Token exchange failed',
        details: tokenData,
      });
    }

    const accessToken = tokenData.access_token;
    req.session.accessToken = accessToken;
    global.activeLinkedInToken = accessToken;

    // Persist token in MongoDB Database
    try {
      const LinkedInAccount = require('../models/LinkedInAccount');
      const profile = await linkedinService.getProfile(accessToken);
      
      if (profile && profile.memberId) {
        const expiresIn = tokenData.expires_in || 5184000;
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        
        await LinkedInAccount.findOneAndUpdate(
          { memberId: profile.memberId },
          {
            memberId: profile.memberId,
            displayName: profile.displayName,
            authorUrn: profile.authorUrn,
            profilePicture: profile.picture || '',
            accessToken: accessToken,
            refreshToken: tokenData.refresh_token || null,
            expiresAt: expiresAt,
            isConnected: true
          },
          { upsert: true, new: true }
        );
        logger.info('✅ LinkedIn Token saved to Database permanently.');
      }
    } catch (e) {
      logger.error('Failed to save token to Database', e);
    }

    return res.json({
      success: true,
      message: 'LinkedIn Access Token obtained successfully!',
      accessToken: accessToken,
      expiresIn: tokenData.expires_in,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Check Authentication Status
 */
exports.getStatus = async (req, res) => {
  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.session?.accessToken ||
    global.activeLinkedInToken ||
    process.env.LINKEDIN_ACCESS_TOKEN ||
    process.env.LINKEDIN_AUTH_ID;

  let profile = {
    displayName: 'LinkedIn User',
    headline: 'Social Media Manager',
    profilePicture: '',
    authorUrn: process.env.LINKEDIN_AUTHOR_URN || 'urn:li:person:me',
    isConnected: Boolean(token),
  };

  if (token && token.length > 20) {
    try {
      const fetchedProfile = await linkedinService.getProfile(token);
      if (fetchedProfile && fetchedProfile.displayName !== 'LinkedIn User') {
        profile.displayName = fetchedProfile.displayName;
        profile.authorUrn = fetchedProfile.authorUrn;
        if (fetchedProfile.picture) profile.profilePicture = fetchedProfile.picture;
      }
    } catch (e) {
      // Graceful fallback if token is invalid or expired
    }
  }

  res.json({
    authenticated: Boolean(token),
    hasToken: Boolean(token),
    tokenPreview: token ? `${token.substring(0, 10)}...` : null,
    profile,
  });
};

/**
 * Disconnect Account
 */
exports.disconnect = (req, res) => {
  req.session.accessToken = null;
  global.activeLinkedInToken = null;
  res.json({
    success: true,
    message: 'LinkedIn account disconnected successfully.',
  });
};
