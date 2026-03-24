# Template repo

## What the template contains

The template repo should contain all config and starter files that students need:

- `.github/` — workflows for testing and grading
- `.gitignore`
- `.vscode/` — recommended editor settings
- `.editorconfig`
- `tests/` — test suites for each kmom
- `Taskfile.yml` — task runner commands

## Important repos

| Repo | Purpose |
|---|---|
| `template2` | Template repo used to create student repos |
| `utils2` | GitHub workflow used from student repos |
| `owner` | This repo — scripts and documentation about the organisation |

> `utils` and `template` (without the `2`) are used for the Python course.



## Student workflow

### 1. Create student repo

**What needs to happen:** When a student submits their GitHub username on Canvas, a private repo should be created from the template, the student invited to the org as collaborator, branches created, and labels synced.

**How (manual):**
1. Invite the student to the org.
2. Create a repo from `template2` named `algo-<student-acronym>`.
3. Add the student as collaborator with push access.
4. Create branches: `bth/submit/kmom03`, `bth/submit/kmom06`, `bth/submit/kmom10`.
5. Apply labels from `org-settings/labels.json` to the repo.
6. Post the repo URL as a comment on their Canvas submission and grade with G.

**How (CLI) — process all pending submissions at once:**
```bash
npm run process-submissions
```
This fetches all `submitted` submissions from Canvas, creates repos, creates kmom branches, invites students, syncs labels, and grades — all automatically. See the [main README](./README.md#10-integrate-with-canvas) for configuration details.

**How (CLI) — create a single repo manually:**
```bash
npm run create-repo -- -n algo-abcd25 -t template2 -u studentGitHubUsername
```

**How (CLI) — schedule with PM2 (runs every 3 minutes):**
```bash
npx pm2 start ecosystem.config.js
```

### 2. Student: clone and setup

The student finds their repo on GitHub, clones it into the `dbwebb-kurser` directory and runs `task setup`. Follow suggested commands until every test is green.

### 3. Hand in kmom01 and kmom02

1. Do the task in the kmom (`git add`, `git commit` and `git push`).
2. Tag when ready:
```bash
git tag -a v01.0 -m "First draft of kmom01."
git push --tags
```
If something goes wrong, follow the instructions and try again.

### 4. PR for kmom03

No code to hand in. Create a PR and follow the instructions.



## Troubleshooting

### Delete a student repo

**How (manual):** Delete the repo from the GitHub UI.

**How (CLI):**
```bash
npm run delete-repo -- -n algo-grmstud
```

### Fix missing labels on a student repo

**What:** A student repo is missing the expected labels, or has extra default labels that should be removed.

**How (CLI) — sync labels on a single repo:**
Re-run `process-submissions` — it will sync labels on repos that already exist (creating missing labels, updating changed ones, deleting extras).

**How (CLI) — bulk apply labels to all matching repos:**
```bash
npm run configure-org
```
Answer `n` to everything except:
```text
═══ LABELS ═══
Found 8 label(s) to manage
Found 6 repositories matching patterns

Apply labels to 6 existing repositories? (Y/n) Y
```

> **Note:** `configure-org` creates and updates labels but does not delete extras. Use `process-submissions` for full sync (create + update + delete).

