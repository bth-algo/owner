import chalk from 'chalk';

/**
 * Branch Service for creating and managing repository branches
 */
export class BranchService {
  /**
   * @param {Octokit} octokit - Authenticated Octokit instance
   * @param {string} org - GitHub organization name
   */
  constructor(octokit, org) {
    this.octokit = octokit;
    this.org = org;
  }

  /**
   * Create multiple branches from the default branch
   * @param {string} repoName - Repository name
   * @param {string[]} branches - Array of branch names to create
   * @returns {Promise<object>} Result object with success/failure counts
   */
  async createBranches(repoName, branches) {
    const results = {
      created: [],
      failed: [],
      existing: []
    };

    try {
      // 1. Get the repository to find the default branch
      const { data: repo } = await this.octokit.repos.get({
        owner: this.org,
        repo: repoName
      });

      const defaultBranch = repo.default_branch;

      // 2. Get the SHA of the default branch's latest commit
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.org,
        repo: repoName,
        ref: `heads/${defaultBranch}`
      });

      const sha = ref.object.sha;

      // 3. Create each branch as a git reference
      for (const branch of branches) {
        try {
          await this.octokit.git.createRef({
            owner: this.org,
            repo: repoName,
            ref: `refs/heads/${branch}`,
            sha: sha
          });
          console.log(chalk.green(`✓ Created branch: ${branch}`));
          results.created.push(branch);
        } catch (error) {
          if (error.status === 422) {
            console.log(chalk.yellow(`⚠ Branch ${branch} already exists`));
            results.existing.push(branch);
          } else {
            console.log(chalk.red(`✗ Failed to create branch ${branch}: ${error.message}`));
            results.failed.push(branch);
          }
        }
      }
    } catch (error) {
      console.log(chalk.red(`✗ Error accessing repository: ${error.message}`));
      throw error;
    }

    return results;
  }

  /**
   * Get the standard kmom branch names
   * @param {string} mode - 'all' or 'kmom03-only'
   * @returns {string[]} Array of branch names
   */
  static getKmomBranches(mode = 'all') {
    if (mode === 'kmom03-only') {
      return ['bth/submit/kmom03'];
    }
    return [
      'bth/submit/kmom03',
      'bth/submit/kmom06',
      'bth/submit/kmom10'
    ];
  }
}
