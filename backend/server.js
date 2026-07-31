require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const { connectDB } = require('./config/db');
const logger = require('./services/loggerService');
const schedulerService = require('./services/schedulerService');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import Route Modules
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const draftRoutes = require('./routes/draftRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const githubRoutes = require('./routes/githubRoutes');
const systemRoutes = require('./routes/systemRoutes');
const postController = require('./controllers/postController');

const app = express();
const port = process.env.PORT || 3000;

// Active token memory store fallback
global.activeLinkedInToken = process.env.LINKEDIN_ACCESS_TOKEN || process.env.LINKEDIN_AUTH_ID || null;

// Connect to Database and load token
connectDB().then(async (isConnected) => {
  if (isConnected) {
    try {
      const LinkedInAccount = require('./models/LinkedInAccount');
      const account = await LinkedInAccount.findOne().sort({ updatedAt: -1 });
      if (account && account.accessToken) {
        global.activeLinkedInToken = account.accessToken;
        logger.info('✅ Loaded permanent LinkedIn token from Database');
      }
    } catch (err) {
      logger.error('Failed to load LinkedIn token from DB: ' + err.message);
    }
  }
});

// Initialize Background Scheduler
schedulerService.init();

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(cors());

// Parse JSON with rawBody preservation for HMAC signature verification
app.use(
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ai_github_linkedin_automation_platform_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Serve static uploaded media files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger Documentation Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GitHub to LinkedIn AI Automation Platform API',
      version: '2.0.0',
      description: 'Production-ready REST API & Webhook processing engine that automatically detects GitHub events and publishes AI updates to LinkedIn.',
    },
    servers: [{ url: `http://localhost:${port}` }],
  },
  apis: ['./routes/*.js', './server.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Mount REST API Routes
app.use('/auth', authRoutes);
app.use('/api/v1/github', githubRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/drafts', draftRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Direct Aliased Routes for Quotes and Webhooks
app.post('/upload-quote', apiLimiter, postController.uploadQuote);
app.post('/api/v1/quotes/upload', apiLimiter, postController.uploadQuote);
app.get('/api/v1/quotes/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Quote Upload API is active and ready.',
    endpoints: {
      uploadQuote: 'POST /api/v1/quotes/upload or /upload-quote',
      linkedInAuth: 'GET /auth/linkedin',
      authStatus: 'GET /auth/status',
    },
    samplePayload: {
      quote: 'The only way to do great work is to love what you do.',
      author: 'Steve Jobs',
      hashtags: ['Motivation', 'Success', 'Tech'],
      simulate: true,
    },
  });
});

app.post('/webhook', (req, res, next) => {
  req.url = '/api/v1/github/webhook';
  app.handle(req, res, next);
});

// Interactive Web Dashboard Root Endpoint
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub to LinkedIn AI Automation Platform</title>
  <style>
    :root { --bg: #0b0f19; --card-bg: #151d30; --primary: #3b82f6; --text: #f8fafc; --text-muted: #94a3b8; --border: #1e293b; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 2rem; margin: 0; display: flex; justify-content: center; }
    .container { max-width: 900px; width: 100%; background: var(--card-bg); padding: 2.5rem; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    h1 { font-size: 1.8rem; color: #60a5fa; margin-top: 0; display: flex; align-items: center; gap: 0.75rem; }
    p { color: var(--text-muted); line-height: 1.6; font-size: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 2rem; }
    .card { background: #0b0f19; border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; }
    .card h3 { margin-top: 0; color: #38bdf8; font-size: 1.15rem; }
    .btn { display: inline-block; background: var(--primary); color: white; padding: 0.75rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 1rem; transition: 0.2s; text-align: center; }
    .btn:hover { background: #2563eb; }
    .badge { background: #10b98122; color: #34d399; border: 1px solid #10b98155; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
    .code-box { background: #070a12; border: 1px solid #1e293b; padding: 1rem; border-radius: 8px; color: #a5f3fc; font-family: monospace; font-size: 0.9rem; margin-top: 1rem; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 GitHub → LinkedIn AI Automation Platform <span class="badge">v2.0 Ready</span></h1>
    <p>Automated background engine that listens to GitHub App webhooks, processes commits, pull requests & releases, synthesizes developer updates using AI, and publishes directly to LinkedIn.</p>

    <div class="code-box">
      <strong>📌 GitHub Webhook Target URL:</strong> http://your-server.domain/webhook or http://localhost:3000/api/v1/github/webhook
    </div>

    <div class="grid">
      <div class="card">
        <div>
          <h3>📖 OpenAPI / Swagger Docs</h3>
          <p>Interactive REST API documentation and webhook endpoints.</p>
        </div>
        <a href="/api-docs" class="btn">View Swagger Docs</a>
      </div>
      <div class="card">
        <div>
          <h3>🔑 LinkedIn OAuth 2.0</h3>
          <p>Connect LinkedIn account for live publishing authorization.</p>
        </div>
        <a href="/auth/linkedin" class="btn" style="background:#0a66c2;">Connect LinkedIn</a>
      </div>
    </div>
  </div>
  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const auth = urlParams.get('auth');
    const error = urlParams.get('error');
    if (auth === 'success') {
      alert('✅ Successfully connected to LinkedIn! Token saved permanently.');
      window.history.replaceState({}, document.title, "/");
    } else if (auth === 'failed') {
      alert('❌ Failed to connect: ' + error);
      window.history.replaceState({}, document.title, "/");
    }
  </script>
</body>
</html>
  `);
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start Server if called directly
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`=================================================`);
    logger.info(`🚀 GitHub-to-LinkedIn Automation Server running on http://localhost:${port}`);
    logger.info(`📌 Webhook URL: http://localhost:${port}/webhook`);
    logger.info(`📌 Swagger API Docs: http://localhost:${port}/api-docs`);
    logger.info(`=================================================`);
  });
}

module.exports = app;