import assert from "node:assert/strict";
import test from "node:test";
import { renderReport } from "../scripts/milestone-report.mjs";

function page(numbers, totalCount = numbers.length) {
  return {
    data: {
      repository: {
        visibility: "PUBLIC",
        owner: {
          projectV2: {
            id: "board",
            public: true,
            url: "https://example.org/board",
          },
        },
        milestone: {
          url: "https://example.org/milestone/1",
          issues: {
            totalCount,
            nodes: numbers.map((number) => ({
              number,
              url: `https://example.org/issues/${number}`,
              state: "OPEN",
              stateReason: null,
              issueDependenciesSummary: { blockedBy: 0 },
              subIssuesSummary: { completed: 0, total: 0 },
              projectItems: { pageInfo: { hasNextPage: false }, nodes: [] },
            })),
          },
        },
      },
    },
  };
}

test("counts paginated milestone issues once, including issues off the board", () => {
  const first = page([1], 2);
  const second = page([2], 2);
  const [parent] = first.data.repository.milestone.issues.nodes;
  parent.title = "会場 | [guide] @team";
  parent.subIssuesSummary = { completed: 1, total: 2 };
  parent.issueDependenciesSummary.blockedBy = 1;
  parent.projectItems.nodes.push(
    { project: { id: "other" }, fieldValueByName: { name: "Unrelated" } },
    {
      project: { id: "board" },
      fieldValueByName: { name: "In Progress | @all" },
    },
  );
  const [child] = second.data.repository.milestone.issues.nodes;
  child.state = "CLOSED";
  child.stateReason = "NOT_PLANNED";
  const report = renderReport([first, second]);
  assert.ok(
    report.includes(
      "[#1 会場 &#124; &#91;guide&#93; &#64;team](https://example.org/issues/1)",
    ),
  );
  assert.ok(report.includes("[#2](https://example.org/issues/2)"));
  assert.match(
    report,
    /\*\*Open\*\* 1 · \*\*Closed\*\* 1 · \*\*Open with blockers\*\* 1/,
  );
  assert.match(report, /In Progress &#124; &#64;all \| 1 \| 1\/2/);
  assert.match(report, /Closed \(not planned\) \| Off board/);
  assert.match(report, /Blocker counts cover linked GitHub issues/);
  assert.doesNotMatch(report, /Unrelated/);
});

test("refuses private inputs and incomplete pagination", () => {
  const hidden = page([]);
  hidden.data.repository.owner.projectV2.public = false;
  assert.throws(() => renderReport([hidden]), /public Project/);
  assert.throws(() => renderReport([page([]), hidden]), /public Project/);
  assert.throws(() => renderReport([page([1], 2)]), /pagination/);
  assert.throws(() => renderReport([page([1], 2), page([1], 2)]), /pagination/);
});

test("distinguishes empty milestones, unset status and truncated memberships", () => {
  assert.match(renderReport([page([])]), /\*\*Open\*\* 0/);
  const input = page([1, 2]);
  const [unseen, unset] = input.data.repository.milestone.issues.nodes;
  unseen.projectItems.pageInfo.hasNextPage = true;
  unset.projectItems.nodes.push({
    project: { id: "board" },
    fieldValueByName: null,
  });
  const report = renderReport([input]);
  assert.match(report, /Unknown \(more memberships\)/);
  assert.match(report, /Unset/);
});
