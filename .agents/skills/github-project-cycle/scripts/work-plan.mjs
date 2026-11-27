import {
  headCheckState,
  issueLink,
  markdownText,
  openPullRequests,
  projectItem,
  pullRequestLinks,
} from "./milestone-markdown.mjs";

const sections = [
  "Implementation queue",
  "Human decisions",
  "Pull requests",
  "Waiting on dependencies",
  "Parent outcomes",
  "Needs triage",
];

// Quote simple Issue Form text. Leave complex Markdown and task state on GitHub.
function acceptanceCriteria(body) {
  const visible = body.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
  let fence = "";
  let level = 0;
  const lines = [];
  for (const line of visible.split(/\r?\n/)) {
    if (fence) {
      const trimmed = line.trim();
      if (trimmed.startsWith(fence) && /^(`+|~+)$/.test(trimmed)) fence = "";
      continue;
    }
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (marker) {
      if (level) return "";
      fence = marker[1];
      continue;
    }
    const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
    if (heading && level && heading[1].length <= level) break;
    if (heading && !level && /^acceptance criteria$/i.test(heading[2])) {
      level = heading[1].length;
    } else if (level) {
      lines.push(line);
    }
  }
  const section = lines.join("\n").trim();
  return section === "_No response_" ? "" : section;
}

const decisionAction =
  "Ask the authorized decision maker to record the answer on the issue.";

function nextAction(issue, repo, item, prs, criteria, needsDecision) {
  const blockers = issue.issueDependenciesSummary.blockedBy;
  if (blockers) {
    const visible = issue.blockedBy.nodes.filter(
      (blocker) =>
        blocker.state === "OPEN" && blocker.repository.id === repo.id,
    );
    const links = visible.map(
      (blocker) => `[#${blocker.number}](${blocker.url})`,
    );
    if (links.length < blockers)
      links.push(`[Issue relationships](${issue.url})`);
    return [
      "Waiting on dependencies",
      `Resolve ${blockers} open ${blockers === 1 ? "prerequisite" : "prerequisites"}. ${links.join(", ")}`,
    ];
  }

  if (needsDecision) return ["Human decisions", decisionAction];
  if (!issue.labels || issue.labels.pageInfo.hasNextPage)
    return [
      "Needs triage",
      "Verify all issue labels for a pending decision before choosing work.",
    ];

  if (prs.length) {
    const failing = prs.find((pr) =>
      ["ERROR", "FAILURE"].includes(headCheckState(pr)),
    );
    if (failing) {
      const next = [
        `Investigate the failing checks on [#${failing.number}](${failing.url}). Inspect required checks with \`gh pr checks ${failing.url} --required\`.`,
      ];
      if (
        failing.reviewDecision === "REVIEW_REQUIRED" &&
        failing.reviewRequests?.totalCount === 0
      )
        next.push("Confirm who will provide the required review.");
      return ["Pull requests", next.join(" ")];
    }
    if (prs.some((pr) => pr.reviewDecision === "CHANGES_REQUESTED"))
      return [
        "Pull requests",
        "Address the requested changes on the linked PR.",
      ];
    const next = prs.some((pr) => !pr.isDraft)
      ? "Review the open PR and its checks."
      : "Continue the draft implementation.";
    return ["Pull requests", next];
  }
  if (issue.closedByPullRequestsReferences.pageInfo.hasNextPage)
    return [
      "Needs triage",
      "Inspect the remaining linked PRs before starting work.",
    ];

  const { completed, total } = issue.subIssuesSummary;
  if (total) {
    const next =
      completed === total
        ? "Verify the completed children against the parent outcome."
        : "Coordinate the remaining child issues.";
    return [
      "Parent outcomes",
      `${next} ${completed}/${total} children complete.`,
    ];
  }
  if (!item) {
    const next = issue.projectItems.pageInfo.hasNextPage
      ? "Verify membership in the selected Project."
      : "Add the issue to the Project or confirm it is out of scope.";
    return ["Needs triage", next];
  }
  const status = item.fieldValueByName?.name;
  if (status !== "In Progress" && status !== "Todo") {
    const next = status
      ? `Confirm the next action for Project status **${markdownText(status)}** with the issue owner.`
      : "Confirm the Project status and next action with the issue owner.";
    return ["Needs triage", next];
  }
  if (!criteria)
    return [
      "Needs triage",
      "Review the issue and confirm its acceptance criteria before implementation.",
    ];
  if (status === "In Progress")
    return ["Implementation queue", "Continue the active implementation."];
  return [
    "Implementation queue",
    "Pick up the issue and move it to In Progress.",
  ];
}

function childEvidence(parent, repositoryId) {
  const { completed, total } = parent.subIssuesSummary;
  if (completed === total) return [];
  const children = (parent.subIssues?.nodes ?? []).filter(
    (child) => child?.state === "OPEN" && child.repository.id === repositoryId,
  );
  const lines = children.map(
    (child) =>
      `  - Child ${issueLink(child)} · Open blockers: ${child.issueDependenciesSummary.blockedBy}`,
  );
  if (
    parent.subIssues?.pageInfo.hasNextPage ||
    children.length < total - completed
  )
    lines.push(`  - [Inspect all child relationships](${parent.url})`);
  return lines;
}

export function renderWorkPlan(repo, issues) {
  const project = repo.owner.projectV2;
  const priorityField = project.fields.nodes.find(
    (field) => field?.name === "Priority",
  );
  const options = priorityField?.options ?? [];
  const groups = new Map(sections.map((section) => [section, []]));

  const openIssues = issues.filter((issue) => issue.state === "OPEN");
  for (const issue of openIssues) {
    const item = projectItem(issue, project.id);
    const rank = options.findIndex(
      (option) => option.id === item?.priority?.optionId,
    );
    const criteria = acceptanceCriteria(issue.body);
    const prs = openPullRequests(issue, repo.id);
    const needsDecision = issue.labels?.nodes.some(
      (label) => label?.name.toLowerCase() === "needs decision",
    );
    const [group, next] = nextAction(
      issue,
      repo,
      item,
      prs,
      criteria,
      needsDecision,
    );
    groups.get(group).push({
      issue,
      needsDecision,
      next,
      rank: rank < 0 ? options.length : rank,
      criteria,
      prs,
    });
  }

  const lines = [
    "## Milestone work plan",
    "",
    `[Milestone](${repo.milestone.url}) · [Project](${project.url})`,
    "",
  ];
  if (!openIssues.length)
    return [...lines, "No open milestone issues."].join("\n");
  if (!priorityField)
    lines.push(
      "This Project has no single-select Priority field. Issues within each section are ordered by issue number.",
      "",
    );
  for (const [group, entries] of groups) {
    if (!entries.length) continue;
    lines.push(`### ${group}`, "");
    entries.sort((a, b) => a.rank - b.rank || a.issue.number - b.issue.number);
    for (const { issue, next, rank, criteria, prs, needsDecision } of entries) {
      const priority = options[rank]?.name ?? "Unranked";
      lines.push(
        `- **${markdownText(priority)}** · ${issueLink(issue)} — ${next}`,
      );
      const count = issue.assignees?.totalCount;
      const owners =
        count === 0
          ? "Unassigned"
          : count == null
            ? "Assignment unreported"
            : `${count} assigned`;
      lines.push(`  - ${owners} · [Issue assignees](${issue.url})`);
      if (needsDecision && group !== "Human decisions")
        lines.push(`  - Decision pending. ${decisionAction}`);
      if (prs.length)
        lines.push(
          `  - Pull requests: ${pullRequestLinks(issue, prs, { evidence: true })}`,
        );
      if (group === "Implementation queue") {
        for (const line of criteria
          .split(/\r?\n/)
          .filter((part) => part.trim())) {
          lines.push(
            `  - ${markdownText(line.trim().replace(/^[-*+]\s+/, ""))}`,
          );
        }
      }
      if (group === "Parent outcomes" || needsDecision)
        lines.push(...childEvidence(issue, repo.id));
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
