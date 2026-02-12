import chalk from 'chalk';
import fs from 'fs';
import dotenv from 'dotenv';

/**
 * Organization Service for managing GitHub organization settings
 */
export class OrganizationService {
  /**
   * @param {Octokit} octokit - Authenticated Octokit instance
   * @param {string} org - GitHub organization name
   */
  constructor(octokit, org) {
    this.octokit = octokit;
    this.org = org;
  }

  // ============ ACTION VARIABLES ============

  /**
   * Get all organization action variables
   * @returns {Promise<object>} Object with variable names as keys
   */
  async getActionVariables() {
    try {
      const { data } = await this.octokit.actions.listOrgVariables({
        org: this.org,
        per_page: 100
      });

      const variables = {};
      for (const variable of data.variables) {
        // Try to parse JSON values
        try {
          variables[variable.name] = JSON.parse(variable.value);
        } catch {
          variables[variable.name] = variable.value;
        }
      }
      return variables;
    } catch (error) {
      if (error.status === 404) {
        return {};
      }
      throw error;
    }
  }

  /**
   * Set or update an organization action variable
   * @param {string} name - Variable name
   * @param {any} value - Variable value (will be stringified if object)
   * @returns {Promise<void>}
   */
  async setActionVariable(name, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // Check if variable exists
      try {
        await this.octokit.actions.getOrgVariable({
          org: this.org,
          name: name
        });

        // Update existing variable
        await this.octokit.actions.updateOrgVariable({
          org: this.org,
          name: name,
          value: stringValue
        });
      } catch (error) {
        if (error.status === 404) {
          // Create new variable
          await this.octokit.actions.createOrgVariable({
            org: this.org,
            name: name,
            value: stringValue,
            visibility: 'all'
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw new Error(`Failed to set variable ${name}: ${error.message}`);
    }
  }

  // ============ ACTION SECRETS ============

  /**
   * Get all organization action secret names (values cannot be read)
   * @returns {Promise<string[]>} Array of secret names
   */
  async getActionSecretNames() {
    try {
      const { data } = await this.octokit.actions.listOrgSecrets({
        org: this.org,
        per_page: 100
      });
      return data.secrets.map(secret => secret.name);
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Set or update an organization action secret
   * @param {string} name - Secret name
   * @param {string} value - Secret value
   * @returns {Promise<void>}
   */
  async setActionSecret(name, value) {
    try {
      // Get the public key for encryption
      const { data: publicKey } = await this.octokit.actions.getOrgPublicKey({
        org: this.org
      });

      // Encrypt the secret value
      const sodiumModule = await import('libsodium-wrappers');
      const sodium = sodiumModule.default;
      await sodium.ready;
      const messageBytes = Buffer.from(value);
      const keyBytes = Buffer.from(publicKey.key, 'base64');
      const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
      const encrypted_value = Buffer.from(encryptedBytes).toString('base64');

      // Create or update the secret
      await this.octokit.actions.createOrUpdateOrgSecret({
        org: this.org,
        secret_name: name,
        encrypted_value: encrypted_value,
        key_id: publicKey.key_id,
        visibility: 'all'
      });
    } catch (error) {
      throw new Error(`Failed to set secret ${name}: ${error.message}`);
    }
  }

  /**
   * Load secrets from env file
   * @param {string} filePath - Path to secrets env file
   * @returns {object} Object with secret names and values
   */
  loadSecretsFromFile(filePath) {
    const result = dotenv.config({ path: filePath });
    if (result.error) {
      throw new Error(`Failed to load secrets file: ${result.error.message}`);
    }
    return result.parsed || {};
  }

  // ============ MEMBER PRIVILEGES ============

  /**
   * Get organization member privileges
   * @returns {Promise<object>} Member privilege settings
   */
  async getMemberPrivileges() {
    try {
      const { data } = await this.octokit.orgs.get({
        org: this.org
      });

      return {
        members_can_create_repositories: data.members_can_create_repositories,
        members_can_create_public_repositories: data.members_can_create_public_repositories,
        members_can_create_private_repositories: data.members_can_create_private_repositories,
        members_can_create_internal_repositories: data.members_can_create_internal_repositories,
        members_can_fork_private_repositories: data.members_can_fork_private_repositories,
        members_can_create_pages: data.members_can_create_pages,
        members_can_create_public_pages: data.members_can_create_public_pages,
        members_can_create_private_pages: data.members_can_create_private_pages,
        default_repository_permission: data.default_repository_permission,
        members_can_change_repo_visibility: data.members_can_change_repo_visibility,
        members_can_delete_repositories: data.members_can_delete_repositories,
        members_can_delete_issues: data.members_can_delete_issues,
        members_can_create_teams: data.members_can_create_teams
      };
    } catch (error) {
      throw new Error(`Failed to get member privileges: ${error.message}`);
    }
  }

  /**
   * Update organization member privileges
   * @param {object} settings - Member privilege settings
   * @returns {Promise<void>}
   */
  async updateMemberPrivileges(settings) {
    try {
      await this.octokit.orgs.update({
        org: this.org,
        ...settings
      });
    } catch (error) {
      throw new Error(`Failed to update member privileges: ${error.message}`);
    }
  }

  // ============ BRANCH RULESETS ============

  /**
   * Get all organization branch rulesets
   * @returns {Promise<array>} Array of rulesets
   */
  async getBranchRulesets() {
    try {
      const { data } = await this.octokit.repos.getOrgRulesets({
        org: this.org
      });
      return data || [];
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw new Error(`Failed to get branch rulesets: ${error.message}`);
    }
  }

  /**
   * Get team ID by team slug/name
   * @param {string} teamSlug - Team slug or name
   * @returns {Promise<number>} Team ID
   */
  async getTeamId(teamSlug) {
    try {
      const { data } = await this.octokit.teams.getByName({
        org: this.org,
        team_slug: teamSlug
      });
      return data.id;
    } catch (error) {
      throw new Error(`Failed to get team ID for "${teamSlug}": ${error.message}`);
    }
  }

  /**
   * Process bypass actors to resolve team IDs
   * @param {array} bypassActors - Array of bypass actor configurations
   * @returns {Promise<array>} Processed bypass actors with actor_id set
   */
  async resolveBypassActors(bypassActors) {
    if (!bypassActors || bypassActors.length === 0) {
      return [];
    }

    const resolved = [];
    for (const actor of bypassActors) {
      const processedActor = { ...actor };
      
      if (actor.actor_type === 'Team' && actor.team) {
        // Look up team ID by name
        try {
          processedActor.actor_id = await this.getTeamId(actor.team);
          // Remove the helper 'team' field (not part of API schema)
          delete processedActor.team;
        } catch (error) {
          throw new Error(`Failed to resolve team "${actor.team}": ${error.message}`);
        }
      }
      
      resolved.push(processedActor);
    }
    
    return resolved;
  }

  /**
   * Create a new branch ruleset
   * @param {object} ruleset - Ruleset configuration
   * @returns {Promise<void>}
   */
  async createBranchRuleset(ruleset) {
    try {
      // Resolve team IDs in bypass_actors
      const processedRuleset = { ...ruleset };
      if (processedRuleset.bypass_actors) {
        processedRuleset.bypass_actors = await this.resolveBypassActors(processedRuleset.bypass_actors);
      }

      await this.octokit.repos.createOrgRuleset({
        org: this.org,
        ...processedRuleset
      });
    } catch (error) {
      throw new Error(`Failed to create branch ruleset: ${error.message}`);
    }
  }

  /**
   * Update an existing branch ruleset
   * @param {number} rulesetId - Ruleset ID
   * @param {object} ruleset - Ruleset configuration
   * @returns {Promise<void>}
   */
  async updateBranchRuleset(rulesetId, ruleset) {
    try {
      // Resolve team IDs in bypass_actors
      const processedRuleset = { ...ruleset };
      if (processedRuleset.bypass_actors) {
        processedRuleset.bypass_actors = await this.resolveBypassActors(processedRuleset.bypass_actors);
      }

      await this.octokit.repos.updateOrgRuleset({
        org: this.org,
        ruleset_id: rulesetId,
        ...processedRuleset
      });
    } catch (error) {
      throw new Error(`Failed to update branch ruleset: ${error.message}`);
    }
  }

  // ============ TEAMS ============

  /**
   * Get all teams in the organization
   * @returns {Promise<array>} Array of team objects
   */
  async getTeams() {
    try {
      const { data } = await this.octokit.teams.list({
        org: this.org,
        per_page: 100
      });
      return data;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw new Error(`Failed to get teams: ${error.message}`);
    }
  }

  /**
   * Create a new team
   * @param {object} teamConfig - Team configuration
   * @returns {Promise<object>} Created team data
   */
  async createTeam(teamConfig) {
    try {
      const { data } = await this.octokit.teams.create({
        org: this.org,
        name: teamConfig.name,
        description: teamConfig.description || '',
        privacy: teamConfig.privacy || 'closed',
        notification_setting: teamConfig.notification_setting || 'notifications_enabled'
      });
      return data;
    } catch (error) {
      throw new Error(`Failed to create team "${teamConfig.name}": ${error.message}`);
    }
  }

  /**
   * Update an existing team
   * @param {string} teamSlug - Team slug
   * @param {object} teamConfig - Team configuration
   * @returns {Promise<void>}
   */
  async updateTeam(teamSlug, teamConfig) {
    try {
      await this.octokit.teams.updateInOrg({
        org: this.org,
        team_slug: teamSlug,
        name: teamConfig.name,
        description: teamConfig.description || '',
        privacy: teamConfig.privacy || 'closed',
        notification_setting: teamConfig.notification_setting || 'notifications_enabled'
      });
    } catch (error) {
      throw new Error(`Failed to update team "${teamSlug}": ${error.message}`);
    }
  }

  /**
   * Add or update team member
   * @param {string} teamSlug - Team slug
   * @param {string} username - GitHub username
   * @param {string} role - 'member' or 'maintainer'
   * @returns {Promise<void>}
   */
  async addTeamMember(teamSlug, username, role = 'member') {
    try {
      await this.octokit.teams.addOrUpdateMembershipForUserInOrg({
        org: this.org,
        team_slug: teamSlug,
        username: username,
        role: role
      });
    } catch (error) {
      throw new Error(`Failed to add member "${username}" to team "${teamSlug}": ${error.message}`);
    }
  }

  /**
   * Get team members
   * @param {string} teamSlug - Team slug
   * @returns {Promise<array>} Array of member objects
   */
  async getTeamMembers(teamSlug) {
    try {
      const { data } = await this.octokit.teams.listMembersInOrg({
        org: this.org,
        team_slug: teamSlug,
        per_page: 100
      });
      return data;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw new Error(`Failed to get team members: ${error.message}`);
    }
  }

  /**
   * Set team repository permission
   * @param {string} teamSlug - Team slug
   * @param {string} repoName - Repository name
   * @param {string} permission - 'pull', 'triage', 'push', 'maintain', or 'admin'
   * @returns {Promise<void>}
   */
  async setTeamRepoPermission(teamSlug, repoName, permission) {
    try {
      await this.octokit.teams.addOrUpdateRepoPermissionsInOrg({
        org: this.org,
        team_slug: teamSlug,
        owner: this.org,
        repo: repoName,
        permission: permission
      });
    } catch (error) {
      throw new Error(`Failed to set team repository permission: ${error.message}`);
    }
  }

  /**
   * Get team repositories
   * @param {string} teamSlug - Team slug
   * @returns {Promise<array>} Array of repository objects with permissions
   */
  async getTeamRepos(teamSlug) {
    try {
      const { data } = await this.octokit.teams.listReposInOrg({
        org: this.org,
        team_slug: teamSlug,
        per_page: 100
      });
      return data;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw new Error(`Failed to get team repositories: ${error.message}`);
    }
  }

  // ============ LABELS ============

  /**
   * Get all repositories in the organization
   * @param {string[]} patterns - Array of regex patterns to filter repos
   * @returns {Promise<array>} Array of repository objects
   */
  async getRepositories(patterns = null) {
    try {
      const { data } = await this.octokit.repos.listForOrg({
        org: this.org,
        per_page: 100,
        type: 'all'
      });
      
      if (!patterns || patterns.length === 0) {
        return data;
      }
      
      // Filter by patterns
      return data.filter(repo => {
        return patterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(repo.name);
        });
      });
    } catch (error) {
      throw new Error(`Failed to get repositories: ${error.message}`);
    }
  }

  /**
   * Get labels from a repository
   * @param {string} repoName - Repository name
   * @returns {Promise<array>} Array of label objects
   */
  async getRepoLabels(repoName) {
    try {
      const { data } = await this.octokit.issues.listLabelsForRepo({
        owner: this.org,
        repo: repoName,
        per_page: 100
      });
      return data;
    } catch (error) {
      if (error.status === 404) {
        return [];
      }
      throw new Error(`Failed to get labels from ${repoName}: ${error.message}`);
    }
  }

  /**
   * Create a label in a repository
   * @param {string} repoName - Repository name
   * @param {object} label - Label configuration {name, color, description}
   * @returns {Promise<void>}
   */
  async createRepoLabel(repoName, label) {
    try {
      await this.octokit.issues.createLabel({
        owner: this.org,
        repo: repoName,
        name: label.name,
        color: label.color,
        description: label.description || ''
      });
    } catch (error) {
      throw new Error(`Failed to create label "${label.name}" in ${repoName}: ${error.message}`);
    }
  }

  /**
   * Update a label in a repository
   * @param {string} repoName - Repository name
   * @param {object} label - Label configuration {name, color, description}
   * @returns {Promise<void>}
   */
  async updateRepoLabel(repoName, label) {
    try {
      await this.octokit.issues.updateLabel({
        owner: this.org,
        repo: repoName,
        name: label.name,
        color: label.color,
        description: label.description || ''
      });
    } catch (error) {
      throw new Error(`Failed to update label "${label.name}" in ${repoName}: ${error.message}`);
    }
  }

  /**
   * Apply labels to multiple repositories
   * @param {array} labels - Array of label configurations
   * @param {array} repos - Array of repository objects
   * @returns {Promise<object>} Results object
   */
  async applyLabelsToRepos(labels, repos) {
    const results = {
      successful: [],
      failed: []
    };

    for (const repo of repos) {
      try {
        const existingLabels = await this.getRepoLabels(repo.name);
        const existingLabelNames = existingLabels.map(l => l.name);

        for (const label of labels) {
          try {
            if (existingLabelNames.includes(label.name)) {
              await this.updateRepoLabel(repo.name, label);
            } else {
              await this.createRepoLabel(repo.name, label);
            }
          } catch (error) {
            results.failed.push(`${repo.name} - ${label.name}: ${error.message}`);
          }
        }
        
        results.successful.push(repo.name);
      } catch (error) {
        results.failed.push(`${repo.name}: ${error.message}`);
      }
    }

    return results;
  }

  // ============ COPILOT SETTINGS ============

  /**
   * Get Copilot settings (if available)
   * Note: This API may require specific permissions and may not be available
   * @returns {Promise<object>} Copilot settings
   */
  async getCopilotSettings() {
    try {
      // Note: This is a placeholder as Copilot organization API may vary
      // You may need to adjust based on actual API availability
      console.log(chalk.yellow('⚠ Copilot settings API access not fully implemented'));
      return {
        seat_management_setting: 'assign_selected',
        selected_repositories: []
      };
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not fetch Copilot settings: ${error.message}`));
      return null;
    }
  }

  /**
   * Update Copilot settings (if available)
   * Note: This may require manual configuration in GitHub UI
   * @param {object} settings - Copilot settings
   * @returns {Promise<void>}
   */
  async updateCopilotSettings(settings) {
    console.log(chalk.yellow('⚠ Copilot settings may need to be configured manually in GitHub UI'));
    console.log(chalk.blue(`  Go to: https://github.com/organizations/${this.org}/settings/copilot`));
    // Placeholder - actual API implementation depends on GitHub's Copilot org API
  }
}
