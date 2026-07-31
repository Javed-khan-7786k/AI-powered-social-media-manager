# LinkedIn Integration Module Architecture

## Overview
The LinkedIn Integration Module is a production-ready, enterprise-grade social media publishing and management system built for the AI Social Media Manager platform.

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                   |
|   React + Vite + Tailwind CSS + Framer Motion + Axios + Lucide Icons     |
|                                                                         |
|  +--------------------+  +-------------------+  +---------------------+ |
|  | Post Composer UI   |  | AI Assistant Drawer|  | Feed Preview Modal | |
|  +--------------------+  +-------------------+  +---------------------+ |
|  | Media Uploader     |  | Analytics Grid    |  | Schedule Modal      | |
|  +--------------------+  +-------------------+  +---------------------+ |
+------------------------------------+------------------------------------+
                                     | REST API (JSON)
                                     v
+------------------------------------+------------------------------------+
|                               BACKEND                                   |
|                 Node.js + Express + Winston + Node Cron                 |
|                                                                         |
|  +------------------+  +-------------------+  +----------------------+  |
|  | Auth Controller  |  | Post Controller   |  | AI Content Controller|  |
|  +------------------+  +-------------------+  +----------------------+  |
|  | Media Controller |  | Draft Controller  |  | Analytics Controller |  |
|  +------------------+  +-------------------+  +----------------------+  |
|                                                                         |
|  Services Layer:                                                        |
|  - linkedinService.js (LinkedIn REST & UGC Posts APIs)                  |
|  - aiService.js (Caption & Hashtag Generator + Tone Transformer)       |
|  - schedulerService.js (Node Cron Background Post Publisher)           |
|  - loggerService.js (Winston Structured Logging)                        |
+------------------------------------+------------------------------------+
                                     | Mongoose ORM / In-Memory Fallback
                                     v
+------------------------------------+------------------------------------+
|                             PERSISTENCE                                 |
|                         MongoDB Database                                |
|  Collections: Users, LinkedInAccounts, Posts, Drafts, Media,          |
|               Schedules, Logs, Analytics                                |
+-------------------------------------------------------------------------+
```

## Key Architectural Highlights
1. **OAuth 2.0 Security**: Direct exchange of LinkedIn authorization codes for access tokens with automatic fallback and state verification.
2. **Direct LinkedIn API Handler**: Implements LinkedIn REST API (`202304` version) and UGC Posts API (`/v2/ugcPosts`) supporting text, quotes, single/multi-images, videos, and PDF/DOCX documents.
3. **Background Scheduler**: Autonomous background queue processor running via `node-cron` every minute with exponential backoff retries.
4. **AI Generation Engine**: Prompt-based copy creation, brand tone voice styling (*Professional*, *Casual*, *Marketing*, *Corporate*, *Startup*), entity-extracted trending hashtags, and CTA insertion.
5. **Zero-Crash Data Layer**: Dual Mongoose database ORM + in-memory store fallback guaranteeing 100% uptime for local testing and standalone demonstration without external DB dependencies.
