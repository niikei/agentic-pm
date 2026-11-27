import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  issueLink,
  markdownText,
  openPullRequests,
  projectItem,
  pullRequestLinks,
} from "./milestone-markdown.mjs";
import { renderWorkPlan } from "./work-plan.mjs";

function statusFor(issue, projectId) {
  const item = projectItem(issue, projectId);
  if (!item)
    return issue.projectItems.pageInfo.hasNextPage
      ? "Unknown (more memberships)"
      : "Off board";
  const status = item.fieldValueByName?.name;
  return status ? markdownText(status) : "Unset";
}

export function renderReport(pages, { plan = false } = {}) {
  const repo = pages[0]?.data?.repository;
  const project = repo?.owner?.projectV2;
  const scopeIsPublic =
    pages.length > 0 &&
    pages.every(({ data }) => {
      const page = data?.repository;
      return (
        page?.visibility === "PUBLIC" &&
        page.owner?.projectV2?.public &&
        page.owner.projectV2.id === project?.id &&
        page.milestone?.url &&
        page.milestone.url === repo?.milestone?.url
      );
    });
  if (!scopeIsPublic) {
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

  if (plan) return renderWorkPlan(repo, issues);
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
    "Blocker counts cover linked GitHub issues. Open the issue for pending access or decisions.",
    "",
    "| Issue | Issue state | Project status | Open blockers | Closed sub-issues | Open PRs |",
    "| --- | --- | --- | ---: | ---: | --- |",
  ];
  for (const issue of issues) {
    const state =
      issue.state === "CLOSED"
        ? `Closed (${issue.stateReason?.toLowerCase().replaceAll("_", " ") ?? "reason unreported"})`
        : issue.state.toLowerCase();
    const { completed: closedChildren, total } = issue.subIssuesSummary;
    lines.push(
      `| ${issueLink(issue)} | ${state} | ${statusFor(issue, project.id)} | ${issue.issueDependenciesSummary.blockedBy} | ${total ? `${closedChildren}/${total}` : "—"} | ${pullRequestLinks(issue, openPullRequests(issue, repo.id))} |`,
    );
  }
  return lines.join("\n");
}

export function run(args) {
  const [repository, project, milestone, mode, ...extra] = args;
  if (
    extra.length ||
    (mode !== undefined && mode !== "--plan") ||
    !/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") ||
    !/^[1-9]\d*$/.test(project ?? "") ||
    !/^[1-9]\d*$/.test(milestone ?? "")
  ) {
    console.error(
      "Usage: node <path-to-milestone-report.mjs> OWNER/REPO PROJECT_NUMBER MILESTONE_NUMBER [--plan]",
    );
    process.exitCode = 1;
  } else {
    const [owner, repo] = repository.split("/");
    const plan = mode === "--plan";
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
          "-F",
          `plan=${plan}`,
          ...(plan ? ["-f", "states[]=OPEN"] : []),
        ],
        {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "inherit"],
        },
      );
      console.log(renderReport(JSON.parse(response), { plan }));
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

if (import.meta.main) run(process.argv.slice(2));
