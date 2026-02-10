import chalk from 'chalk';

/**
 * Repository Service for creating and managing repositories
 */
export class RepositoryService {
  /**
   * @param {Octokit} octokit - Authenticated Octokit instance
   * @param {string} org - GitHub organization name
   */
  constructor(octokit, org) {
    this.octokit = octokit;
    this.org = org;
  }

  /**
   * Create a new repository from a template
   * @param {string} templateRepo - Template repository name
   * @param {string} newRepoName - New repository name
   * @param {string} description - Repository description (optional)
   * @param {boolean} isPrivate - Whether the repository should be private (default: true)
   * @returns {Promise<object>} Created repository data
   */
  async createFromTemplate(templateRepo, newRepoName, description = '', isPrivate = true) {
    try {
      console.log(chalk.blue(`Creating repository ${newRepoName} from template ${templateRepo}...`));

      const { data } = await this.octokit.repos.createUsingTemplate({
        template_owner: this.org,
        template_repo: templateRepo,
        owner: this.org,
        name: newRepoName,
        description: description,
        private: isPrivate,
        include_all_branches: false // Only copy default branch
      });

      console.log(chalk.green(`✓ Created repository: ${data.html_url}`));
      
      // Wait for GitHub to finish initializing the repository
      console.log(chalk.blue('Waiting for repository initialization...'));
      await new Promise(resolve => setTimeout(resolve, 2000));

      return data;
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Template repository '${templateRepo}' not found in organization '${this.org}'`);
      } else if (error.status === 422) {
        throw new Error(`Repository '${newRepoName}' already exists or invalid name`);
      } else if (error.status === 403) {
        throw new Error('Insufficient permissions. Check your GitHub token scopes.');
      } else if (error.status === 401) {
        throw new Error('Authentication failed. Check your GitHub token.');
      }
      throw error;
    }
  }

  /**
   * Add a collaborator to a repository with specified permissions
   * @param {string} repoName - Repository name
   * @param {string} username - GitHub username to add
   * @param {string} permission - Permission level: pull, push, admin, maintain, triage (default: push)
   * @returns {Promise<void>}
   */
  async addCollaborator(repoName, username, permission = 'push') {
    try {
      console.log(chalk.blue(`Adding ${username} as collaborator with ${permission} access...`));

      await this.octokit.repos.addCollaborator({
        owner: this.org,
        repo: repoName,
        username: username,
        permission: permission
      });

      console.log(chalk.green(`✓ Added ${username} with ${permission} (write) permissions`));
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Repository '${repoName}' or user '${username}' not found`);
      } else if (error.status === 422) {
        throw new Error(`Invalid username '${username}' or permission level '${permission}'`);
      } else if (error.status === 403) {
        throw new Error('Insufficient permissions. Admin token required to add collaborators.');
      } else if (error.status === 401) {
        throw new Error('Authentication failed. Check your GitHub token.');
      }
      throw error;
    }
  }

  /**
   * Delete a repository (admin only)
   * @param {string} repoName - Repository name to delete
   * @returns {Promise<void>}
   */
  async deleteRepo(repoName) {
    try {
      console.log(chalk.blue(`Deleting repository ${repoName}...`));

      await this.octokit.repos.delete({
        owner: this.org,
        repo: repoName
      });

      console.log(chalk.green(`✓ Deleted repository: ${repoName}`));
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Repository '${repoName}' not found in organization '${this.org}'`);
      } else if (error.status === 403) {
        throw new Error('Insufficient permissions. Admin token required with delete_repo scope.');
      } else if (error.status === 401) {
        throw new Error('Authentication failed. Check your GitHub token.');
      }
      throw error;
    }
  }

  /**
   * Check if a repository exists
   * @param {string} repoName - Repository name
   * @returns {Promise<boolean>} True if repository exists
   */
  async exists(repoName) {
    try {
      await this.octokit.repos.get({
        owner: this.org,
        repo: repoName
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }
}
