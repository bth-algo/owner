# Documentation of this organisation

Documentation of the course setup, tools and CLI for working with the course.



## CLI tool overview

This repository contains a CLI tool (`bth-algo`) that automates common organisation management tasks. All commands are run from the project root.

### Installation

```bash
pnpm install
```

### Available commands

| Command | Description |
|---|---|
| `npm run configure-org` | Apply organisation settings (variables, secrets, privileges, rulesets, teams, labels) from config files |
| `npm run restore-org -- -b <file>` | Restore organisation settings from a backup file |
| `npm run create-repo -- -n <name>` | Create a repository from template with kmom branches |
| `npm run delete-repo -- -n <name>` | Delete a repository (admin only) |
| `npm run list-branches -- -n <name>` | List all branches in a repository |
| `npm run process-submissions` | Process Canvas submissions: invite students, create repos, sync labels, grade |
| `npm run archive-repos -- -p <prefix> -s <suffix>` | Archive repositories matching a prefix: downgrade collaborators, rename, and archive |

### archive-repos

Archives all repositories whose name starts with `<prefix>-`. For each matched repo:

1. Outside collaborators with `admin` permission are downgraded to `write`.
2. The repo is renamed to `<old-name>-<suffix>`.
3. The repo is archived.

Repositories with more than one outside collaborator have their names written to `multi-contributors.txt` in the project root for manual review.

```bash
npm run archive-repos -- -p <prefix> -s <suffix>

# Example: archive all python25-* repos, renaming them to *-h25
npm run archive-repos -- -p python25 -s h25
```

| Option | Required | Description |
|---|---|---|
| `-p, --prefix <prefix>` | Yes | Match repos whose name starts with `<prefix>-` |
| `-s, --suffix <suffix>` | Yes | Suffix appended to each repo name (e.g. `h25`) |

Already-archived repositories are skipped automatically. A single confirmation prompt is shown before any changes are made.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_ORG_NAME` | Yes | GitHub organisation name (e.g. `bth-algo`) |
| `GITHUB_ADMIN_TOKEN` | Yes | Admin token with scopes: `repo`, `delete_repo`, `admin:org` |
| `GITHUB_STUDENT_TOKEN` | Yes | Student token with scope: `repo` |
| `CANVAS_TOKEN` | For `process-submissions` | Canvas LMS API token |

### Configuration files

All configuration lives in `org-settings/`:

| File | Purpose |
|---|---|
| `action-variables.json` | GitHub Actions organisation variables |
| `action-secrets.env` | GitHub Actions organisation secrets |
| `member-privileges.json` | Organisation member privilege settings |
| `branch-rulesets.json` | Branch protection rulesets |
| `teams.json` | Team definitions and members |
| `labels.json` | Label definitions and repo-matching patterns |
| `courses.json` | Canvas course mappings for `process-submissions` |
| `copilot-settings.json` | Copilot settings (placeholder) |



## Steps to set up the organisation

Below are the tasks that need to be done, in order. Each section explains **what** needs to happen and **how** — either manually through the GitHub UI or with the CLI tool.



### 1. Create the organisation

**What:** A GitHub organisation needs to exist.

**How (manual):** Ask Oscar to create the organisation (e.g. `bth-algo`, `bth-webtec`). Give him your GitHub username so he can add you as owner. Ask him to enable SSO.



### 2. Create the owner repo

**What:** A private repo for documentation, scripts and configuration of the organisation.

**How (manual):** Create a private repo in the organisation. This is the repo you are reading now.



### 3. Add owners

**What:** Invite individuals who manage the course structure as organisation owners. Keep it to a minimum. Ordinary teachers belong in the teacher team instead.

**How (manual):** Invite via the GitHub organisation settings page.



### 4. Add a teacher team and teachers

**What:** A team called `teacher` that can view all student repos and approve pull requests.

**How (manual):**
1. [Create the team](https://github.com/orgs/bth-algo/teams) with the name `teacher`.
2. Add teachers as ordinary members of the organisation and add them to the team.
3. Give the team the [triage role for all repositories ("All-repository triage")](https://github.com/organizations/bth-algo/settings/org_role_assignments) so they can see private student repos.

**How (CLI):** Configure teams in `org-settings/teams.json` and run:
```bash
npm run configure-org
```



### 5. Configure organisation settings

**What:** Member privileges, branch rulesets, action secrets/variables and labels need to be set.

**How (manual):** See [README_organisation.md](./README_organisation.md) for the full list of settings and where to find them in the GitHub UI.

**How (CLI):** All settings are defined in `org-settings/` config files. Apply them all at once:
```bash
npm run configure-org
```
The command walks through each category (variables, secrets, privileges, rulesets, teams, labels) and asks for confirmation before each change. A backup of current settings is created automatically before any changes are made.



### 6. Add website repo

**What:** A public repo for the course website, published via GitHub Pages.

**How (manual):** Create a repo named `bth-algo.github.io` and enable GitHub Pages in the repo settings.



### 7. Add template repo

**What:** A template repo containing the starter files for student repos.

**How (manual):** See [README_templaterepo.md](./README_templaterepo.md) for what the template should contain.



### 8. Add a test student user

**What:** A student user to verify that students see the correct things.

**How (manual):**
1. Invite your student user to the organisation as an ordinary member (no team).
2. Accept the invitation (e.g. in an incognito browser).
3. Verify the student can see the website repo but **not** the owner repo.

**How (CLI):**
```bash
npm run create-repo -- -n algo-teststud -t template2 -u <student-github-username>
```

See [README_student.md](./README_student.md) for setting up local Git as the student user.



### 9. Add a default student repo

**What:** A reference repo that looks exactly like a real student repo, useful for testing.

**How (manual):** Create an internal repo (e.g. `algo-abcd26`) from the template. Verify with your student user that it is visible.

**How (CLI):**
```bash
npm run create-repo -- -n algo-abcd26 -t template2
```



### 10. Integrate with Canvas

**What:** When a student submits their GitHub username on Canvas, a repo should be created, the student invited to the org, labels synced, and Canvas graded automatically.

**How (manual):** For each submission: invite the student to the org, create a repo from the template, add them as collaborator, set labels on the repo, and update the Canvas grade.

**How (CLI):**
1. Configure `org-settings/courses.json` with your Canvas course/assignment IDs:
   ```json
   [
     {
       "courseId": 7052,
       "assignmentId": 64521,
       "organization": "bth-algo",
       "repoPrefix": "algo"
     }
   ]
   ```
   - `courseId` / `assignmentId` — from the Canvas URL
   - `organization` — the GitHub org for this course (allows multi-org support)
   - `repoPrefix` — student repos will be named `<repoPrefix>-<email-prefix>` (e.g. `algo-abcd25`)

2. Set `CANVAS_TOKEN` in `.env`.

3. Run once:
   ```bash
   npm run process-submissions
   ```

4. Or schedule with PM2 to run every 3 minutes:
   ```bash
   npx pm2 start ecosystem.config.js
   ```

**What happens per submission:**
1. Fetches all submissions with status `submitted` from Canvas.
2. Looks up the GitHub user by the username the student submitted.
3. Invites the user to the organisation (skips if already a member).
4. Creates a private repo from the template (default `template2`, override with `--template`).
5. Adds the student as collaborator with push access.
6. Creates kmom branches (`bth/submit/kmom03`) — override with `--branches all` to also create `kmom06` and `kmom10`.
7. Syncs labels from `org-settings/labels.json` onto the repo (creates missing, updates existing, deletes extras).
8. Posts the grade and a comment back to Canvas with the repo URL and invitation link.

**Options:**
```bash
npm run process-submissions -- --template my-other-template --branches all
```
