# GitHub App Configuration & Setup Guide

This guide walks you through creating and configuring a GitHub App to automatically send Webhook events to your platform.

## 1. Create a New GitHub App

1. Go to **GitHub Settings** -> **Developer Settings** -> **GitHub Apps** -> **New GitHub App**.
2. **GitHub App Name**: `AI Social Media Manager` (or your preferred name).
3. **Homepage URL**: `https://your-domain.com` (or `http://localhost:3000`).
4. **Webhook URL**: `https://your-domain.com/webhook` (or `http://localhost:3000/api/v1/github/webhook`).
5. **Webhook Secret**: Generate a strong secret string (e.g. `openssl rand -hex 32`). Save this string as `GITHUB_WEBHOOK_SECRET` in your `.env` file.

---

## 2. Configure Repository Permissions

Set the following **Read-Only** repository permissions:

| Permission | Access Level | Reason |
| :--- | :--- | :--- |
| **Metadata** | Read-only | Access repo basic info, stars, forks |
| **Contents** | Read-only | Access commit messages, diffs, README |
| **Pull Requests** | Read-only | Detect PR merges & PR titles |
| **Issues** | Read-only | Detect issue creation & updates |
| **Actions** | Read-only | Track workflow run completions |
| **Releases** | Read-only | Detect published releases & tag names |

---

## 3. Subscribe to Webhook Events

Under **Subscribe to events**, select the checkboxes for:
- [x] **Push**
- [x] **Pull request**
- [x] **Release**
- [x] **Create** (Branch/Tag creation)
- [x] **Delete**
- [x] **Fork**
- [x] **Issues**
- [x] **Issue comment**
- [x] **Star**
- [x] **Watch**
- [x] **Discussion**
- [x] **Workflow run**
- [x] **Workflow job**

---

## 4. Installation & Multi-Repo Support

1. Save the GitHub App.
2. Click **Install App** in the left sidebar menu.
3. Choose to install on **All Repositories** or select specific existing & future repositories.
4. Now, every push, pull request, or release across your repositories will automatically trigger AI LinkedIn posts!
