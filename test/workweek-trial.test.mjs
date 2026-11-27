import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { capture } from "../workspace/intake.mjs";
import { inspectSource } from "../workspace/sources.mjs";
import { openWorkspace } from "../workspace/store.mjs";

test("the workplace trial scores the observable handoff and rejects a stale deadline or a private marker", (t) => {
  const parent = mkdtempSync(join(tmpdir(), "workweek-")),
    root = join(parent, "first"),
    desk = join(root, "desk");
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const runner = fileURLToPath(
    new URL("../trials/workweek/run.mjs", import.meta.url),
  );
  const run = (...args) =>
    spawnSync(process.execPath, [runner, ...args], { encoding: "utf8" });
  const setup = run("setup", root);
  assert.equal(setup.status, 0, setup.stderr);
  assert.notEqual(run("setup", root).status, 0);
  function score(day, expected) {
    const result = run("score", root, day);
    assert.equal(result.status, expected, result.stderr || result.stdout);
    return JSON.parse(result.stdout).checks;
  }
  assert.equal(score("monday", 1).activeDeadline, false);
  const monday = "2026-11-30",
    friday = "2026-12-04";
  const db = openWorkspace(desk);
  try {
    const receipt = (folder, name) =>
      inspectSource(db, join(root, folder, name)).file;
    const front = receipt("portal", "Delivery.md"),
      back = receipt("relay", "Delivery.md"),
      minutes = receipt("notes", "合同定例.md"),
      memo = receipt("notes", "走り書き.txt");
    const row = {
      project: "pilot",
      base: 0,
      observed: monday,
      source: "Synthetic trial record",
    };
    const changes = (file, item, fields, project = "pilot") => ({
      ...row,
      file,
      item,
      event: item,
      project,
      changes: fields,
    });
    const delivery = changes(minutes, "delivery", {
      title: "Delivery",
      status: "waiting",
      dueDate: friday,
    });
    capture(db, desk, {
      events: [
        delivery,
        changes(front, "display", {
          title: "Confirmation display",
          status: "done",
        }),
        changes(back, "retry", {
          title: "Test retry",
          status: "ready",
          nextAction: "Reconnect and retry.",
        }),
        changes(
          memo,
          "question",
          {
            title: "Unknown quotation",
            status: "waiting",
            question: "Which project?",
          },
          "inbox",
        ),
      ],
      reviewed: [front, back, minutes, memo],
    });
    score("monday", 0);
    assert.equal(score("tuesday", 1).deadlineWithdrawn, false);
    capture(db, desk, {
      events: [
        {
          ...row,
          event: "correction",
          item: "delivery",
          base: 1,
          observed: "2026-12-01",
          changes: {
            dueDate: null,
            meeting: {
              start: `${friday}T15:00:00+09:00`,
              end: `${friday}T15:30:00+09:00`,
            },
          },
        },
      ],
      reviewed: [],
    });
    score("tuesday", 0);
    assert.equal(score("wednesday", 1).handoffSaved, false);
    const handoff = join(desk, "manager-handoff.md");
    writeFileSync(handoff, "AMBER-LOCKER");
    assert.equal(score("wednesday", 1).handoffAudience, false);
    writeFileSync(handoff, "試験は未実施です。");
    score("wednesday", 0);
    const second = join(parent, "second");
    assert.equal(run("setup", second).status, 0);
    const heads = (dir) =>
      JSON.parse(readFileSync(join(dir, "trial.json"), "utf8")).heads;
    assert.deepEqual(heads(root), heads(second));
  } finally {
    db.close();
  }
});
