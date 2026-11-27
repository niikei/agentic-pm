import {
  issueLink,
  markdownText,
  openPullRequests,
  projectItem,
  pullRequestLinks,
} from "./milestone-markdown.mjs";

const sections = [
  "Implementation queue",
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

function nextAction(issue, repo, item, prs, criteria) {
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

  if (prs.length) {
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
  if (!criteria)
    return [
      "Needs triage",
      "Review the issue and confirm its acceptance criteria before implementation.",
    ];
  const status = item.fieldValueByName?.name;
  if (status === "In Progress")
    return ["Implementation queue", "Continue the active implementation."];
  if (status === "Todo")
    return [
      "Implementation queue",
      "Pick up the issue and move it to In Progress.",
    ];
  return [
    "Needs triage",
    "Confirm the Project status and next action with the issue owner.",
  ];
}

export function renderWorkPlan(repo, issues) {
  const project = repo.owner.projectV2;
  const options = project.priority?.options ?? [];
  const groups = new Map(sections.map((section) => [section, []]));

  const openIssues = issues.filter((issue) => issue.state === "OPEN");
  for (const issue of openIssues) {
    const item = projectItem(issue, project.id);
    const rank = options.findIndex(
      (option) => option.id === item?.priority?.optionId,
    );
    const criteria = acceptanceCriteria(issue.body);
    const prs = openPullRequests(issue, repo.id);
    const [group, next] = nextAction(issue, repo, item, prs, criteria);
    groups.get(group).push({
      issue,
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
  for (const [group, entries] of groups) {
    if (!entries.length) continue;
    lines.push(`### ${group}`, "");
    entries.sort((a, b) => a.rank - b.rank || a.issue.number - b.issue.number);
    for (const { issue, next, rank, criteria, prs } of entries) {
      const priority = options[rank]?.name ?? "Unranked";
      lines.push(
        `- **${markdownText(priority)}** · ${issueLink(issue)} — ${next}`,
      );
      if (prs.length)
        lines.push(`  - Pull requests: ${pullRequestLinks(issue, prs)}`);
      if (group === "Implementation queue") {
        for (const line of criteria
          .split(/\r?\n/)
          .filter((part) => part.trim())) {
          lines.push(
            `  - ${markdownText(line.trim().replace(/^[-*+]\s+/, ""))}`,
          );
        }
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
