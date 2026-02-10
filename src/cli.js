#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getGithubClient, getOrganizationName, UserRole } from './auth/github-client.js';
import { RepositoryService } from './services/repository.service.js';
import { BranchService } from './services/branch.service.js';

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

// Parse command line arguments
program.parse();
