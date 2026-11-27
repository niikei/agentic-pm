import assert from "node:assert/strict";
import test from "node:test";
import { renderDesk } from "../reports/desk/html.mjs";
import { captureRelations, repository } from "../reports/project/github.mjs";
import { buildProjectDesk } from "../reports/project/model.mjs";

const asOf = "2026-11-28T01:00:00.000Z";
const url = (path, n) => `https://github.com/${repository}/${path}/${n}`;
const issue = {
  id: "#1",
  kind: "work",
  url: url("issues", 1),
  title: "Plan & review",
  owners: [],
};
const pull = {
  id: "#2",
  kind: "change",
  url: url("pull", 2),
  title: "Open change",
  owners: [],
  draft: false,
};
const merged = {
  id: "#3",
  url: url("pull", 3),
  title: "Completed change",
  at: asOf,
};
const snapshot = {
  project: repository,
  asOf,
  coverageStart: asOf,
  items: [issue, pull],
  deliveries: [merged],
};
const reference = (
  number,
  nameWithOwner = repository,
  visibility = "PUBLIC",
) => ({
  number,
  title: `Issue ${number}`,
  repository: { nameWithOwner, visibility },
});

function page(number, nodes, endCursor = null) {
  return {
    number,
    state: number === 2 ? "OPEN" : "MERGED",
    updatedAt: asOf,
    reviewDecision: "CHANGES_REQUESTED",
    closingIssuesReferences: {
      nodes,
      pageInfo: { endCursor, hasNextPage: Boolean(endCursor) },
    },
  };
}

test("project desk joins both directions, follows remaining pages, scopes links and keeps closed deliveries outside open counts", () => {
  const relations = captureRelations(snapshot, (batch) =>
    batch.map(({ number, cursor }) => {
      if (number === 2 && !cursor)
        return page(
          2,
          [reference(1), reference(444, "private/other", "PRIVATE")],
          "next",
        );
      if (number === 2)
        return page(2, [reference(5), reference(555, "elsewhere/public")]);
      return page(3, [reference(1)]);
    }),
  );
  const desk = buildProjectDesk(
    snapshot,
    new Map([[issue.url, "Todo"]]),
    relations,
  );
  assert.equal(desk.tasks.length, 2);
  assert.equal(desk.tasks[0].stage, "backlog");
  assert.deepEqual(
    desk.tasks[0].linkedChanges.map((pr) => pr.state),
    ["修正依頼", "マージ済み"],
  );
  assert.deepEqual(
    desk.tasks[1].linkedIssues.map((item) => item.id),
    ["#1", "#5"],
  );
  assert.equal(desk.recentChanges[0].issues[0].id, "#1");
  const html = renderDesk(desk);
  for (const target of [issue.url, pull.url, merged.url, url("issues", 5)])
    assert.ok(html.includes(`href="${target}"`));
  assert.doesNotMatch(html, /Issue 444|Issue 555/);
});

test("changed PRs and incomplete pagination fail the refresh", () => {
  assert.throws(
    () =>
      captureRelations(snapshot, (batch) =>
        batch.map(({ number }) => ({ ...page(number, []), state: "CLOSED" })),
      ),
    /changed/,
  );
  assert.throws(
    () =>
      captureRelations(snapshot, (batch) =>
        batch.map(({ number }) => page(number, [], "repeat")),
      ),
    /cursor/,
  );
});
