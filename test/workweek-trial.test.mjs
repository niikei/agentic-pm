import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { calendar } from "../trials/workweek/case.mjs";
import { reveal } from "../trials/workweek/fixture.mjs";
import { score as scoreState } from "../trials/workweek/score.mjs";
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
    const days = calendar(monday);
    const meta = { heads: heads(root) };
    const stage = (day) => reveal(root, meta, days, day);
    assert.throws(() => stage("friday"), /before/);
    const purchasing = join(root, "notes", "購買確認.md");
    writeFileSync(purchasing, "Operator addition");
    assert.throws(() => stage("thursday"), /different content/);
    assert.equal(readFileSync(purchasing, "utf8"), "Operator addition");
    rmSync(purchasing);
    stage("thursday");
    stage("thursday");
    const retry = receipt("relay", "Retry-check.csv"),
      quote = receipt("notes", "購買確認.md");
    capture(db, desk, {
      events: [
        {
          ...row,
          file: retry,
          observed: days.thursday,
          event: "tested",
          item: "retry",
          base: 1,
          changes: { status: "done" },
        },
        {
          ...row,
          project: "inbox",
          file: quote,
          observed: days.thursday,
          event: "assigned",
          item: "question",
          base: 1,
          changes: { status: "done" },
        },
        {
          ...changes(
            quote,
            "battery",
            { title: "Battery quotation", status: "waiting" },
            "supplies",
          ),
          observed: days.thursday,
        },
      ],
      reviewed: [retry, quote],
    });
    score("thursday", 0);
    stage("friday");
    const decision = receipt("notes", "受入結果.md");
    capture(db, desk, {
      events: [
        {
          ...changes(decision, "instructions", {
            title: "Prepare one-page instructions",
            status: "ready",
          }),
          observed: friday,
        },
      ],
      reviewed: [decision],
    });
    const report = join(desk, "friday-report.md");
    writeFileSync(report, "main に統合しました。");
    assert.equal(score("friday", 1).readerPreference, false);
    writeFileSync(
      report,
      "試験済みです。25人までです。納品日は未定です。\n\n自分の次の一手は手順作成です。",
    );
    const withAppendix = score("friday", 1);
    assert.equal(withAppendix.personalAppendixOmitted, false);
    assert.equal(withAppendix.reportLength, false);
    writeFileSync(
      report,
      "限定試行は25人まで認められました。全面展開と納品日は未定です。",
    );
    score("friday", 0);
    // Close writers before copying the database and its generated notes.
    db.close();
    const restored = join(parent, "restored");
    cpSync(desk, restored, { recursive: true });
    assert.equal(
      scoreState(root, meta, days, "next-monday", restored).recoveryIsolated,
      false,
    );
    const recovered = openWorkspace(restored);
    try {
      capture(recovered, restored, {
        events: [
          {
            ...row,
            item: "reviewer",
            event: "requested",
            observed: days.nextMonday,
            changes: {
              title: "Ask operations for a reviewer",
              status: "waiting",
            },
          },
        ],
        reviewed: [],
      });
    } finally {
      recovered.close();
    }
    writeFileSync(
      join(restored, "handover-next.md"),
      "原稿を作成。運営からの担当者回答待ち。",
    );
    const recoveredScore = run("score", root, "next-monday", restored);
    assert.equal(
      recoveredScore.status,
      0,
      recoveredScore.stdout || recoveredScore.stderr,
    );
  } finally {
    if (db.isOpen) db.close();
  }
});
