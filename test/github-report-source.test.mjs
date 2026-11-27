import assert from "node:assert/strict";
import test from "node:test";
import { captureGitHub } from "../reports/sources/github.mjs";

const base = "repos/example/demo";
const asOf = "2026-11-27T12:00:00.000Z";
const created = "2026-11-20T15:32:08.000Z";
const open = `${base}/issues?state=open&per_page=100`;
const closed = `${base}/issues?state=closed&since=2026-11-20T15:32:07.000Z&per_page=100`;
const metadata = {
  visibility: "public",
  full_name: "example/demo",
  created_at: created,
};

function capture(pages, days = 14) {
  return captureGitHub("example/demo", days, {
    now: () => Date.parse(asOf),
    read(path) {
      if (path === base) return { data: metadata };
      assert.ok(Object.hasOwn(pages, path), `Unexpected read of ${path}`);
      return pages[path];
    },
  });
}

function issue(number, fields = {}) {
  return {
    number,
    title: `Item ${number}`,
    updated_at: created,
    labels: [],
    assignees: [],
    ...fields,
  };
}

function label(event, created_at, name = "needs decision") {
  return { event, created_at, label: { name } };
}

test("GitHub reader follows pages and measures the most recent decision request", () => {
  const labeled = { labels: [{ name: "Needs Decision" }] };
  const lastApplied = "2026-11-26T10:00:00Z";
  const captured = capture({
    [open]: {
      data: [issue(1, { ...labeled, assignees: [{ login: "maintainer" }] })],
      next: "open-next",
    },
    "open-next": {
      data: [
        issue(2, { pull_request: {}, draft: true }),
        issue(3, { pull_request: {}, draft: false, ...labeled }),
      ],
    },
    [`${base}/issues/1/timeline?per_page=100`]: {
      data: [
        label("labeled", created),
        label("unlabeled", "2026-11-24T12:00:00Z"),
      ],
      next: "timeline-next",
    },
    "timeline-next": {
      data: [
        label("labeled", lastApplied),
        label("unlabeled", asOf, "another label"),
      ],
    },
    [`${base}/issues/3/timeline?per_page=100`]: { data: [] },
    [closed]: {
      data: [
        issue(4),
        issue(5, { pull_request: { merged_at: null } }),
        issue(6, { pull_request: { merged_at: "2026-11-20T15:32:07Z" } }),
      ],
      next: "closed-next",
    },
    "closed-next": {
      data: [
        issue(7, { pull_request: { merged_at: created } }),
        issue(8, { pull_request: { merged_at: asOf } }),
        issue(9, { pull_request: { merged_at: "2026-11-27T12:00:01Z" } }),
      ],
    },
  });

  assert.equal(captured.project, "example/demo");
  assert.equal(captured.asOf, asOf);
  assert.equal(captured.coverageStart, created);
  assert.deepEqual(captured.items[0], {
    id: "#1",
    title: "Item 1",
    url: "https://github.com/example/demo/issues/1",
    kind: "work",
    updatedAt: created,
    needsDecision: true,
    draft: false,
    decisionSince: "2026-11-26T10:00:00.000Z",
    owners: ["maintainer"],
  });
  assert.deepEqual(
    captured.items
      .slice(1)
      .map((row) => [
        row.kind,
        row.draft,
        row.needsDecision,
        row.decisionSince,
      ]),
    [
      ["change", true, false, null],
      ["change", false, true, null],
    ],
  );
  assert.deepEqual(captured.deliveries, [
    {
      id: "#7",
      title: "Item 7",
      url: "https://github.com/example/demo/pull/7",
      at: created,
    },
    {
      id: "#8",
      title: "Item 8",
      url: "https://github.com/example/demo/pull/8",
      at: asOf,
    },
  ]);
});

test("empty GitHub collections preserve the requested rolling lookback", () => {
  const snapshot = capture(
    {
      [open]: { data: [] },
      [`${base}/issues?state=closed&since=2026-11-26T11:59:59.000Z&per_page=100`]:
        { data: [] },
    },
    1,
  );
  assert.deepEqual(snapshot, {
    project: "example/demo",
    asOf,
    coverageStart: "2026-11-26T12:00:00.000Z",
    items: [],
    deliveries: [],
  });
});

test("requires an explicit public GitHub scope before collecting rows", () => {
  for (const repo of [
    "owner/..",
    "github.com/owner/repo",
    "--flag/test",
    "owner/repo?x=y",
    "owner/repo#frag",
  ])
    assert.throws(
      () =>
        captureGitHub(repo, 5, {
          read: () => assert.fail("unexpected request"),
        }),
      /slug/,
    );
  for (const visibility of ["private", "internal", undefined]) {
    assert.throws(
      () =>
        captureGitHub("example/demo", 5, {
          read: (path) => {
            assert.equal(path, base);
            return { data: { ...metadata, visibility } };
          },
        }),
      /public repository/,
    );
  }
});

test("fails explicitly on unavailable draft status, changing lists and collection limits", () => {
  assert.throws(
    () => capture({ [open]: { data: [issue(1, { pull_request: {} })] } }),
    /draft status/,
  );
  assert.throws(
    () => capture({ [open]: { data: [issue(1), issue(1)] } }),
    /changed during capture/,
  );
  assert.throws(
    () =>
      capture({
        [open]: { data: [issue(1, { updated_at: "2026-11-28T10:00:00Z" })] },
      }),
    /changed during capture/,
  );
  assert.throws(
    () => capture({ [open]: { data: [] }, [closed]: { data: {} } }),
    /incomplete collection/,
  );
  assert.throws(
    () => capture({ [open]: { data: [], next: open } }),
    /200-request limit/,
  );
});
