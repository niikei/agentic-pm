# Run a project cycle

Use a public GitHub repository, a public Project owned by the same user or
organization, and a milestone for the delivery. Add the repository to the
Project. In a fork, change the Project identifier in the
[task form](../.github/ISSUE_TEMPLATE/task.yml). Keep the Project's Status
field visible on a board. The [v0.1 parent issue](https://github.com/niikei/agentic-pm/issues/5)
shows the live work breakdown.

## Start with one outcome

In the browser, search the Project for the result you need. Open the matching
issue or choose **Issues → New issue → Project task** in the repository.
Describe who will use the result and how they can tell it works. Check the
Project and Status in the issue sidebar. Reading the board takes a browser;
creating an issue or changing its Project needs the corresponding GitHub access.

For example, a workshop needs a public schedule and a volunteer check-in
guide. With one owner and one review, both can be checkboxes on one issue.
Give each document its own issue when different people can deliver and
verify them independently. Keep drafting and proofreading as steps inside
each issue. Add a dependency when finishing one outcome really requires another.

If the morning room becomes unavailable, the schedule owner can prepare an
afternoon option while the guide owner rehearses check-in. Record one question on the schedule issue and link it from the
guide issue. “The afternoon room is available. May we change the advertised
time, and which accessibility contact may both documents use?”
The sponsor decides. On return, read the reply, check the approved time and
contact in both drafts, then publish through the usual review.

## Generate and review the work breakdown

Open [Copilot Chat on GitHub](https://github.com/copilot) in a session that
can create issues in the repository. Substitute your parent issue, outcome
and constraints in this prompt.

> For OWNER/REPO#PARENT, draft a work breakdown for OUTCOME under CONSTRAINTS.
> Check existing sub-issues first. Reuse matching issues. For each missing
> deliverable, draft a Project task with an outcome, observable acceptance
> criteria, and public evidence or constraints. Explain which work genuinely
> depends on another issue and which can start now. Leave owners, dates and
> publication to the maintainer.

Review the draft tree, remove duplicates, and correct unsupported claims.
Use **Review and create** to publish accepted drafts. Check each child's
parent, milestone, Project and Status. Add **Blocked by** relationships from
the dependent issue's **Relationships** menu. For CLI-created issues, pass
`--project` explicitly and check the resulting item. [Intake trial](https://github.com/niikei/agentic-pm/issues/3#issuecomment-7199470020). A parent groups deliverables;
a dependency records ordering. Capture the published issue URLs and the
corrections on the parent. [GitHub's Copilot issue guide](https://docs.github.com/en/copilot/how-tos/copilot-on-github/copilot-for-github-tasks/use-copilot-to-create-or-update-issues)

## Deliver and replan

1. Select an unblocked issue and move it to **In Progress**. Create a branch,
   link the issue in the PR, and attach the check result.
2. If evidence changes the sequence, record the observation, decision,
   affected issue links and condition for reconsideration on the parent.
   Change the dependency relationship only when the actual prerequisite changes.
   Keep independent work moving. [Example decision](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7199295133)
3. Verify the criteria before closing the issue. Check its Project status,
   the parent's sub-issue count and the dependent issue's open blockers. A
   maintainer handles merge and release decisions. [Contributor workflow](../CONTRIBUTING.md#public-review-workflow)

## Generate a progress report

For a routine update, open the Project, read the issue titles and Status, and
open the relevant issue for its acceptance criteria, dependencies and latest
decision. An issue can show **In Progress** while it waits for a person.
For the total number of issues and pull requests, open the milestone. For
a dated handoff, record what passed, what needs a decision and what can
proceed in one place, then share the link.

### Verify a milestone snapshot

Use an authenticated GitHub CLI with read access to the Project. From the
repository root, provide the repository, Project number and milestone number.

```sh
mise exec -- node scripts/milestone-report.mjs niikei/agentic-pm 1 2
```

The command reads live GitHub data and writes Markdown to standard output.
Each milestone issue appears once, including issues missing from the board.
The Project status, open dependency count and sub-issue counts come from
GitHub. Closed includes issues closed as not planned. External blockers such
as a pending login belong in the accompanying decision or handoff.

Review the output before sharing it. Include a dated snapshot when the reader
needs to reconstruct a decision, and link the verified PR, check run, blocker
and next action. [Published example](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7199354981)
