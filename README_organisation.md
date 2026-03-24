# Documentation of how to configure the organisation and its repos

This README is specifically for the settings of the organisation and its repos to maintain visibility to those who need it and disallow for other members.


## How to setup the organisation

Go to settings of the organisation and setup the following.



### Member privileges

https://github.com/organizations/bth-algo/settings/member_privileges

**Base permissions**

Set "Base permissions" to "No permission". Members will only be able to clone public/internal repos. The private repos are not visible for members. 

**Repository creation**

Update so "Repository creation" is only checked for "Private". This means that all members can only create private repos.

* [ ] Public
* [x] Private
* [ ] Internal

**Outside collaborators**

Uncheck.

* [ ] Allow repository administrators to invite outside collaborators to repositories for this organization

**Pages creation**

Disallow "Public" and allow "Private" so all sites are visible for the ones who have permissions.

* [ ] Public
* [x] Private

**App access requests**

Only allow members to request App access. (dont know if this if needed)

* [x] Members only

**GitHub Apps**
Disallow students to install Github Apps (dont know if this if needed)

* [ ] Allow repository admins to install GitHub Apps for their repositories.


**Repository visibility change**

* [ ] Allow members to change repository visibilities for this organization

**Repository deletion and transfer**

* [ ] Allow members to delete or transfer repositories for this organization

**Team creation rules**

* [ ] Allow members to create teams



### Add branch protection rule

Must need PR to merge with bth/submit

https://github.com/organizations/bth-algo/settings/rules

![](img/branch_ruleset_1.png)
![](img/branch_ruleset_2.png)
![](img/branch_ruleset_3.png)



### Add labels

Labels are used when grading submissions. GitHub does not support organisation-level labels — they must be set on individual repositories.

**What needs to happen:**
- Each student repo (and the template repo) should have the labels defined in `org-settings/labels.json`.
- Labels not in that file should be removed from student repos.

**How (manual):** Go to each repo's _Issues → Labels_ page and create/edit/delete labels to match `org-settings/labels.json`.

**How (CLI) — bulk apply to existing repos:**
```bash
npm run configure-org
```
Answer `Y` when prompted to apply labels. This creates/updates labels on all repos matching the patterns in `labels.json` (e.g. `algo-.*`).

**How (CLI) — single repo sync (including deletion of extras):**
The `process-submissions` command automatically syncs labels (create, update, **and delete** extras) on each student repo it creates.

To ensure new repos inherit labels from the start, also add the labels to your **template repository**.

![](img/label.png)



## Repository forking

If the students should fork repos. We currently don't use forking so don't do this.

https://github.com/organizations/bth-algo/settings/member_privileges

* [x] Allow forking of private and internal repositories

    * [x] Within the same organization



### Copilot coding agent

Turn off repository access, "No repositories".


### Actions secrets and variables

**What needs to happen:** GitHub Actions workflows (e.g. for running student tests) need access to tokens and course data.

**How (manual):** Configure at https://github.com/organizations/bth-algo/settings/secrets/actions and https://github.com/organizations/bth-algo/settings/variables/actions.

**How (CLI):**
1. Define secrets in `org-settings/action-secrets.env` and variables in `org-settings/action-variables.json`.
2. Run:
   ```bash
   npm run configure-org
   ```

#### Secrets

- `READ_ORG_TOKEN` — GitHub token with read access to the org. Classic token is easier than fine-grained.

#### Variables

- `COURSE_ID` — Canvas course ID.
- `ASSIGNMENTS` — mapping of branch names to Canvas assignment IDs, e.g.:
    ```json
    {
      "bth/submit/kmom03": 58711,
      "bth/submit/kmom06": 58714,
      "bth/submit/kmom10": 58715
    }
    ```

> **Note:** The Canvas integration for grading (inviting students, creating repos) runs from the CLI via `npm run process-submissions`, **not** from GitHub Actions. The Canvas token (`CANVAS_TOKEN`) is stored in the local `.env` file, not as an Actions secret.
