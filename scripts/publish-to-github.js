import { getUncachableGitHubClient } from '../server/github-client.js';
import fs from 'fs';
import path from 'path';

async function createGitHubRepository() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    // Create repository
    const repositoryName = 'streetwise-real-estate';
    const repositoryDescription = 'AI-powered real estate valuation platform for NYC Metro Area properties with proprietary Streetwise Score and data-driven insights.';
    
    console.log(`Creating repository: ${repositoryName}`);
    
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repositoryName,
      description: repositoryDescription,
      private: false, // Set to true if you want a private repository
      has_issues: true,
      has_projects: true,
      has_wiki: true,
    });
    
    console.log(`✅ Repository created successfully!`);
    console.log(`Repository URL: ${repo.html_url}`);
    console.log(`Clone URL: ${repo.clone_url}`);
    console.log(`SSH URL: ${repo.ssh_url}`);
    
    // Create a README file
    const readmeContent = `# Streetwise Real Estate Platform

AI-powered real estate valuation platform for NYC Metro Area properties that generates comprehensive 0-100 Streetwise Scores.

## Features

- **Multiple Input Methods**: StreetEasy URL extraction, address search, and manual property entry
- **Proprietary Streetwise Score**: 0-100 scoring system for property valuation
- **Comprehensive Analysis**: Market context, location scoring, building quality, and unit features
- **Real-time Data**: Integration with public APIs for schools, transit, and market data
- **Comparable Properties**: Find and analyze similar properties in the area

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **APIs**: OpenAI, NYC Open Data, GreatSchools, Firecrawl

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Set up environment variables (see .env.example)
4. Run the development server: \`npm run dev\`

## Environment Variables

- \`DATABASE_URL\`: PostgreSQL connection string
- \`OPENAI_API_KEY\`: OpenAI API key for AI analysis
- \`FIRECRAWL_API_KEY\`: Firecrawl API key for web scraping
- \`SESSION_SECRET\`: Secret for session management

## License

MIT License - see LICENSE file for details.
`;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: repositoryName,
      path: 'README.md',
      message: 'Initial commit: Add README',
      content: Buffer.from(readmeContent).toString('base64'),
    });
    
    console.log(`✅ README.md created`);
    
    return {
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      name: repositoryName,
      owner: user.login
    };
    
  } catch (error) {
    console.error('Error creating repository:', error);
    if (error.response?.data?.message) {
      console.error('GitHub API Error:', error.response.data.message);
    }
    throw error;
  }
}

// Run the script
createGitHubRepository()
  .then((result) => {
    console.log('\n🎉 Repository setup complete!');
    console.log('\nNext steps:');
    console.log('1. Go to your repository:', result.url);
    console.log('2. Use the Replit Git panel to connect and push your code');
    console.log('3. Or clone locally with:', result.cloneUrl);
  })
  .catch((error) => {
    console.error('Failed to create repository:', error.message);
    process.exit(1);
  });