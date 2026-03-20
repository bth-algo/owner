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
2. A student repo should be created (manually or crontab job).  
```bash
cd src/invite-to-organisation
pnpm install
node invite.mjs
```
3. The student finds its repo on GitHub, clones it in the  `dbwebb-kurser`-directory and run **task setup**. Run suggested commands until every test is green.


### Hand in kmom01 and kmom02

1. Do the task in the kmom (git add, git commit and push)
2. tag when you are ready
```bash
git tag -a v01.0 -m "First draft of kmom01."
git push --tags
```

If something goes wrong, follow the instructions and try again.

### PR kmom03

1. No code to hand in. Do a PR and follow the instructions."



### Commands that does not work

```bash
# Delete repo algo-grmstud
npx bth-algo delete-repo -n algo-grmstud
```
But it works to remove a repo from GitHub.

### If issues with labels in when creating student repo

NOTE: if student repo does not get labels, run:
`./set_labels_on_studentrepo.sh <algo-abcd25>` som ligger i src/invite-to-organisation
`npm run configure-org`
answer n (no) to everything except: 

```text
═══ LABELS ═══  
Found 8 label(s) to manage  
Found 6 repositories matching patterns

Apply labels to 6 existing repositories? (Y/n) Y
```
=> the student repo gets its labels

