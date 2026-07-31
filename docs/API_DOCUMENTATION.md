# LinkedIn Integration Module REST API Reference

Base URL: `http://localhost:3000`  
Swagger Interactive Docs: `http://localhost:3000/api-docs`

---

## 1. Authentication Endpoints

### `GET /auth/linkedin`
Redirects user to LinkedIn OAuth 2.0 authorization screen.

### `GET /auth/linkedin/callback`
OAuth 2.0 callback handler. Exchanges authorization code for Access Token.

### `POST /auth/linkedin/exchange`
Manually exchange an authorization code for an Access Token.

### `GET /auth/status`
Returns connection status, token preview, and active profile metadata.

---

## 2. Post Endpoints

### `POST /api/v1/posts/upload`
Universal endpoint for creating or scheduling LinkedIn posts.
**Payload:**
```json
{
  "title": "Post Title",
  "description": "Optional description",
  "content": "Post copy body content...",
  "author": "Javed Khan",
  "hashtags": ["AI", "Tech"],
  "postType": "text|quote|single_image|multi_image|video|document",
  "mediaDetails": [
    { "url": "http://localhost:3000/uploads/file.png", "filename": "file.png", "mimeType": "image/png" }
  ],
  "scheduledFor": "2026-07-25T10:00:00.000Z",
  "simulate": false
}
```

### `POST /api/v1/posts/quote`
Formated quote post publication endpoint.

### `GET /api/v1/posts/history`
Returns post execution history log.

---

## 3. Media Upload Endpoints

### `POST /api/v1/media/upload`
Multipart file upload endpoint.
Supports Images (PNG, JPG, WEBP), Videos (MP4, MOV), Documents (PDF, PPT, DOCX) up to 50MB.

---

## 4. AI Generator Endpoints

### `POST /api/v1/ai/generate-caption`
Generates post copy from prompt/topic and tone.

### `POST /api/v1/ai/transform-tone`
Re-styles copy into target tone (*Professional*, *Casual*, *Marketing*, *Corporate*, *Startup*).

---

## 5. Drafts & Analytics

### `GET /api/v1/drafts` & `POST /api/v1/drafts`
Manage post draft records.

### `GET /api/v1/analytics/overview`
Returns summary post counts and engagement metrics.
