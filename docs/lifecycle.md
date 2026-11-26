# Run a project cycle

Use a public GitHub repository, a public Project owned by the same user or
organization, and a milestone for the delivery. Add the repository to the
Project. In a fork, change the Project identifier in the
[task form](../.github/ISSUE_TEMPLATE/task.yml). Keep the Project's Status
field visible on a board. The [v0.1 parent issue](https://github.com/niikei/agentic-pm/issues/5)
shows the live work breakdown.

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
the dependent issue's **Relationships** menu. A parent groups deliverables;
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

To publish a checkpoint, generate it to a temporary file and review it.
From this repository, the following posts it on the release parent.

```sh
report=$(mktemp)
mise exec -- node scripts/milestone-report.mjs niikei/agentic-pm 1 2 > "$report" &&
  cat "$report"
```

```sh
gh issue comment 5 --repo niikei/agentic-pm --body-file "$report"
```

Use a fresh snapshot at the next handoff and link the verified PR, check run,
outstanding blocker and next action. [Published example](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7199354981)
