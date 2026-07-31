# AI-Powered Social Media Manager

A full-stack platform for automating GitHub-to-LinkedIn  content publishing using AI. It listens to GitHub events, generates polished social posts, and helps teams manage publishing workflows from a modern dashboard.

## Features

- GitHub webhook ingestion for repository events
- AI-generated social media content for LinkedIn 
- Draft management and post review workflow
- Analytics and publishing history tracking
- Admin dashboard for monitoring and manual controls
- Docker-based deployment support

## Tech Stack

- Backend: Node.js, Express, MongoDB
- Frontend: React, Vite, Tailwind CSS
- Integrations: GitHub API, LinkedIn OAuth, AI-assisted content generation

## Project Structure

```text
backend/        # Express API and services
frontend/       # React dashboard
docs/           # Setup and deployment documentation
docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- GitHub and LinkedIn developer credentials

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose up -d --build
```

## Environment Variables

Create a backend environment file with the required configuration for:

- MongoDB connection
- GitHub webhook secret
- GitHub token
- LinkedIn OAuth credentials
- AI provider credentials

## License

This project is intended for educational and professional demo use.

## Author

Javed Khan

