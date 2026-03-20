# Template repo

## Content

create a repo that contain all the config and files the students need.

- `.github`
- `.gitignore`
- `.vscode`
- `.editorconfig`
- `tests`
- `Taskfile.yml`

## Student GitHub repo

### Information

Important repos:

- utils2 - GitHub workflow used from student repo
- template2 - the template repo used to create student repos
- owner - scripts for creating student repo and information about the organisation  

(utils och template is used for the python course)


### How to create student repo

1. The student hands in the task **Github invite** on Canvas with their GitHub account.
2. A student repo should be created (manually or crontab job) with the student <GithubUser> and its acronym <abcd25>.
`npx bth-algo create-repo -n algo-<abcd25> -t template2 -d "Course repo for algo" -b kmom03-only -u <githubAccount>`  
-n the name of the template repo (template2 in bth-algo)
-b kmom03-only means that main and only branch `bth/submit/kmom03` is created
3. The student finds its repo on GitHub, clonaes it in the  `dbwebb-kurser`-directory and run **task setup**. Run suggested commands until every test is green.

NOTE: if student repo does not get labels, run:
`npm run configure-org`
answer n (no) to everything except: 

```text
═══ LABELS ═══  
Found 8 label(s) to manage  
Found 6 repositories matching patterns

Apply labels to 6 existing repositories? (Y/n) Y
```
=> the student repo gets its labels


### Hand in kmom01 and kmom02

1. Do the task in the kmom
2. tag when you are ready

### PR kmom03

1. No code to hand in. Do a PR an follow the instructions."


### Example of commands

```bash
# List all branches in the algo-grmstud repo
npx bth-algo list-branches -n algo-grmstud

# Create repo with all the branches
npx bth-algo create-repo -n algo-grmstud -t template2 -d "Course repo for algo" -b all -u grmstud

# Create repo with only branch kmom03
npx bth-algo create-repo -n algo-grmstud2 -t template2 -d "Course repo for algo" -b kmom03-only -u grmstud
```

### Commands that does not work

```bash
# Delete repo algo-grmstud
npx bth-algo delete-repo -n algo-grmstud
```
But it works to remove a repo from GitHub.
