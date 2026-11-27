import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const reporter = fileURLToPath(
  new URL("../scripts/milestone-report.mjs", import.meta.url),
);
const cases = [
  { repository: "vitejs/vite", project: "1", milestone: "36" },
  { repository: "biomejs/biome", project: "4", milestone: "16" },
  { repository: "vitejs/vite", project: "1", milestone: "13" },
];

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", timeout: 60000 });
}

for (const { repository, project, milestone } of cases) {
  test(`${repository} milestone ${milestone} matches GitHub's issue list`, () => {
    const issueList = run("gh", [
      "api",
      "--hostname",
      "github.com",
      "--paginate",
      `repos/${repository}/issues?milestone=${milestone}&state=all&per_page=100`,
      "--jq",
      '.[] | select(has("pull_request") | not) | {url: .html_url, state} | @json',
    ]);
    const issues = issueList
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const args = [reporter, repository, project, milestone];
    const snapshot = run(process.execPath, args);
    const plan = run(process.execPath, [...args, "--plan"]);
    const open = issues.filter((issue) => issue.state === "open");

    const rows = [
      ...snapshot.matchAll(
        /^\| \[#[^\n]*?\]\(([^)]+)\) \| (open|closed)(?: \(not planned\))? \|/gim,
      ),
    ];
    assert.deepEqual(
      rows.map((row) => `${row[1]} ${row[2].toLowerCase()}`).sort(),
      issues.map((issue) => `${issue.url} ${issue.state}`).sort(),
    );
    assert.ok(
      snapshot.includes(
        `**Open** ${open.length} · **Closed** ${issues.length - open.length} ·`,
      ),
    );

    // Match the top-level queue only. Children and linked PRs can also appear as evidence.
    const entries = [
      ...plan.matchAll(/^- \*\*[^\n]+?\*\* · \[#[^\n]*?\]\(([^)]+)\)/gm),
    ];
    assert.deepEqual(
      entries.map((entry) => entry[1]).sort(),
      open.map((issue) => issue.url).sort(),
    );
    assert.equal(plan.includes("No open milestone issues."), open.length === 0);
  });
}
