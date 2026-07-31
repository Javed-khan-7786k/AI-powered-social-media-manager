# Production Deployment Guide

## Quickstart with Docker Compose

1. Clone the repository and navigate to root:
   ```bash
   cd "AI powered social media Manager"
   ```

2. Configure environment variables in `backend/.env`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://mongo:27017/ai_social_media_manager
   LINKEDIN_CLIENT_ID=86f3tzq7ob8st0
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   LINKEDIN_CALLBACK_URL=http://localhost:3000/auth/linkedin/callback
   ```

3. Launch Docker stack:
   ```bash
   docker-compose up -d --build
   ```

4. Access services:
   - Backend API & Swagger: `http://localhost:3000/api-docs`
   - Frontend Application: `http://localhost:5173`

---

## Manual Deployment

### Backend (Render / Railway / DigitalOcean / AWS)
1. Install dependencies: `npm install` inside `backend/`
2. Start server: `npm start`

### Frontend (Vercel / Netlify / Cloudflare Pages)
1. Install dependencies: `npm install` inside `frontend/`
2. Build bundle: `npm run build`
3. Serve `dist/` static assets.
