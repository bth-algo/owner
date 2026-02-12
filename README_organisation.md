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

The labels are used when grading the submissions. Labels are managed through the configuration tool.

**Important:** GitHub's API does not support organization-level labels. Labels must be set on individual repositories.

**Recommended Approach:**
1. Configure labels in `org-settings/labels.json`
2. Run `npm run configure-org` to apply labels to existing repositories matching the configured patterns
3. **Add the same labels to your template repository** so all new repositories created from the template will automatically inherit them

The configuration tool can apply labels to multiple repositories at once based on regex patterns (e.g., `algo-.*` matches all student repos starting with "algo-").

![](img/label.png)



## Repository forking

If the students should fork repos. We currently don't use forking so don't do this.

https://github.com/organizations/bth-algo/settings/member_privileges

* [x] Allow forking of private and internal repositories

    * [x] Within the same organization



### Copilot coding agent

Turn off repository access, "No repositories".


### Actions secrets and variables - Not updated

Hur ska vi göra här? köra canvas integration i workflows eller från en server. Det påverkar vad som behövs här.

Jag vet inte om/hur de ska köra tester i C# det påverkar också vad som ska ligga här.

#### Secrets

- `READ_ORG_TOKEN` - Github token with access to ORG. Created from a user. Classic token i easier than fine-grade.
- `CANVAS_API_TOKEN` - ?

#### Variables

- `COURSE_ID` -  Canvas course ID
- `ASSIGNMENTS` -  if using dynamic code for checking what to test use this. Ex.
    ```
    {
    "bth/submit/kmom03": 58711,
    "bth/submit/kmom06": 58714,
    "bth/submit/kmom10": 58715,
    "bth/submit/test-gitconfig": 59262
    }
    ```
- `KMOM_PATHS` - if using dynamic code for checking what to test use this. Ex.
    ```
    {
    "bth/submit/kmom03": 58711,
    "bth/submit/kmom06": 58714,
    "bth/submit/kmom10": 58715,
    "bth/submit/test-gitconfig": 59262
    }
    ```
