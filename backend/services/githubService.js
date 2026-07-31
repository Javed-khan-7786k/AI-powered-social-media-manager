const crypto = require('crypto');
const fetch = require('node-fetch');
const logger = require('./loggerService');

/**
 * Validates incoming GitHub Webhook HMAC-SHA256 signature
 */
function verifyWebhookSignature(payloadBuffer, signature, secret) {
  if (!secret) {
    logger.warn('GITHUB_WEBHOOK_SECRET is not configured. Bypassing signature check in dev mode.');
    return true;
  }
  if (!signature) {
    return false;
  }
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payloadBuffer).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (err) {
    logger.error(`Signature validation comparison failed: ${err.message}`);
    return false;
  }
}

/**
 * Parses all 13+ GitHub event types into a unified clean JSON payload format
 */
function parseWebhookEvent(eventType, payload) {
  const repository = payload.repository || {};
  const sender = payload.sender || {};
  
  const parsed = {
    eventType,
    repoName: repository.name || 'unknown-repo',
    repoFullName: repository.full_name || 'unknown/repo',
    repoOwner: repository.owner?.login || sender.login || 'unknown-owner',
    repoUrl: repository.html_url || '',
    repoDescription: repository.description || '',
    repoLanguage: repository.language || '',
    starsCount: repository.stargazers_count || 0,
    forksCount: repository.forks_count || 0,
    openIssuesCount: repository.open_issues_count || 0,
    sender: sender.login || 'unknown-sender',
    branch: '',
    commitSha: '',
    commitMessage: '',
    commitUrl: '',
    author: '',
    prUrl: '',
    prTitle: '',
    releaseName: '',
    addedFiles: [],
    modifiedFiles: [],
    removedFiles: [],
    changedFileCount: 0,
    timestamp: new Date()
  };

  switch (eventType) {
    case 'push': {
      const headCommit = payload.head_commit || (payload.commits && payload.commits[0]) || {};
      parsed.branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'main';
      parsed.commitSha = headCommit.id || payload.after || '';
      parsed.commitMessage = headCommit.message || 'Updated code in repository';
      parsed.commitUrl = headCommit.url || '';
      parsed.author = headCommit.author?.name || headCommit.author?.username || sender.login || '';
      parsed.addedFiles = headCommit.added || [];
      parsed.modifiedFiles = headCommit.modified || [];
      parsed.removedFiles = headCommit.removed || [];
      parsed.changedFileCount = parsed.addedFiles.length + parsed.modifiedFiles.length + parsed.removedFiles.length;
      break;
    }

    case 'pull_request': {
      const pr = payload.pull_request || {};
      parsed.prTitle = pr.title || '';
      parsed.prUrl = pr.html_url || '';
      parsed.branch = pr.head?.ref || 'feature';
      parsed.commitSha = pr.head?.sha || '';
      parsed.author = pr.user?.login || sender.login;
      parsed.commitMessage = `PR #${payload.number}: ${pr.title}\n${pr.body || ''}`;
      parsed.changedFileCount = pr.changed_files || 0;
      break;
    }

    case 'release': {
      const release = payload.release || {};
      parsed.releaseName = release.name || release.tag_name || 'New Release';
      parsed.commitMessage = `Published Release ${parsed.releaseName}: ${release.body || ''}`;
      parsed.commitUrl = release.html_url || '';
      parsed.author = release.author?.login || sender.login;
      break;
    }

    case 'issues': {
      const issue = payload.issue || {};
      parsed.prTitle = `Issue #${issue.number}: ${issue.title}`;
      parsed.prUrl = issue.html_url || '';
      parsed.commitMessage = `Action: ${payload.action} issue: ${issue.title}`;
      parsed.author = issue.user?.login || sender.login;
      break;
    }

    case 'issue_comment': {
      const comment = payload.comment || {};
      parsed.commitMessage = `Commented on issue #${payload.issue?.number}: ${comment.body?.substring(0, 100)}`;
      parsed.author = comment.user?.login || sender.login;
      break;
    }

    case 'star':
    case 'watch': {
      parsed.commitMessage = `${sender.login} starred repository ${parsed.repoFullName}!`;
      parsed.author = sender.login;
      break;
    }

    case 'fork': {
      const forkedRepo = payload.forkee || {};
      parsed.commitMessage = `${sender.login} forked repository to ${forkedRepo.full_name}!`;
      parsed.author = sender.login;
      break;
    }

    case 'create':
    case 'delete': {
      parsed.branch = payload.ref || '';
      parsed.commitMessage = `${payload.action || 'Updated'} ${payload.ref_type}: ${payload.ref}`;
      parsed.author = sender.login;
      break;
    }

    case 'repository': {
      parsed.commitMessage = `Repository ${payload.action || 'updated'}: ${parsed.repoFullName}`;
      parsed.author = sender.login;
      break;
    }

    case 'discussion': {
      const discussion = payload.discussion || {};
      parsed.commitMessage = `Discussion ${payload.action}: ${discussion.title}`;
      parsed.author = discussion.user?.login || sender.login;
      break;
    }

    case 'workflow_run': {
      const run = payload.workflow_run || {};
      parsed.commitMessage = `Workflow "${run.name}" ${run.conclusion || run.status}`;
      parsed.commitSha = run.head_sha || '';
      parsed.branch = run.head_branch || '';
      parsed.author = sender.login;
      break;
    }

    case 'workflow_job': {
      const job = payload.workflow_job || {};
      parsed.commitMessage = `Workflow Job "${job.name}" ${job.status}`;
      parsed.author = sender.login;
      break;
    }

    default: {
      parsed.commitMessage = `GitHub event triggered: ${eventType}`;
      parsed.author = sender.login || 'GitHub User';
    }
  }

  return parsed;
}

/**
 * Fetches expanded repository details via GitHub REST API if token available
 */
async function fetchRepositoryDetails(owner, repo, githubToken = process.env.GITHUB_TOKEN) {
  try {
    const headers = { 'User-Agent': 'GitHub-LinkedIn-AutoManager' };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) {
      logger.warn(`GitHub API repo fetch failed (${res.status}). Using parsed payload data.`);
      return null;
    }
    const repoData = await res.json();
    return {
      description: repoData.description || '',
      language: repoData.language || '',
      topics: repoData.topics || [],
      starsCount: repoData.stargazers_count || 0,
      forksCount: repoData.forks_count || 0,
      openIssuesCount: repoData.open_issues_count || 0,
      defaultBranch: repoData.default_branch || 'main',
      htmlUrl: repoData.html_url || ''
    };
  } catch (err) {
    logger.error(`Error fetching GitHub repo details: ${err.message}`);
    return null;
  }
}

/**
 * Fetches detailed commit diff / patch information
 */
async function fetchCommitDetails(owner, repo, sha, githubToken = process.env.GITHUB_TOKEN) {
  if (!sha) return null;
  try {
    const headers = { 'User-Agent': 'GitHub-LinkedIn-AutoManager' };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, { headers });
    if (!res.ok) return null;
    
    const commitData = await res.json();
    return {
      message: commitData.commit?.message || '',
      author: commitData.commit?.author?.name || '',
      stats: commitData.stats || { total: 0, additions: 0, deletions: 0 },
      files: (commitData.files || []).map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch ? f.patch.substring(0, 500) : ''
      }))
    };
  } catch (err) {
    logger.error(`Error fetching GitHub commit details: ${err.message}`);
    return null;
  }
}

module.exports = {
  verifyWebhookSignature,
  parseWebhookEvent,
  fetchRepositoryDetails,
  fetchCommitDetails
};
