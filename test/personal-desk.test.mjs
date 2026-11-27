import assert from "node:assert/strict";
import test from "node:test";
import { readJson, validateSnapshot } from "../reports/catalog.mjs";
import { renderDesk } from "../reports/desk/html.mjs";
import { buildDesk } from "../reports/desk/model.mjs";

const sample = () =>
  readJson(new URL("../reports/examples/desk.json", import.meta.url));
test("desk priorities and three charts use the same owner scope and JST cutoff", () => {
  const data = sample();
  data.asOf = "2026-11-27T15:05:00Z";
  data.coverageStart = data.asOf;
  for (const item of data.items) {
    item.updatedAt = data.asOf;
    item.decisionSince = null;
  }
  data.items[0].owners = ["別担当"];
  data.items[0].title = "Outside scope";
  const result = buildDesk(validateSnapshot(data), "運営担当");
  assert.equal(result.today, "2026-11-28");
  assert.equal(result.next.id, "T-13");
  assert.equal(result.overdue, 0);
  assert.deepEqual(
    result.days.map((day) => day.count),
    [2, 0, 3, 1, 1, 1, 0],
  );
  assert.equal(
    result.undated +
      result.later +
      result.overdue +
      result.days.reduce((n, day) => n + day.count, 0),
    result.tasks.length,
  );
  assert.equal(
    Object.values(result.counts).reduce((a, b) => a + b, 0),
    result.tasks.length,
  );
  assert.doesNotMatch(renderDesk(result), /Outside scope/);
});
test("missing plan fields and absent owner matches remain explicit; questions retain chronological evidence", () => {
  const data = sample();
  const known = buildDesk(validateSnapshot(data));
  assert.deepEqual(
    known.questions.map((task) => task.waitHours),
    [72, 24, 2],
  );
  for (const item of data.items) {
    delete item.stage;
    delete item.dueDate;
    delete item.nextAction;
  }
  const unknown = buildDesk(validateSnapshot(data));
  assert.equal(unknown.undated, unknown.tasks.length);
  assert.equal(unknown.next, undefined);
  assert.match(renderDesk(unknown), /期限の記録待ち/);
  assert.doesNotMatch(renderDesk(unknown), /class="bars"/);
  assert.match(renderDesk(unknown), /先に確認する/);
  const empty = buildDesk(data, "Nobody");
  assert.equal(empty.tasks.length, 0);
  assert.match(renderDesk(empty), /次の作業は未確定/);
});
test("invalid dates and contradictory flags fail validation; task input stays escaped", () => {
  const data = sample();
  data.items[0].dueDate = "2026-02-30";
  assert.throws(() => validateSnapshot(data));
  delete data.items[0].dueDate;
  data.items[0].question = "Unflagged?";
  assert.throws(() => validateSnapshot(data));
  delete data.items[0].question;
  data.items[0].title = "</script><b>bad</b>";
  const page = renderDesk(buildDesk(validateSnapshot(data)));
  assert.ok(page.includes("&lt;/script&gt;&lt;b&gt;bad&lt;/b&gt;"));
  assert.equal(page.match(/<script>/g).length, 1);
});
