#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import { getGithubClient, getOrganizationName, UserRole } from './auth/github-client.js';
import { RepositoryService } from './services/repository.service.js';
import { BranchService } from './services/branch.service.js';
import { OrganizationService } from './services/organization.service.js';
import { CanvasService } from './services/canvas.service.js';
import { BackupManager } from './utils/backup.js';
import { PromptManager } from './utils/prompt.js';
import { SettingsDiff } from './utils/settings-diff.js';

const program = new Command();

program
  .name('bth-algo')
  .description('GitHub organization management CLI for bth-algo')
  .version('1.0.0');

/**
 * Create Repository Command
 */
program
  .command('create-repo')
  .description('Create a repository from template with kmom branches')
  .requiredOption('-n, --name <name>', 'Repository name')
  .option('-t, --template <template>', 'Template repository name', 'algo-template')
  .option('-d, --description <description>', 'Repository description', '')
  .option('-b, --branches <mode>', 'Branch creation mode: all or kmom03-only', 'all')
  .option('-u, --user <username>', 'GitHub username to add as collaborator with write permissions')
  .option('--student', 'Use student credentials instead of admin', false)
  .option('--public', 'Make repository public (default is private)', false)
  .action(async (options) => {
    try {
      const role = options.student ? UserRole.STUDENT : UserRole.ADMIN;
      const org = getOrganizationName();
      const client = getGithubClient(role);

      console.log(chalk.blue(`\n🔧 Using ${role} credentials for organization: ${org}\n`));

      // Create repository service and repository
      const repoService = new RepositoryService(client, org);
      await repoService.createFromTemplate(
        options.template,
        options.name,
        options.description,
        !options.public
      );

      // Wait for repository to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Add collaborator if username provided
      if (options.user) {
        console.log(chalk.blue(`\nAdding collaborator...`));
        await repoService.addCollaborator(options.name, options.user, 'push');
        // Wait for collaborator to be fully added
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create branches
      const branchService = new BranchService(client, org);
      const branches = BranchService.getKmomBranches(options.branches);
      
      console.log(chalk.blue(`\nCreating ${branches.length} branch(es)...`));
      const results = await branchService.createBranches(options.name, branches);

      // Summary
      console.log(chalk.blue('\n📊 Summary:'));
      console.log(chalk.green(`  ✓ Created: ${results.created.length} branch(es)`));
      if (results.existing.length > 0) {
        console.log(chalk.yellow(`  ⚠ Already existed: ${results.existing.length} branch(es)`));
      }
      if (results.failed.length > 0) {
        console.log(chalk.red(`  ✗ Failed: ${results.failed.length} branch(es)`));
      }
      if (options.user) {
        console.log(chalk.green(`  ✓ Collaborator added: ${options.user}`));
      }
      console.log(chalk.green('\n✅ Repository setup complete!\n'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Delete Repository Command
 */
program
  .command('delete-repo')
  .description('Delete a repository (admin only)')
  .requiredOption('-n, --name <name>', 'Repository name to delete')
  .action(async (options) => {
    try {
      const org = getOrganizationName();
      const client = getGithubClient(UserRole.ADMIN);

      console.log(chalk.blue(`\n🔧 Using admin credentials for organization: ${org}\n`));

      const repoService = new RepositoryService(client, org);
      await repoService.deleteRepo(options.name);

      console.log(chalk.green('\n✅ Repository deleted successfully!\n'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * List Branches Command (helper)
 */
program
  .command('list-branches')
  .description('List all branches in a repository')
  .requiredOption('-n, --name <name>', 'Repository name')
  .option('--student', 'Use student credentials', false)
  .action(async (options) => {
    try {
      const role = options.student ? UserRole.STUDENT : UserRole.ADMIN;
      const org = getOrganizationName();
      const client = getGithubClient(role);

      console.log(chalk.blue(`\n🔧 Fetching branches for ${org}/${options.name}...\n`));

      const { data: branches } = await client.repos.listBranches({
        owner: org,
        repo: options.name
      });

      if (branches.length === 0) {
        console.log(chalk.yellow('No branches found.'));
      } else {
        console.log(chalk.green(`Found ${branches.length} branch(es):\n`));
        branches.forEach(branch => {
          console.log(chalk.white(`  • ${branch.name}`));
        });
      }
      console.log();

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Configure Organization Command
 */
program
  .command('configure-org')
  .description('Configure organization settings from configuration files')
  .action(async () => {
    const prompt = new PromptManager();
    
    try {
      const org = getOrganizationName();
      const client = getGithubClient(UserRole.ADMIN);
      const orgService = new OrganizationService(client, org);
      const backupMgr = new BackupManager();

      console.log(chalk.blue(`\n🔧 Configuring organization: ${org}\n`));

      // 1. Create backup of current settings
      console.log(chalk.blue('📦 Creating backup of current settings...'));
      const currentVariables = await orgService.getActionVariables();
      const currentSecretNames = await orgService.getActionSecretNames();
      const currentPrivileges = await orgService.getMemberPrivileges();
      const currentRulesets = await orgService.getBranchRulesets();
      const currentTeams = await orgService.getTeams();

      const backupData = {
        actionVariables: currentVariables,
        actionSecrets: currentSecretNames, // Only names, not values
        memberPrivileges: currentPrivileges,
        branchRulesets: currentRulesets,
        teams: currentTeams
      };

      const backupPath = await backupMgr.createBackup(backupData);
      console.log(chalk.green(`✓ Backup saved to: ${backupPath}\n`));

      // 2. Load desired settings from files
      console.log(chalk.blue('📖 Loading desired settings from files...'));
      
      const desiredVariables = JSON.parse(
        await fs.readFile('org-settings/action-variables.json', 'utf-8')
      );
      
      const desiredSecrets = orgService.loadSecretsFromFile('org-settings/action-secrets.env');
      
      const desiredPrivileges = JSON.parse(
        await fs.readFile('org-settings/member-privileges.json', 'utf-8')
      );
      
      const desiredRulesets = JSON.parse(
        await fs.readFile('org-settings/branch-rulesets.json', 'utf-8')
      );
      
      const desiredTeams = JSON.parse(
        await fs.readFile('org-settings/teams.json', 'utf-8')
      );
      
      const labelsConfig = JSON.parse(
        await fs.readFile('org-settings/labels.json', 'utf-8')
      );

      console.log(chalk.green('✓ Settings loaded\n'));

      // Track results
      const results = {
        successful: [],
        failed: [],
        skipped: []
      };

      // 3. Process Action Variables
      console.log(chalk.blue.bold('\n═══ ACTION VARIABLES ═══'));
      const varChanges = SettingsDiff.compare(currentVariables, desiredVariables);
      
      if (varChanges.length === 0) {
        console.log(chalk.green('✓ All variables are already up to date'));
      }
      
      for (const change of varChanges) {
        // Skip if values are actually the same
        if (SettingsDiff.isEqual(change.currentValue, change.newValue)) {
          console.log(chalk.gray(`  - ${change.key}: already matches (skipped)`));
          continue;
        }

        const confirmed = await prompt.confirmChange(
          `Variable: ${change.key}`,
          change.currentValue,
          change.newValue
        );

        if (confirmed) {
          try {
            await orgService.setActionVariable(change.key, change.newValue);
            console.log(chalk.green(`✓ Updated variable: ${change.key}`));
            results.successful.push(`Variable: ${change.key}`);
          } catch (error) {
            console.log(chalk.red(`✗ Failed: ${error.message}`));
            results.failed.push(`Variable: ${change.key} - ${error.message}`);
          }
        } else {
          results.skipped.push(`Variable: ${change.key}`);
        }
      }

      // 4. Process Action Secrets
      console.log(chalk.blue.bold('\n═══ ACTION SECRETS ═══'));
      const currentSecrets = {};
      currentSecretNames.forEach(name => { currentSecrets[name] = '***'; });
      const secretChanges = SettingsDiff.compare(currentSecrets, desiredSecrets);

      if (secretChanges.length === 0) {
        console.log(chalk.green('✓ All secrets are already up to date'));
      }

      for (const change of secretChanges) {
        // Skip if secret exists and is not changing (we can't check actual values)
        if (change.type === 'update' && SettingsDiff.isEqual(change.currentValue, change.newValue)) {
          console.log(chalk.gray(`  - ${change.key}: already exists (skipped)`));
          continue;
        }

        const displayValue = change.type === 'remove' ? '***' : '*** (will be set)';
        const confirmed = await prompt.confirmChange(
          `Secret: ${change.key}`,
          change.type === 'add' ? '(not set)' : '***',
          displayValue
        );

        if (confirmed) {
          try {
            if (change.type !== 'remove') {
              await orgService.setActionSecret(change.key, change.newValue);
              console.log(chalk.green(`✓ Updated secret: ${change.key}`));
              results.successful.push(`Secret: ${change.key}`);
            } else {
              console.log(chalk.yellow(`⚠ Skipping removal of secret: ${change.key} (manual removal required)`));
              results.skipped.push(`Secret: ${change.key} (removal not automated)`);
            }
          } catch (error) {
            console.log(chalk.red(`✗ Failed: ${error.message}`));
            results.failed.push(`Secret: ${change.key} - ${error.message}`);
          }
        } else {
          results.skipped.push(`Secret: ${change.key}`);
        }
      }

      // 5. Process Member Privileges
      console.log(chalk.blue.bold('\n═══ MEMBER PRIVILEGES ═══'));
      const privChanges = SettingsDiff.compare(currentPrivileges, desiredPrivileges);

      if (privChanges.length === 0) {
        console.log(chalk.green('✓ All member privileges are already up to date'));
      }

      for (const change of privChanges) {
        // Skip if values are actually the same
        if (SettingsDiff.isEqual(change.currentValue, change.newValue)) {
          console.log(chalk.gray(`  - ${change.key}: already matches (skipped)`));
          continue;
        }

        const confirmed = await prompt.confirmChange(
          `Privilege: ${change.key}`,
          change.currentValue,
          change.newValue
        );

        if (confirmed) {
          try {
            await orgService.updateMemberPrivileges({ [change.key]: change.newValue });
            console.log(chalk.green(`✓ Updated privilege: ${change.key}`));
            results.successful.push(`Privilege: ${change.key}`);
          } catch (error) {
            console.log(chalk.red(`✗ Failed: ${error.message}`));
            results.failed.push(`Privilege: ${change.key} - ${error.message}`);
          }
        } else {
          results.skipped.push(`Privilege: ${change.key}`);
        }
      }

      // 6. Process Branch Rulesets
      console.log(chalk.blue.bold('\n═══ BRANCH RULESETS ═══'));
      
      if (desiredRulesets.length === 0) {
        console.log(chalk.green('✓ No rulesets configured'));
      }
      
      for (const desiredRuleset of desiredRulesets) {
        const existing = currentRulesets.find(r => r.name === desiredRuleset.name);
        
        if (existing) {
          const confirmed = await prompt.confirm(
            chalk.yellow(`\nRuleset "${desiredRuleset.name}" exists. Update it?`)
          );
          
          if (confirmed) {
            try {
              await orgService.updateBranchRuleset(existing.id, desiredRuleset);
              console.log(chalk.green(`✓ Updated ruleset: ${desiredRuleset.name}`));
              results.successful.push(`Ruleset: ${desiredRuleset.name}`);
            } catch (error) {
              console.log(chalk.red(`✗ Failed: ${error.message}`));
              results.failed.push(`Ruleset: ${desiredRuleset.name} - ${error.message}`);
            }
          } else {
            results.skipped.push(`Ruleset: ${desiredRuleset.name}`);
          }
        } else {
          const confirmed = await prompt.confirm(
            chalk.yellow(`\nCreate new ruleset "${desiredRuleset.name}"?`)
          );
          
          if (confirmed) {
            try {
              await orgService.createBranchRuleset(desiredRuleset);
              console.log(chalk.green(`✓ Created ruleset: ${desiredRuleset.name}`));
              results.successful.push(`Ruleset: ${desiredRuleset.name}`);
            } catch (error) {
              console.log(chalk.red(`✗ Failed: ${error.message}`));
              results.failed.push(`Ruleset: ${desiredRuleset.name} - ${error.message}`);
            }
          } else {
            results.skipped.push(`Ruleset: ${desiredRuleset.name}`);
          }
        }
      }

      // 7. Process Teams
      console.log(chalk.blue.bold('\n═══ TEAMS ═══'));
      
      if (desiredTeams.length === 0) {
        console.log(chalk.green('✓ No teams configured'));
      }
      
      for (const desiredTeam of desiredTeams) {
        const existing = currentTeams.find(t => t.slug === desiredTeam.name.toLowerCase().replace(/\s+/g, '-'));
        
        if (existing) {
          const confirmed = await prompt.confirm(
            chalk.yellow(`\nTeam "${desiredTeam.name}" exists. Update it?`)
          );
          
          if (confirmed) {
            try {
              await orgService.updateTeam(existing.slug, desiredTeam);
              console.log(chalk.green(`✓ Updated team: ${desiredTeam.name}`));
              
              // Process members
              if (desiredTeam.members && desiredTeam.members.length > 0) {
                for (const member of desiredTeam.members) {
                  try {
                    await orgService.addTeamMember(existing.slug, member.username, member.role);
                    console.log(chalk.green(`  ✓ Added/updated member: ${member.username} (${member.role})`));
                  } catch (error) {
                    console.log(chalk.red(`  ✗ Failed to add member ${member.username}: ${error.message}`));
                    results.failed.push(`Team ${desiredTeam.name} - Member ${member.username}`);
                  }
                }
              }
              
              results.successful.push(`Team: ${desiredTeam.name}`);
            } catch (error) {
              console.log(chalk.red(`✗ Failed: ${error.message}`));
              results.failed.push(`Team: ${desiredTeam.name} - ${error.message}`);
            }
          } else {
            results.skipped.push(`Team: ${desiredTeam.name}`);
          }
        } else {
          const confirmed = await prompt.confirm(
            chalk.yellow(`\nCreate new team "${desiredTeam.name}"?`)
          );
          
          if (confirmed) {
            try {
              const createdTeam = await orgService.createTeam(desiredTeam);
              console.log(chalk.green(`✓ Created team: ${desiredTeam.name}`));
              
              // Process members
              if (desiredTeam.members && desiredTeam.members.length > 0) {
                for (const member of desiredTeam.members) {
                  try {
                    await orgService.addTeamMember(createdTeam.slug, member.username, member.role);
                    console.log(chalk.green(`  ✓ Added member: ${member.username} (${member.role})`));
                  } catch (error) {
                    console.log(chalk.red(`  ✗ Failed to add member ${member.username}: ${error.message}`));
                    results.failed.push(`Team ${desiredTeam.name} - Member ${member.username}`);
                  }
                }
              }
              
              results.successful.push(`Team: ${desiredTeam.name}`);
            } catch (error) {
              console.log(chalk.red(`✗ Failed: ${error.message}`));
              results.failed.push(`Team: ${desiredTeam.name} - ${error.message}`);
            }
          } else {
            results.skipped.push(`Team: ${desiredTeam.name}`);
          }
        }
      }

      // 8. Process Labels
      console.log(chalk.blue.bold('\n═══ LABELS ═══'));
      
      if (!labelsConfig.labels || labelsConfig.labels.length === 0) {
        console.log(chalk.green('✓ No labels configured'));
      } else {
        console.log(chalk.blue(`Found ${labelsConfig.labels.length} label(s) to manage`));
        
        // Get repositories matching patterns
        const matchingRepos = await orgService.getRepositories(labelsConfig.apply_to_repos);
        console.log(chalk.blue(`Found ${matchingRepos.length} repositories matching patterns`));
        
        if (matchingRepos.length > 0) {
          const applyToExisting = await prompt.confirm(
            chalk.yellow(`\nApply labels to ${matchingRepos.length} existing repositories?`)
          );
          
          if (applyToExisting) {
            console.log(chalk.blue('\nApplying labels to repositories...'));
            const labelResults = await orgService.applyLabelsToRepos(labelsConfig.labels, matchingRepos);
            
            if (labelResults.successful.length > 0) {
              console.log(chalk.green(`✓ Applied labels to ${labelResults.successful.length} repositories`));
              labelResults.successful.forEach(repo => {
                results.successful.push(`Labels: ${repo}`);
              });
            }
            
            if (labelResults.failed.length > 0) {
              console.log(chalk.red(`✗ Failed to apply labels: ${labelResults.failed.length} errors`));
              labelResults.failed.forEach(error => {
                console.log(chalk.red(`  • ${error}`));
                results.failed.push(`Labels: ${error}`);
              });
            }
          } else {
            results.skipped.push('Labels: Apply to existing repos');
          }
        } else {
          console.log(chalk.yellow('⚠ No repositories match the configured patterns'));
        }
      }

      // Final Summary
      console.log(chalk.blue.bold('\n═══════════════════════════════'));
      console.log(chalk.blue.bold('📊 CONFIGURATION SUMMARY'));
      console.log(chalk.blue.bold('═══════════════════════════════\n'));
      
      console.log(chalk.green(`✓ Successful: ${results.successful.length}`));
      if (results.successful.length > 0) {
        results.successful.forEach(item => console.log(chalk.green(`  • ${item}`)));
      }
      
      console.log(chalk.yellow(`\n⊘ Skipped: ${results.skipped.length}`));
      if (results.skipped.length > 0) {
        results.skipped.forEach(item => console.log(chalk.yellow(`  • ${item}`)));
      }
      
      console.log(chalk.red(`\n✗ Failed: ${results.failed.length}`));
      if (results.failed.length > 0) {
        results.failed.forEach(item => console.log(chalk.red(`  • ${item}`)));
      }

      console.log(chalk.blue.bold('\n═══════════════════════════════\n'));
      console.log(chalk.green('✅ Organization configuration complete!\n'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    } finally {
      prompt.close();
    }
  });

/**
 * Restore Organization Command
 */
program
  .command('restore-org')
  .description('Restore organization settings from a backup file')
  .requiredOption('-b, --backup <file>', 'Path to backup file')
  .action(async (options) => {
    const prompt = new PromptManager();
    
    try {
      const org = getOrganizationName();
      const client = getGithubClient(UserRole.ADMIN);
      const orgService = new OrganizationService(client, org);
      const backupMgr = new BackupManager();

      console.log(chalk.blue(`\n🔧 Restoring organization settings: ${org}\n`));

      // Read backup file
      console.log(chalk.blue(`📖 Reading backup: ${options.backup}`));
      const backup = await backupMgr.readBackup(options.backup);
      const backupSettings = backup.settings;

      console.log(chalk.green(`✓ Backup loaded (created: ${backup.timestamp})\n`));

      // Get current settings
      console.log(chalk.blue('📖 Fetching current settings...'));
      const currentVariables = await orgService.getActionVariables();
      const currentSecretNames = await orgService.getActionSecretNames();
      const currentPrivileges = await orgService.getMemberPrivileges();
      const currentRulesets = await orgService.getBranchRulesets();
      console.log(chalk.green('✓ Current settings loaded\n'));

      // Track results
      const results = {
        successful: [],
        failed: [],
        skipped: []
      };

      // Restore Action Variables
      console.log(chalk.blue.bold('\n═══ ACTION VARIABLES ═══'));
      const varChanges = SettingsDiff.compare(currentVariables, backupSettings.actionVariables);
      
      for (const change of varChanges) {
        const confirmed = await prompt.confirmChange(
          `Variable: ${change.key}`,
          change.currentValue,
          change.newValue
        );

        if (confirmed) {
          try {
            await orgService.setActionVariable(change.key, change.newValue);
            console.log(chalk.green(`✓ Restored variable: ${change.key}`));
            results.successful.push(`Variable: ${change.key}`);
          } catch (error) {
            console.log(chalk.red(`✗ Failed: ${error.message}`));
            results.failed.push(`Variable: ${change.key} - ${error.message}`);
          }
        } else {
          results.skipped.push(`Variable: ${change.key}`);
        }
      }

      // Restore Action Secrets (requires current action-secrets.env)
      console.log(chalk.blue.bold('\n═══ ACTION SECRETS ═══'));
      console.log(chalk.yellow('⚠ Reading secrets from current action-secrets.env file'));
      
      try {
        const currentSecretsFile = orgService.loadSecretsFromFile('org-settings/action-secrets.env');
        const backupSecretNames = backupSettings.actionSecrets;

        for (const secretName of backupSecretNames) {
          if (currentSecretsFile[secretName]) {
            const confirmed = await prompt.confirm(
              chalk.yellow(`\nRestore secret: ${secretName}?`)
            );

            if (confirmed) {
              try {
                await orgService.setActionSecret(secretName, currentSecretsFile[secretName]);
                console.log(chalk.green(`✓ Restored secret: ${secretName}`));
                results.successful.push(`Secret: ${secretName}`);
              } catch (error) {
                console.log(chalk.red(`✗ Failed: ${error.message}`));
                results.failed.push(`Secret: ${secretName} - ${error.message}`);
              }
            } else {
              results.skipped.push(`Secret: ${secretName}`);
            }
          } else {
            console.log(chalk.yellow(`⚠ Secret ${secretName} not found in action-secrets.env, skipping`));
            results.skipped.push(`Secret: ${secretName} (not in env file)`);
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not load action-secrets.env: ${error.message}`));
      }

      // Restore Member Privileges
      console.log(chalk.blue.bold('\n═══ MEMBER PRIVILEGES ═══'));
      const privChanges = SettingsDiff.compare(currentPrivileges, backupSettings.memberPrivileges);

      for (const change of privChanges) {
        const confirmed = await prompt.confirmChange(
          `Privilege: ${change.key}`,
          change.currentValue,
          change.newValue
        );

        if (confirmed) {
          try {
            await orgService.updateMemberPrivileges({ [change.key]: change.newValue });
            console.log(chalk.green(`✓ Restored privilege: ${change.key}`));
            results.successful.push(`Privilege: ${change.key}`);
          } catch (error) {
            console.log(chalk.red(`✗ Failed: ${error.message}`));
            results.failed.push(`Privilege: ${change.key} - ${error.message}`);
          }
        } else {
          results.skipped.push(`Privilege: ${change.key}`);
        }
      }

      // Final Summary
      console.log(chalk.blue.bold('\n═══════════════════════════════'));
      console.log(chalk.blue.bold('📊 RESTORE SUMMARY'));
      console.log(chalk.blue.bold('═══════════════════════════════\n'));
      
      console.log(chalk.green(`✓ Successful: ${results.successful.length}`));
      if (results.successful.length > 0) {
        results.successful.forEach(item => console.log(chalk.green(`  • ${item}`)));
      }
      
      console.log(chalk.yellow(`\n⊘ Skipped: ${results.skipped.length}`));
      if (results.skipped.length > 0) {
        results.skipped.forEach(item => console.log(chalk.yellow(`  • ${item}`)));
      }
      
      console.log(chalk.red(`\n✗ Failed: ${results.failed.length}`));
      if (results.failed.length > 0) {
        results.failed.forEach(item => console.log(chalk.red(`  • ${item}`)));
      }

      console.log(chalk.blue.bold('\n═══════════════════════════════\n'));
      console.log(chalk.green('✅ Organization restore complete!\n'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    } finally {
      prompt.close();
    }
  });

/**
 * Process Submissions Command
 * Fetches student submissions from Canvas, invites users to the GitHub org,
 * creates repos from template, syncs labels, and posts grades back to Canvas.
 */
program
  .command('process-submissions')
  .description('Process Canvas submissions: invite students, create repos, sync labels, and grade')
  .option('-t, --template <template>', 'Template repository name', 'template2')
  .option('-b, --branches <mode>', 'Branch creation mode: all or kmom03-only', 'kmom03-only')
  .action(async (options) => {
    try {
      const canvasToken = process.env.CANVAS_TOKEN;
      if (!canvasToken) {
        console.error(chalk.red('\n❌ Missing CANVAS_TOKEN environment variable\n'));
        process.exit(1);
      }

      const canvas = new CanvasService(canvasToken);
      const adminClient = getGithubClient(UserRole.ADMIN);

      // Load courses config
      let courses;
      try {
        const raw = await fs.readFile('org-settings/courses.json', 'utf-8');
        courses = JSON.parse(raw);
        console.log(chalk.blue(`\nLoaded ${courses.length} course(s) from org-settings/courses.json\n`));
      } catch (err) {
        console.error(chalk.red(`Failed to read org-settings/courses.json: ${err.message}`));
        process.exit(1);
      }

      // Load labels config
      let labelsConfig;
      try {
        labelsConfig = JSON.parse(await fs.readFile('org-settings/labels.json', 'utf-8'));
      } catch (err) {
        console.error(chalk.red(`Failed to read org-settings/labels.json: ${err.message}`));
        process.exit(1);
      }

      for (const course of courses) {
        const { courseId, assignmentId, organization, repoPrefix } = course;
        console.log(chalk.blue.bold(`\n═══ Course ${courseId} (org: ${organization}, prefix: ${repoPrefix}) ═══\n`));

        // Create services scoped to this course's organization
        const repoService = new RepositoryService(adminClient, organization);
        const orgService = new OrganizationService(adminClient, organization);

        const submissions = await canvas.fetchStudentSubmissions(courseId, assignmentId);
        console.log(chalk.blue(`Found ${submissions.length} submission(s).\n`));

        for (const submission of submissions) {
          const { githubUsername, email, userId, attempt } = submission;

          const notify = (status, comment) =>
            canvas.updateSubmission(courseId, assignmentId, userId, attempt, status, comment);

          if (!githubUsername) {
            console.error(chalk.red(`[user=${userId}] Could not extract a GitHub username from submission.`));
            await notify(410, 'Could not extract a GitHub username from submission.');
            continue;
          }

          if (!email) {
            console.error(chalk.red(`[user=${userId}] No email found in submission.`));
            await notify(410, 'No email found in submission.');
            continue;
          }

          const emailPrefix = email.split('@')[0];
          const repoName = `${repoPrefix}-${emailPrefix}`;
          const repoUrl = `https://github.com/${organization}/${repoName}`;
          const orgInviteUrl = `https://github.com/orgs/${organization}/invitation`;

          // --- Look up GitHub user ---
          let githubUserId;
          try {
            githubUserId = await orgService.getUserId(githubUsername);
            console.log(chalk.green(`[${githubUsername}] Found GitHub user ID: ${githubUserId}`));
          } catch (error) {
            console.error(chalk.red(`[${githubUsername}] Could not find GitHub user: ${error.message}`));
            await notify(error.status ?? 404, `Could not find a GitHub user with the username "${githubUsername}": ${error.message}`);
            continue;
          }

          // --- Invite to org ---
          let inviteStatus;
          try {
            const inviteRes = await orgService.inviteUser(githubUserId);
            inviteStatus = inviteRes.status;
            console.log(chalk.green(`[${githubUsername}] Invited to ${organization}.`));
          } catch (error) {
            if (error.status !== 422) {
              console.error(chalk.red(`[${githubUsername}] Failed to invite: ${error.message}`));
              await notify(error.status, `Failed to invite ${githubUsername}: ${error.message}`);
              continue;
            }

            const message = error.response?.data?.errors?.[0]?.message ?? '';
            if (message.includes('is already a part of this organization')) {
              console.log(chalk.yellow(`[${githubUsername}] Already a member of ${organization}.`));
              inviteStatus = 422;
            } else {
              console.error(chalk.red(`[${githubUsername}] Validation error (422): ${message}`));
              await notify(422, `Validation error for ${githubUsername}: ${message}`);
              continue;
            }
          }

          // --- Create repo from template ---
          let repoCreated = false;
          try {
            await repoService.createFromTemplate(
              options.template,
              repoName,
              '',
              true // private
            );
            repoCreated = true;
          } catch (error) {
            if (error.status === 422) {
              console.log(chalk.yellow(`[${repoName}] Repository already exists.`));
              repoCreated = true; // still sync labels
            } else {
              console.error(chalk.red(`[${repoName}] Failed to create repository: ${error.message}`));
              await notify(error.status ?? 500, `Failed to create repository ${repoName}: ${error.message}`);
              continue;
            }
          }

          // --- Add collaborator ---
          if (repoCreated) {
            try {
              await repoService.addCollaborator(repoName, githubUsername, 'push');
            } catch (error) {
              console.error(chalk.red(`[${repoName}] Failed to add ${githubUsername} as collaborator: ${error.message}`));
              await notify(error.status ?? 500, `Failed to add ${githubUsername} as collaborator to ${repoName}: ${error.message}`);
              continue;
            }

            // --- Wait for repo to be ready ---
            await new Promise(resolve => setTimeout(resolve, 1000));

            // --- Create branches ---
            try {
              const branchService = new BranchService(adminClient, organization);
              const branches = BranchService.getKmomBranches(options.branches);
              console.log(chalk.blue(`[${repoName}] Creating ${branches.length} branch(es)...`));
              const branchResults = await branchService.createBranches(repoName, branches);
              console.log(chalk.green(`[${repoName}] Branches: ${branchResults.created.length} created, ${branchResults.existing.length} existing, ${branchResults.failed.length} failed`));
            } catch (error) {
              console.error(chalk.red(`[${repoName}] Failed to create branches: ${error.message}`));
            }

            // --- Sync labels ---
            try {
              const labelResults = await orgService.syncLabelsToRepo(repoName, labelsConfig.labels || []);
              const total = labelResults.created.length + labelResults.updated.length + labelResults.deleted.length;
              console.log(chalk.green(`[${repoName}] Labels synced (${labelResults.created.length} created, ${labelResults.updated.length} updated, ${labelResults.deleted.length} deleted)`));
              if (labelResults.failed.length > 0) {
                labelResults.failed.forEach(f => console.log(chalk.red(`  • ${f}`)));
              }
            } catch (error) {
              console.error(chalk.red(`[${repoName}] Failed to sync labels: ${error.message}`));
            }

            // --- Notify Canvas ---
            if (inviteStatus === 422) {
              await notify(inviteStatus,
                `You are already a member of ${organization}.\n\nYour repo: ${repoUrl}`
              );
            } else {
              await notify(inviteStatus,
                `Invitation sent to ${githubUsername} successfully.\n\nGo to ${orgInviteUrl} to accept the invitation.\nYour repo: ${repoUrl}`
              );
            }
          }
        }
      }

      console.log(chalk.green('\n✅ All submissions processed!\n'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * Archive Repos Command
 * Finds all repos matching a prefix, downgrades admin collaborators to write,
 * renames repos with a suffix, and archives them.
 */
program
  .command('archive-repos')
  .description('Archive repositories matching a prefix: downgrade collaborators, rename, and archive')
  .requiredOption('-p, --prefix <prefix>', 'Repository name prefix to match (e.g. "algo")')
  .requiredOption('-s, --suffix <suffix>', 'Suffix to append to repo names (e.g. "h25")')
  .action(async (options) => {
    const prompt = new PromptManager();

    try {
      const org = getOrganizationName();
      const client = getGithubClient(UserRole.ADMIN);
      const repoService = new RepositoryService(client, org);
      const orgService = new OrganizationService(client, org);

      console.log(chalk.blue(`\n🔧 Using admin credentials for organization: ${org}\n`));

      // Fetch and filter repos matching prefix
      const pattern = `^${options.prefix}-`;
      const allRepos = await orgService.getRepositories([pattern]);

      if (allRepos.length === 0) {
        console.log(chalk.yellow(`No repositories found matching prefix "${options.prefix}-"`));
        return;
      }

      // Display matched repos
      console.log(chalk.blue(`Found ${allRepos.length} repository(ies) matching "${options.prefix}-":\n`));
      allRepos.forEach(repo => {
        console.log(chalk.white(`  • ${repo.name}${repo.archived ? chalk.gray(' (already archived)') : ''}`));
      });

      // Filter out already archived repos
      const repos = allRepos.filter(repo => !repo.archived);
      if (repos.length === 0) {
        console.log(chalk.yellow('\nAll matching repositories are already archived.'));
        return;
      }

      console.log(chalk.blue(`\n${repos.length} repository(ies) will be processed (skipping ${allRepos.length - repos.length} already archived).`));
      console.log(chalk.blue(`Each repo will be: collaborators downgraded (admin→write) → renamed to <name>-${options.suffix} → archived\n`));

      // Single batch confirmation
      const confirmed = await prompt.confirm(
        chalk.yellow(`Proceed with archiving ${repos.length} repository(ies)?`)
      );

      if (!confirmed) {
        console.log(chalk.yellow('\nOperation cancelled.\n'));
        return;
      }

      // Track results
      const results = {
        successful: [],
        failed: [],
        multiContributorRepos: []
      };

      for (const repo of repos) {
        console.log(chalk.blue(`\n─── Processing: ${repo.name} ───`));

        try {
          // 1. List outside collaborators
          const collaborators = await repoService.listCollaborators(repo.name);

          // Track repos with multiple collaborators
          if (collaborators.length > 1) {
            results.multiContributorRepos.push(repo.name);
            console.log(chalk.yellow(`  ⚠ Multiple outside collaborators (${collaborators.length}) — logged to multi-contributors.txt`));
          }

          // 2. Downgrade admin collaborators to write
          for (const collab of collaborators) {
            if (collab.permissions?.admin) {
              console.log(chalk.blue(`  Downgrading ${collab.login} from admin to write...`));
              await repoService.addCollaborator(repo.name, collab.login, 'push');
            }
          }

          // 3. Rename repo
          const newName = `${repo.name}-${options.suffix}`;
          await repoService.renameRepo(repo.name, newName);

          // Wait for GitHub to propagate the rename
          await new Promise(resolve => setTimeout(resolve, 1500));

          // 4. Archive repo (use new name after rename)
          await repoService.archiveRepo(newName);

          results.successful.push(repo.name);
        } catch (error) {
          console.log(chalk.red(`  ✗ Failed: ${error.message}`));
          results.failed.push(`${repo.name} - ${error.message}`);
        }
      }

      // Write multi-contributors file
      if (results.multiContributorRepos.length > 0) {
        const fileContent = results.multiContributorRepos.join('\n') + '\n';
        await fs.writeFile('multi-contributors.txt', fileContent, 'utf-8');
        console.log(chalk.blue(`\n📝 Wrote ${results.multiContributorRepos.length} repo(s) to multi-contributors.txt`));
      }

      // Summary
      console.log(chalk.blue.bold('\n═══════════════════════════════'));
      console.log(chalk.blue.bold('📊 ARCHIVE SUMMARY'));
      console.log(chalk.blue.bold('═══════════════════════════════\n'));

      console.log(chalk.green(`✓ Successful: ${results.successful.length}`));
      if (results.successful.length > 0) {
        results.successful.forEach(item => console.log(chalk.green(`  • ${item} → ${item}-${options.suffix}`)));
      }

      if (results.multiContributorRepos.length > 0) {
        console.log(chalk.yellow(`\n⚠ Multiple collaborators: ${results.multiContributorRepos.length}`));
        results.multiContributorRepos.forEach(item => console.log(chalk.yellow(`  • ${item}`)));
      }

      console.log(chalk.red(`\n✗ Failed: ${results.failed.length}`));
      if (results.failed.length > 0) {
        results.failed.forEach(item => console.log(chalk.red(`  • ${item}`)));
      }

      console.log(chalk.blue.bold('\n═══════════════════════════════\n'));
      console.log(chalk.green('✅ Archive operation complete!\n'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    } finally {
      prompt.close();
    }
  });

// Parse command line arguments
program.parse();
