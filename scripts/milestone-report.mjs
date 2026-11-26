import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function statusFor(issue, projectId) {
  const items = issue.projectItems;
  const item = items.nodes.find((entry) => entry.project.id === projectId);
  if (!item)
    return items.pageInfo.hasNextPage
      ? "Unknown (more memberships)"
      : "Off board";
  const status = item.fieldValueByName?.name;
  if (!status) return "Unset";
  // Keep a Project field value inside one literal Markdown table cell.
  return status.replace(
    /[^\p{L}\p{N} -]/gu,
    (char) => `&#${char.codePointAt(0)};`,
  );
}

export function renderReport(pages) {
  const repo = pages[0]?.data?.repository;
  const project = repo?.owner?.projectV2;
  if (repo?.visibility !== "PUBLIC" || !project?.public || !repo.milestone) {
    throw new Error(
      "A visible public repository, public Project and existing milestone are required.",
    );
  }

  const issues = pages.flatMap(
    (page) => page.data.repository.milestone.issues.nodes,
  );
  const complete = pages.every(
    (page) =>
      page.data.repository.milestone.issues.totalCount === issues.length,
  );
  if (
    !complete ||
    new Set(issues.map((issue) => issue.number)).size !== issues.length
  ) {
    throw new Error(
      "The milestone changed during pagination. Run the report again.",
    );
  }

  const closed = issues.filter((issue) => issue.state === "CLOSED").length;
  const blocked = issues.filter(
    (issue) =>
      issue.state === "OPEN" && issue.issueDependenciesSummary.blockedBy > 0,
  ).length;
  const lines = [
    "## Milestone progress",
    "",
    `[Milestone](${repo.milestone.url}) · [Project](${project.url})`,
    "",
    `**Open** ${issues.length - closed} · **Closed** ${closed} · **Open with blockers** ${blocked}`,
    "",
    "| Issue | Issue state | Project status | Open blockers | Sub-issues completed |",
    "| --- | --- | --- | ---: | ---: |",
  ];
  for (const issue of issues) {
    const state =
      issue.stateReason === "NOT_PLANNED"
        ? "Closed (not planned)"
        : issue.state.toLowerCase();
    const { completed, total } = issue.subIssuesSummary;
    lines.push(
      `| [#${issue.number}](${issue.url}) | ${state} | ${statusFor(issue, project.id)} | ${issue.issueDependenciesSummary.blockedBy} | ${total ? `${completed}/${total}` : "—"} |`,
    );
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const [repository, project, milestone, ...extra] = process.argv.slice(2);
  if (
    extra.length ||
    !/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") ||
    !/^[1-9]\d*$/.test(project ?? "") ||
    !/^[1-9]\d*$/.test(milestone ?? "")
  ) {
    console.error(
      "Usage: node scripts/milestone-report.mjs OWNER/REPO PROJECT_NUMBER MILESTONE_NUMBER",
    );
    process.exitCode = 1;
  } else {
    const [owner, repo] = repository.split("/");
    const query = readFileSync(
      new URL("milestone-report.graphql", import.meta.url),
      "utf8",
    );
    try {
      const response = execFileSync(
        "gh",
        [
          "api",
          "graphql",
          "--hostname",
          "github.com",
          "--paginate",
          "--slurp",
          "-f",
          `query=${query}`,
          "-f",
          `owner=${owner}`,
          "-f",
          `repo=${repo}`,
          "-F",
          `project=${project}`,
          "-F",
          `milestone=${milestone}`,
        ],
        {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "inherit"],
        },
      );
      console.log(renderReport(JSON.parse(response)));
    } catch (error) {
      console.error(
        error.status
          ? "GitHub query failed. Check gh authentication and Project access."
          : error.message,
      );
      process.exitCode = 1;
    }
  }
}
