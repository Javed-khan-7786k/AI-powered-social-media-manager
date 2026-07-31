# LinkedIn OAuth 2.0 Integration Setup Guide

This guide details how to configure your LinkedIn Developer App to authenticate users and publish automated updates to LinkedIn.

## 1. Create a LinkedIn Developer App

1. Visit the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Click **Create App**.
3. Fill in your App Name, LinkedIn Company Page link, and upload a logo.
4. Under **Products**, add the following products:
   - **Share on LinkedIn**
   - **Sign In with LinkedIn using OpenID Connect**

---

## 2. OAuth 2.0 Credentials & Redirect URLs

1. Go to the **Auth** tab in your LinkedIn app settings.
2. Note your **Client ID** and **Client Secret**.
3. Add Authorized Redirect URLs:
   - Development: `http://localhost:3000/auth/linkedin/callback`
   - Production: `https://your-domain.com/auth/linkedin/callback`
4. Add these variables to `backend/.env`:
   ```env
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   LINKEDIN_CALLBACK_URL=http://localhost:3000/auth/linkedin/callback
   ```

---

## 3. Supported Post Formats & Sandbox Mode

The platform supports:
- **Text Posts**: Developer insights & code commit updates.
- **Article & Repo Links**: Direct attachments with preview cards linking to GitHub.
- **Image Posts**: Upload binary images & screenshot assets.
- **Sandbox Mode**: When no access token is set, posts execute in simulated sandbox mode without crashing or hitting rate limits.
