import assert from "node:assert/strict";
import test from "node:test";
import { renderReport } from "../scripts/milestone-report.mjs";

function page(numbers, totalCount = numbers.length) {
  return {
    data: {
      repository: {
        id: "repo",
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
              closedByPullRequestsReferences: {
                nodes: [],
                pageInfo: { hasNextPage: false },
              },
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

test("links open implementation PRs only from the reported repository", () => {
  const input = page([1, 2]);
  const [issue, other] = input.data.repository.milestone.issues.nodes;
  const ready = {
    repository: { id: "repo" },
    number: 17,
    url: "https://example.org/pull/17",
    state: "OPEN",
    isDraft: false,
  };
  const foreign = {
    ...ready,
    repository: { id: "other" },
    url: "https://example.org/other/pull/17",
  };
  issue.closedByPullRequestsReferences.nodes = [
    foreign,
    ready,
    { ...ready, number: 19, url: "https://example.org/pull/19", isDraft: true },
  ];
  issue.closedByPullRequestsReferences.pageInfo.hasNextPage = true;
  other.closedByPullRequestsReferences.nodes = [
    foreign,
    { ...ready, state: "MERGED" },
    { ...ready, state: "CLOSED" },
  ];
  const report = renderReport([input]);
  assert.ok(
    report.includes(
      "[#17](https://example.org/pull/17), [#19](https://example.org/pull/19) (draft), [See issue](https://example.org/issues/1)",
    ),
  );
  assert.doesNotMatch(report, /other\/pull/);
  assert.ok(report.endsWith("| 0 | — | — |"));
});

test("shows current head checks and review decisions per visible PR in planning mode", () => {
  const input = planningPage([1]);
  const [issue] = input.data.repository.milestone.issues.nodes;
  const pr = {
    number: 9,
    url: "https://example.org/pull/9",
    repository: { id: "repo" },
    state: "OPEN",
    isDraft: false,
    headRefOid: "head",
    reviewDecision: "REVIEW_REQUIRED",
    commits: {
      nodes: [
        { commit: { oid: "head", statusCheckRollup: { state: "FAILURE" } } },
      ],
    },
  };
  issue.closedByPullRequestsReferences.nodes = [
    pr,
    {
      ...pr,
      number: 10,
      url: "https://example.org/pull/10",
      isDraft: true,
      headRefOid: "new",
      reviewDecision: null,
    },
  ];
  const plan = renderReport([input], { plan: true });
  assert.match(plan, /Investigate the failing checks/);
  assert.match(plan, /pull\/9\) \(checks: failure, review: review required\)/);
  assert.match(
    plan,
    /pull\/10\) \(draft\) \(checks: unreported, review: unreported\)/,
  );
  assert.doesNotMatch(renderReport([input]), /checks:|review:/);
  pr.commits.nodes = [];
  pr.reviewDecision = "CHANGES_REQUESTED";
  assert.match(
    renderReport([input], { plan: true }),
    /Address the requested changes/,
  );
  issue.issueDependenciesSummary.blockedBy = 1;
  assert.match(
    renderReport([input], { plan: true }),
    /Waiting on dependencies/,
  );
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

function planningPage(numbers) {
  const result = page(numbers);
  const repo = result.data.repository;
  repo.owner.projectV2.fields = {
    nodes: [
      {
        name: "Priority",
        options: [
          { id: "urgent", name: "First" },
          { id: "routine", name: "Later" },
        ],
      },
    ],
  };
  for (const issue of repo.milestone.issues.nodes) {
    issue.body = "### Acceptance criteria\n\n- Verify issue " + issue.number;
    issue.blockedBy = { nodes: [] };
    issue.projectItems.nodes.push({
      project: { id: "board" },
      fieldValueByName: { name: "Todo" },
    });
  }
  return result;
}

test("ranks actionable issues by native option order with stable ties and unranked last", () => {
  const input = planningPage([9, 7, 5, 1, 10]);
  const issues = input.data.repository.milestone.issues.nodes;
  for (const issue of issues.slice(0, 2))
    issue.projectItems.nodes[0].priority = { optionId: "urgent" };
  issues[2].projectItems.nodes[0].priority = { optionId: "routine" };
  issues[0].body =
    "### Outcome\n\n```md\n## Acceptance criteria\nwrong\n```\n### Acceptance criteria\n- Verify @team | safely\n### Evidence\nignore this section";
  issues[0].projectItems.nodes[0].fieldValueByName.name = "In Progress";
  issues[4].state = "CLOSED";
  const plan = renderReport([input], { plan: true });
  assert.deepEqual(
    [...plan.matchAll(/\[#(\d+)\]/g)].map((match) => Number(match[1])),
    [7, 9, 5, 1],
  );
  assert.match(plan, /Continue the active implementation/);
  assert.match(plan, /Verify &#64;team &#124; safely/);
  assert.doesNotMatch(plan, /wrong|ignore this section/);
  assert.match(plan, /Unranked/);
  input.data.repository.owner.projectV2.fields.nodes[0].options.reverse();
  const reprioritized = renderReport([input], { plan: true });
  assert.ok(reprioritized.indexOf("[#5]") < reprioritized.indexOf("[#7]"));
});

test("plans unranked issues without borrowing priority or readiness from a custom status", () => {
  const input = planningPage([8, 4, 6]);
  const repo = input.data.repository;
  repo.owner.projectV2.fields.nodes = [
    {},
    { name: "Status", options: [{ id: "later", name: "Later" }] },
  ];
  const deferred = repo.milestone.issues.nodes[2];
  deferred.body = "";
  deferred.projectItems.nodes[0].fieldValueByName = { name: "Later | @team" };
  const plan = renderReport([input], { plan: true });
  assert.match(plan, /no single-select Priority field/);
  assert.deepEqual(
    [...plan.matchAll(/\*\*Unranked\*\* · \[#(\d+)\]/g)].map(
      (match) => match[1],
    ),
    ["4", "8", "6"],
  );
  assert.match(
    plan,
    /### Needs triage\n\n[^\n]*\[#6\][^\n]*\*\*Later &#124; &#64;team\*\*/,
  );
});

test("keeps blockers, parents, PRs and incomplete inputs out of the implementation queue", () => {
  const input = planningPage([1, 2, 3, 4, 5, 6]);
  const [blocked, parent, review, offboard, unknown, unspecified] =
    input.data.repository.milestone.issues.nodes;
  blocked.issueDependenciesSummary.blockedBy = 2;
  blocked.blockedBy.nodes.push(
    {
      number: 91,
      url: "https://example.org/issues/91",
      state: "OPEN",
      repository: { id: "repo" },
    },
    {
      number: 92,
      url: "https://example.org/private/92",
      state: "OPEN",
      repository: { id: "elsewhere" },
    },
  );
  parent.subIssuesSummary = { completed: 1, total: 1 };
  review.closedByPullRequestsReferences.nodes.push({
    number: 17,
    url: "https://example.org/pull/17",
    state: "OPEN",
    isDraft: true,
    repository: { id: "repo" },
  });
  offboard.projectItems.nodes = [];
  unknown.closedByPullRequestsReferences.pageInfo.hasNextPage = true;
  unspecified.body = "### Acceptance criteria\n_No response_";
  const plan = renderReport([input], { plan: true });
  assert.doesNotMatch(plan, /Implementation queue|private\/92/);
  assert.match(plan, /Resolve 2 open prerequisites.*#91.*Issue relationships/);
  assert.match(plan, /Verify the completed children/);
  assert.match(plan, /Continue the draft implementation/);
  assert.match(plan, /Add the issue to the Project/);
  assert.match(plan, /Inspect the remaining linked PRs/);
  assert.match(plan, /confirm its acceptance criteria/);
  assert.match(
    renderReport([planningPage([])], { plan: true }),
    /No open milestone issues/,
  );
  input.data.repository.owner.projectV2.public = false;
  assert.throws(() => renderReport([input], { plan: true }), /public Project/);
});

test("lists bounded parent evidence without enrolling children into the milestone queue", () => {
  const input = planningPage([1]);
  const [parent] = input.data.repository.milestone.issues.nodes;
  parent.subIssuesSummary = { total: 5, completed: 1 };
  const child = {
    state: "OPEN",
    number: 3,
    title: "@team | deliver",
    url: "https://example.org/issues/3",
    repository: { id: "repo" },
    issueDependenciesSummary: { blockedBy: 2 },
  };
  parent.subIssues = {
    pageInfo: { hasNextPage: true },
    nodes: [
      child,
      null,
      { ...child, state: "CLOSED", title: "already done" },
      {
        ...child,
        repository: { id: "other" },
        title: "foreign record",
        url: "https://example.org/foreign/3",
      },
    ],
  };
  const plan = renderReport([input], { plan: true });
  assert.match(plan, /Child \[#3 &#64;team &#124; deliver\].*Open blockers: 2/);
  assert.match(plan, /Inspect all child relationships/);
  assert.doesNotMatch(plan, /Implementation queue|already done|foreign/);
  parent.subIssues.pageInfo.hasNextPage = false;
  assert.match(
    renderReport([input], { plan: true }),
    /Inspect all child relationships/,
  );
  parent.subIssues = { pageInfo: { hasNextPage: false }, nodes: [child] };
  parent.subIssuesSummary = { total: 1, completed: 0 };
  assert.doesNotMatch(
    renderReport([input], { plan: true }),
    /Inspect all child relationships/,
  );
});
