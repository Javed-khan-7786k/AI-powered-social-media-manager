const fetch = require('node-fetch');
const logger = require('./loggerService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  /**
   * Generates structured AI LinkedIn content based on GitHub Event & Repository metadata
   */
  async generateGitHubUpdatePost(eventData, repoInfo = {}, commitDetails = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.OPENAI_MODEL || 'gemini-1.5-flash';
    const portfolioUrl = process.env.PORTFOLIO_URL || 'https://your-portfolio.com';
    const policyUrl = process.env.PROJECT_POLICY_URL || 'https://your-domain.com/policy';

    const repoName = eventData.repoName || eventData.repoFullName || 'Repository';
    const eventType = eventData.eventType || 'push';
    const commitMsg = eventData.commitMessage || commitDetails.message || 'Latest updates and improvements';
    const author = eventData.author || eventData.sender || 'Developer';
    const repoUrl = eventData.repoUrl || repoInfo.htmlUrl || `https://github.com/${eventData.repoOwner}/${repoName}`;
    const branch = eventData.branch || 'main';
    const language = repoInfo.language || eventData.repoLanguage || 'Software Engineering';

    // Build LLM Prompt
    const systemPrompt = `You are a world-class Developer Relations (DevRel) and Executive Tech Content Writer. Your goal is to transform technical GitHub activity (commits, PRs, releases, issues, stars, repository creation) into highly engaging, professional LinkedIn posts that highlight innovation, technical excellence, and business value.`;
    
    const userPrompt = `
Analyze this GitHub activity and generate a structured JSON update for LinkedIn:

Repository: ${repoName} (${repoUrl})
Event Type: ${eventType.toUpperCase()}
Branch: ${branch}
Author: ${author}
Commit / Details: ${commitMsg}
Language / Tech Stack: ${language}
Changed File Count: ${eventData.changedFileCount || 0}
Files Added/Modified: ${(eventData.modifiedFiles || []).concat(eventData.addedFiles || []).slice(0, 5).join(', ')}
Stars: ${repoInfo.starsCount || 0} | Forks: ${repoInfo.forksCount || 0}

Required JSON Output Format:
{
  "title": "Short punchy headline with emojis",
  "summary": "2-3 sentence overview of what was updated or created",
  "technicalExplanation": "Clear technical breakdown of the changes",
  "keyFeatures": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "businessImpact": "Why this matters for developers, users, or the project ecosystem",
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3", "#Hashtag4", "#Hashtag5"],
  "imagePrompt": "A highly detailed, highly descriptive prompt to generate a 16:9 banner image representing this release or technical feature (e.g. 'A vibrant digital artwork showing modern code elements...'). Do not include text in the image prompt.",
  "formattedPost": "Full ready-to-publish LinkedIn post text with formatting, bullet points, emojis. MUST include these links at the bottom:\n🔗 Repository: ${repoUrl}\n🌐 Portfolio: ${portfolioUrl}\n📄 Project Policy: ${policyUrl}\n\nAnd the hashtags."
}

Generate only valid JSON.
`;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        });

        const text = result.response.text();
        const parsed = JSON.parse(text);
        return this.sanitizePostOutput(parsed, repoUrl, repoName, portfolioUrl, policyUrl, eventData, repoInfo);
      } catch (err) {
        logger.error(`Gemini API request failed: ${err.message}. Using smart fallback builder.`);
      }
    }

    // Smart Fallback Builder
    const fallbackResult = this.buildFallbackGitHubPost(eventData, repoInfo, commitDetails, portfolioUrl, policyUrl);
    return this.sanitizePostOutput(fallbackResult, repoUrl, repoName, portfolioUrl, policyUrl, eventData, repoInfo);
  }

  /**
   * Generates smart, high-quality, professional fallback LinkedIn posts without external AI dependencies
   */
  buildFallbackGitHubPost(eventData, repoInfo = {}, commitDetails = {}, portfolioUrl, policyUrl) {
    const repoName = eventData.repoName || 'Project';
    const eventType = (eventData.eventType || 'push').toLowerCase();
    const repoUrl = eventData.repoUrl || `https://github.com/${eventData.repoOwner || 'org'}/${repoName}`;
    const author = eventData.author || eventData.sender || 'Core Team';
    const commitMsg = eventData.commitMessage || 'Feature enhancements and system updates';
    const lang = repoInfo.language || eventData.repoLanguage || 'Software';

    let title = '';
    let summary = '';
    let technicalExplanation = '';
    let keyFeatures = [];
    let businessImpact = '';
    let hashtags = [`#${repoName.replace(/[^a-zA-Z0-9]/g, '')}`, '#OpenSource', `#${lang.replace(/[^a-zA-Z0-9]/g, '')}`, '#SoftwareEngineering', '#GitHub'];

    if (eventType === 'repository' || eventType === 'create') {
      title = `🚀 New Repository Created: ${repoName}`;
      summary = `A new project has been initialized by ${author}! We are excited to start building ${repoName}.`;
      technicalExplanation = `Setting up the core foundation and architecture for the new repository.`;
      keyFeatures = [`Initialized ${repoName}`, `Tech Stack: ${lang}`, `Ready for development`];
      businessImpact = `Laying the groundwork for our next big innovation.`;
      hashtags.push('#NewProject', '#Innovation');
    } else if (eventType === 'release') {
      const relName = eventData.releaseName || 'v1.0.0';
      title = `🚀 Major Milestone: ${repoName} ${relName} Released!`;
      summary = `We're thrilled to announce the official release of ${relName} for ${repoName}. This update brings enhanced performance, revised workflows, and key reliability improvements.`;
      technicalExplanation = `Key release features include updated dependency trees, optimized runtime performance, and expanded API endpoints.`;
      keyFeatures = [
        `Official Release ${relName} deployed`,
        `Production architectural refinements`,
        `Enhanced API performance & reliability`
      ];
      businessImpact = `Delivers a faster, more resilient experience for developers and production deployments.`;
      hashtags.push('#Release', '#TechInnovation');
    } else if (eventType === 'pull_request') {
      title = `🔀 Pull Request Merged: ${eventData.prTitle || repoName}`;
      summary = `A key contribution by ${author} has been successfully merged into ${repoName}.`;
      technicalExplanation = `Refactored core modules to ensure clean code standards, unit test coverage, and strict validation.`;
      keyFeatures = [
        `PR Title: ${eventData.prTitle || 'Core module enhancements'}`,
        `Branch: ${eventData.branch || 'main'}`,
        `Author: @${author}`
      ];
      businessImpact = `Increases overall system stability and code quality.`;
      hashtags.push('#CodeReview', '#PullRequest');
    } else if (eventType === 'star') {
      title = `⭐ ${repoName} reached a new GitHub Star Milestone!`;
      summary = `Huge thanks to ${author} and our developer community for starring ${repoName}!`;
      technicalExplanation = `Community engagement continues to fuel continuous development and roadmap progression.`;
      keyFeatures = [
        `Stars: ${repoInfo.starsCount || 1}+`,
        `Forks: ${repoInfo.forksCount || 0}`,
        `Language: ${lang}`
      ];
      businessImpact = `Validates community trust and open-source momentum.`;
      hashtags.push('#Community', '#Developers');
    } else {
      // Default Push / Commit
      title = `⚡ Code Update Deployed: ${repoName}`;
      summary = `Recent commits pushed to branch \`${eventData.branch || 'main'}\` by ${author} in ${repoName}.`;
      technicalExplanation = `Commit Highlights: "${commitMsg.split('\n')[0]}" across ${eventData.changedFileCount || 1} modified file(s).`;
      keyFeatures = [
        `Commit Message: "${commitMsg.split('\n')[0]}"`,
        `Branch: ${eventData.branch || 'main'}`,
        `Files Updated: ${eventData.changedFileCount || 1}`
      ];
      businessImpact = `Continuous integration ensures immediate deployment of bug fixes and feature enhancements.`;
      hashtags.push('#ContinuousIntegration', '#DevOps');
    }

    const formattedPost = `
${title}

${summary}

🔍 Technical Breakdown:
${technicalExplanation}

✨ Key Highlights:
${keyFeatures.map(f => `• ${f}`).join('\n')}

🎯 Impact:
${businessImpact}

🔗 Explore the Repository & Code:
${repoUrl}
🌐 Portfolio: ${portfolioUrl}
📄 Project Policy: ${policyUrl}

${hashtags.join(' ')}
`.trim();

    return {
      title,
      summary,
      technicalExplanation,
      keyFeatures,
      businessImpact,
      hashtags,
      imagePrompt: `A vibrant developer-focused digital artwork showing ${repoName} repository architecture with modern code elements, high contrast tech aesthetic, 16:9 aspect ratio.`,
      formattedPost
    };
  }

  sanitizePostOutput(parsed, repoUrl, repoName, portfolioUrl, policyUrl, eventData = {}, repoInfo = {}) {
    if (!parsed.hashtags || !Array.isArray(parsed.hashtags)) {
      parsed.hashtags = ['#GitHub', '#OpenSource', '#SoftwareEngineering', '#TechUpdate'];
    }
    if (!parsed.formattedPost) {
      parsed.formattedPost = `${parsed.title || '⚡ GitHub Update: ' + repoName}\n\n${parsed.summary || ''}\n\n🔗 Repository: ${repoUrl}\n🌐 Portfolio: ${portfolioUrl}\n📄 Project Policy: ${policyUrl}\n\n${parsed.hashtags.join(' ')}`;
    }
    // Optimize character length (LinkedIn allows up to 3000 chars)
    if (parsed.formattedPost.length > 2900) {
      parsed.formattedPost = parsed.formattedPost.substring(0, 2800) + '...\n\n🔗 Repository: ' + repoUrl + '\n🌐 Portfolio: ' + portfolioUrl + '\n📄 Project Policy: ' + policyUrl;
    }

    // Force the exact image prompt requested by the user
    const description = eventData.rawPayload?.repository?.description || 'A GitHub Repository';
    const commitId = eventData.commitSha || 'latest';
    const authorName = eventData.author || 'Developer';
    const avatarUrl = eventData.rawPayload?.sender?.avatar_url || '';
    const login = eventData.sender || 'developer';
    const branch = eventData.branch || 'main';
    const timestamp = eventData.rawPayload?.head_commit?.timestamp || new Date().toISOString();
    const addedCount = eventData.addedFiles?.length || 0;
    const modifiedCount = eventData.modifiedFiles?.length || 0;
    const removedCount = eventData.removedFiles?.length || 0;
    const language = repoInfo.language || eventData.repoLanguage || 'Code';
    const stars = repoInfo.starsCount || 0;
    const forks = repoInfo.forksCount || 0;
    const defaultBranch = eventData.rawPayload?.repository?.default_branch || 'main';

    parsed.imagePrompt = `Act as an Expert AI Graphic Designer and Developer Branding Specialist.

Generate a premium LinkedIn image for the latest GitHub push event.

Use the following GitHub webhook data dynamically:

Repository Name:
${repoName}

Repository Description:
${description}

Repository URL:
${repoUrl}

Commit Message:
${eventData.commitMessage || 'Updated code'}

Commit ID:
${commitId}

Commit Author:
${authorName}

Author Avatar:
${avatarUrl}

GitHub Username:
${login}

Branch:
${branch}

Commit Time:
${timestamp}

Files Added:
${addedCount}

Files Modified:
${modifiedCount}

Files Removed:
${removedCount}

Programming Languages:
${language}

Stars:
${stars}

Forks:
${forks}

Default Branch:
${defaultBranch}

Create a modern LinkedIn banner (1200x627).

Style:
- Dark premium UI
- Glassmorphism
- Blue + Purple gradient
- Soft glow
- GitHub inspired
- Developer branding
- Modern typography
- Minimal layout

Visual Elements:
- GitHub logo
- Repository icon
- Commit icon
- Branch icon
- Code snippets
- Terminal window
- Git graph
- Abstract technology background

Highlight:
- Repository Name
- Latest Commit Message
- Branch
- Commit Author
- Changed Files Count
- Programming Language

Footer:
Generated automatically from GitHub Webhook

Do not invent information.
Use only the provided webhook data.
Return a professional social media image suitable for LinkedIn.`;

    return parsed;
  }

  /**
   * Standalone helper for caption generation
   */
  async generateCaption(prompt, tone = 'Professional', includeCTA = true) {
    if (!prompt || !prompt.trim()) {
      prompt = 'Strategies for leadership, personal growth, and continuous innovation in AI and tech.';
    }
    const topicClean = prompt.trim();
    let caption = `🚀 Insights & Leadership:\n\n💡 ${topicClean}\n\nConsistent focus and standard setting drive sustainable success in our industry.`;
    if (includeCTA) {
      caption += `\n\nWhat are your thoughts on this? Let's discuss in the comments below! 👇`;
    }
    return caption;
  }

  /**
   * Helper for hashtags
   */
  async generateHashtags(content, count = 5) {
    const baseTags = ['#LinkedIn', '#Leadership', '#Innovation', '#Tech', '#SoftwareEngineering'];
    return baseTags.slice(0, count);
  }
}

module.exports = new AIService();
