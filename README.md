# Documentation of this organisation 

Documentation of the course setup and tools to work with the course.

These are the steps to get going setting up the organisation.



## The organisation

Ask Oscar to create the organisation for you, name it "bth-algo" or "bth-webtec" or similair.

Give Oscar your GitHub acronym so he can add you as owner of the organisation.

Ask him to enable SSO.



## The owner repo

Create a owner repo to keep documentation of the setup of the organisation and workflow.

You can also use the owner repo to store utilities and scripts used when working with the course.

Make the owner repo private.



## Add owners of the organisation

Invite the individuals who should be owners of the repo. Keep it to a minimum to avoid disasters, select those who will work with the course structure. 

Ordinary teachers can be part of the teacher team.



## Add a teacher team & teachers

[Create the team for the teachers](https://github.com/orgs/bth-algo/teams), use the team name "teacher". The teachers should be able to view all students repo and to approve pull requests.

Add the individuals who should act as teachers. Add them as ordinary members of the organisation and add them to the teacher team.

The team teacher should have the [triage role for all repositories ("All-repository triage")](https://github.com/organizations/bth-algo/settings/org_role_assignments), otherwise they do not see the private repos created by the students. 



## How to setup the organisation

Review this [README](./README_organisation.md) on how to setup the organisation.



## Add website repo

Add the website repo for the course, name it as `bth-algo.github.io/`. Make it public so students can issue about improvements. Publish the website as GitHub pages.

## Add template repo

Review this [README](./README_templaterepo.md) on how to setup the template repo.



## Add your student user to the organisation - BELOW IS NOT UPDATED

You should have a student user to be able to verify that the students see the correct things. This is how to work with the student user.



### Invite

Invite your student user to the organisation, as an ordinary member without a team. You get an email with the invitation, I open up an incognito browser and puts the invitation link there. _Unsure if SSO is a good thing or not, and if it can be enforced to all students or if it is optional._

The student user should see the website repo, but not the owner repo.

(Verify that the student user can not push to website...)



### Work with git as student

Setup so you can work as the student user with Git, locally. Review this [README](./README_student.md) on how to setup that.



## Add default student repo

Its useful to have a default student repo, that looks exact like the first student repo that the students should use. YOu can then opt to let students use this repo as a template, or fork it, as a staRting point.

Create an internal repo (with your teacher user) like algo-abcd26. If you change things, later on, you can add more repos with different names, for example algo-abcd27.

Verify that it is the teacher user that made the first commit.

Verify that your student user can see the student repo.



## How to integrate with Canvas

The steps to integrate the GitHub organisation with Canvas is explained in [its own README](./README_canvas.md).
