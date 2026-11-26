// Offline replay. Every record describes a fictitious library pickup pilot.
import assert from "node:assert/strict";
import { renderReport } from "../../scripts/milestone-report.mjs";

const project = { id: "pilot", url: "https://example.org/board", public: true };
const records = [
  { number: 1, title: "Prepare pickup", status: "In Progress", children: 2 },
  { number: 2, title: "Publish hours", status: "Todo", blockers: 1 },
  { number: 3, title: "Confirm staffed hours", status: null },
  { number: 4, title: "Print posters", status: "Done", reason: "NOT_PLANNED" },
];
const issues = records.map(
  ({ number, status, children, blockers, reason }) => ({
    number,
    url: `https://example.org/issues/${number}`,
    state: reason ? "CLOSED" : "OPEN",
    stateReason: reason ?? null,
    subIssuesSummary: { completed: 0, total: children ?? 0 },
    issueDependenciesSummary: { blockedBy: blockers ?? 0 },
    projectItems: {
      nodes: status ? [{ project, fieldValueByName: { name: status } }] : [],
      pageInfo: { hasNextPage: false },
    },
  }),
);

const repository = {
  visibility: "PUBLIC",
  owner: { projectV2: project },
  milestone: {
    url: "https://example.org/milestone/1",
    issues: { totalCount: issues.length, nodes: issues },
  },
};
const report = renderReport([{ data: { repository } }]);
assert.match(
  report,
  /\*\*Open\*\* 3 · \*\*Closed\*\* 1 · \*\*Open with blockers\*\* 1/,
);
assert.match(report, /issues\/3\) \| open \| Off board/);
assert.match(report, /Closed \(not planned\)/);
assert.match(report, /0\/2/);

// Model the membership boundary of a board and the mixed items of a milestone.
const board = records.filter((record) => record.status);
assert.deepEqual(
  board.map((record) => record.number),
  [1, 2, 4],
);
const openIssues = issues.filter((issue) => issue.state === "OPEN").length;
const openPullRequests = 1;
console.log(
  "Board issue titles:",
  board.map((record) => record.title).join(", "),
);
console.log(
  "Milestone open items, including the PR:",
  openIssues + openPullRequests,
);
console.log(report);
