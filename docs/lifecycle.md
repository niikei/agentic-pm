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

Give the agent the [project-cycle skill](../.agents/skills/github-project-cycle/SKILL.md), the parent issue, the approved outcome and the constraints. Ask it to identify existing issues, propose independently verifiable deliverables and explain which can start now. Review the proposal against the existing tree before creating records.

In the browser, use **Add sub-issue** on the parent for accepted work. Attach each child to the milestone and Project. In the dependent issue's **Relationships** menu, choose **Blocked by** for a real prerequisite. The same records are available through `gh`. Verify each child's parent, milestone and board status after publication. Record corrections on the parent. [Worked example](https://github.com/niikei/agentic-pm/issues/15)

## Deliver and replan

1. Select an unblocked issue and move it to **In Progress**. Create a branch,
   link the issue in the PR, and attach the check result.
2. If evidence changes the sequence, record the observation, decision,
   affected issue links and condition for reconsideration on the parent.
   Change the dependency relationship only when the actual prerequisite changes.
   Keep independent work moving. [Example decision](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7205444551)
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
Each milestone issue appears once with its number and title, including issues
missing from the board. Follow the title to read the decision or acceptance criteria.
The Project status, open dependency count and sub-issue counts come from
GitHub. Closed includes issues closed as not planned. External blockers such
as a pending login belong in the accompanying decision or handoff.

The **Open PRs** column links implementation PRs in the same repository
and marks drafts. The report reads up to ten linked PRs per issue. Follow
**See issue** when GitHub has more links. Review and CI status are on the PR.

Review the output before sharing it. Include a dated snapshot when the reader
needs to reconstruct a decision, and link the verified PR, check run, blocker
and next action. [Published example](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7199354981)

### Generate an executable work plan

You can run the plan against an existing public Project. For ranked work, use a single-select **Priority** field and order its options from highest to lowest. Without that field, the plan marks issues **Unranked** and orders them by issue number within each section. This Project uses High, Normal and Low. Put each deliverable's verifiable criteria under an **Acceptance criteria** heading on its issue, and use **Blocked by** for prerequisites.

```sh
mise exec -- node scripts/milestone-report.mjs niikei/agentic-pm 1 3 --plan
```

The plan reads open milestone issues. Within each section it uses the Project's option order, places unranked items last and breaks ties by issue number. The implementation queue gives a pickup or continuation step and quotes the issue's criteria. The other sections identify linked PRs, unresolved prerequisites, parent outcomes and issues that need triage. A parent whose children are complete still needs its outcome verified.

The queue recognizes the board's **Todo** and **In Progress** statuses. Review custom statuses, missing memberships and missing or complex acceptance criteria on the issue. The plan shows links to open PRs and blockers in the selected public repository. Follow the issue for additional relationships. Operators confirm decisions and permissions before acting.

For parent coordination, the plan reads the first ten child relationships in GitHub's order. Open children in the same repository are linked with their recorded blocker counts, including children assigned to another milestone or to none. Follow a child to confirm its outcome and scope before picking it up. Follow the parent for the complete list.

Change a priority or dependency on GitHub and rerun the command to replan. The [roadmap milestone](https://github.com/niikei/agentic-pm/milestone/3) and its [worked example](https://github.com/niikei/agentic-pm/issues/24) use the same records.
