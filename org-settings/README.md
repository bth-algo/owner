# Organization Settings Configuration

This folder contains configuration files for setting up the GitHub organization settings.

## Files

### `action-variables.json`
Contains GitHub Actions variables that will be set at the organization level.

Example:
```json
{
  "COURSE_ID": "12345",
  "ASSIGNMENTS": {
    "bth/submit/kmom03": 58711,
    "bth/submit/kmom06": 58714,
    "bth/submit/kmom10": 58715
  },
  "KMOM_PATHS": {
    "bth/submit/kmom03": 58711,
    "bth/submit/kmom06": 58714,
    "bth/submit/kmom10": 58715
  }
}
```

### `action-secrets.env`
Contains GitHub Actions secrets that will be set at the organization level.

**Important:** This file should be added to `.gitignore` and never committed to version control.

Example:
```env
READ_ORG_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CANVAS_API_TOKEN=your_canvas_api_token_here
```

### `member-privileges.json`
Organization member privilege settings including repository creation, pages, teams, etc.

### `branch-rulesets.json`
Branch protection rulesets. Defines rules like requiring PRs for specific branch patterns.

**Rule Types:**
- `pull_request` - Require pull requests before merging
- `update` - Restrict updates (only users with bypass permission can update matching refs)
- `deletion` - Restrict deletions (only users with bypass permission can delete matching refs)
- `non_fast_forward` - Block force pushes (prevent force pushing to refs)

**Repository Targeting:**
- `"include": ["~ALL"]` - Apply to all repositories in the organization
- `"include": ["student-*"]` - Apply to repos matching pattern (e.g., all repos starting with "student-")
- `"include": ["repo1", "repo2"]` - Apply to specific repositories
- `"exclude": ["template-*"]` - Exclude repos matching pattern

**Example:**
```json
{
  "conditions": {
    "ref_name": {
      "include": ["bth/submit/*"],
      "exclude": []
    },
    "repository_name": {
      "include": ["~ALL"],
      "exclude": ["template-repo", "admin-*"],
      "protected": false
    }
  }
}
```

### `copilot-settings.json`
GitHub Copilot repository access settings.

### `teams.json`
Organization teams configuration including members and their roles.

### `labels.json`
Repository labels for grading and workflow management.

**Important Notes:**
- GitHub's API does not support organization-level labels
- Labels are applied to individual repositories matching the configured patterns
- **Best Practice**: Add these labels to your template repository so all new repositories created from the template will automatically inherit them
- The tool will prompt to apply labels to existing repositories matching the `apply_to_repos` patterns

**Example:**
```json
{
  "labels": [
    {
      "name": "Grade: A",
      "color": "0e8a16",
      "description": "Excellent work"
    }
  ],
  "apply_to_repos": [
    "algo-.*",
    ".*stud",
    "template",
  ]
}
```

The `apply_to_repos` field uses regex patterns to match repository names.

### `backups/`
Directory containing timestamped backups of organization settings.

## Usage

### Configure Organization
Run the configure command to update organization settings:

```bash
npm run configure-org
```

The tool will:
1. Create a timestamped backup of current settings
2. Read desired settings from these files
3. Compare with current organization settings
4. Ask for confirmation for each change individually
5. Apply the approved changes
6. Display a summary of successful and failed changes

### Restore from Backup
Restore organization settings from a previous backup:

```bash
node src/cli.js restore-org --backup org-settings/backups/backup-YYYY-MM-DD-HHMMSS.json
```

The restore process will:
1. Read the backup file
2. Compare with current settings
3. Ask for confirmation for each change
4. Apply approved changes (secrets read from current action-secrets.env)
5. Display a summary

## Settings Included

- **Action Variables**: Canvas course IDs, assignment mappings, kmom paths
- **Action Secrets**: Organization tokens (READ_ORG_TOKEN, CANVAS_API_TOKEN)
- **Member Privileges**: Base permissions, repository creation rules, forking, pages, visibility changes, deletion/transfer, team creation
- **Branch Rulesets**: Pull request requirements for branch protection
- **Teams**: Organization teams with members and roles
- **Labels**: Repository labels for grading and workflow (applied per-repository, not org-wide)
- **Copilot Settings**: Repository access configuration
