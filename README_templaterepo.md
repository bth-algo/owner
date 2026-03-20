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
3. Studenten letar upp sitt repo, klonar det i `dbwebb-kurser`-katalogen och kör **task setup**. Allt ska bli grönt.


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
