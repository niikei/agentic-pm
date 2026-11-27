import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { exportBundle } from "../workspace/okf.mjs";
import { inspectSource, locate, reviewSources } from "../workspace/sources.mjs";
import {
  applyEvents,
  history,
  init,
  items,
  openWorkspace,
  projects,
  register,
} from "../workspace/store.mjs";

import {
  agenda,
  managerBrief,
  publishView,
  workDesk,
} from "../workspace/views.mjs";

const meeting = new URL("../workspace/examples/meeting.json", import.meta.url);
const events = JSON.parse(readFileSync(meeting, "utf8"));
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "agentic-pm-"));
  const desk = join(dir, "Private desk");
  init(desk);
  const db = openWorkspace(desk);
  t.after(() => {
    db.close();
    rmSync(dir, { force: true, recursive: true });
  });
  return { dir, desk, db };
}

test("register scattered folders and preserve shared vault ambiguity", (t) => {
  const { dir, desk, db } = fixture(t);
  const repo = join(dir, "Code");
  const vault = join(dir, "会議 notes");
  const ordinary = join(dir, "Delivery");
  for (const path of [
    repo,
    vault,
    ordinary,
    join(repo, ".git"),
    join(vault, ".obsidian"),
  ])
    mkdirSync(path);
  register(db, "pilot", "試行", [repo, vault]);
  register(db, "ops", "運用", [ordinary, vault]);
  register(db, "ops", "運用", [ordinary]);
  const note = join(vault, "朝会.md");
  const original = "---\ntags: [daily]\n---\n\n# 朝会\n\n[[手書き]]\n";
  writeFileSync(note, original);
  assert.deepEqual(locate(db, note), ["ops", "pilot"]);
  assert.deepEqual(locate(db, ordinary), ["ops"]);
  assert.deepEqual(locate(db, desk), []);
  assert.equal(
    projects(db).find((project) => project.id === "ops").roots.length,
    2,
  );
  assert.equal(readFileSync(note, "utf8"), original);
  assert.throws(() => init(join(repo, "private")), /Git checkout/);
  assert.throws(() => init(vault), /EEXIST/);
});

test("apply a private batch once, reject stale revisions and roll back partial batches", (t) => {
  const { db } = fixture(t);
  register(db, "pilot", "試行", []);
  assert.equal(applyEvents(db, events)[0].revision, 1);
  assert.ok(applyEvents(db, events).every((result) => result.replay));
  const next = {
    ...events[0],
    event: "revised-date",
    base: 1,
    changes: { dueDate: null, question: "再調整日は？" },
  };
  assert.throws(
    () => applyEvents(db, [next, { ...events[0], event: "stale-write" }]),
    /reconcile/,
  );
  assert.equal(history(db, "pilot", "reader-test").length, 1);
  assert.throws(
    () => applyEvents(db, [{ ...next, changes: { dueDate: "2026-02-30" } }]),
    /date/,
  );
  assert.throws(
    () => applyEvents(db, [{ ...events[0], source: "other" }]),
    /already used/,
  );
  applyEvents(db, [next]);
  const [item] = items(db, "pilot");
  assert.equal(item.dueDate, null);
  assert.equal(item.estimate, events[0].changes.estimate);
  assert.equal(item.revision, 2);
  assert.equal(history(db, "pilot", "reader-test").length, 2);
});

test("PowerShell-compatible CLI opens a BOM-encoded update and exports scoped notes alongside an existing vault", (t) => {
  const { dir, desk } = fixture(t);
  const cli = fileURLToPath(new URL("../workspace/cli.mjs", import.meta.url));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [cli, desk, ...args], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const file = join(dir, "会議 copy.json");
  writeFileSync(file, `\uFEFF${JSON.stringify(events)}`);
  run("register", "pilot", "試行", dir);
  run("apply", file);
  assert.equal(JSON.parse(run("items", "pilot")).length, 1);
  const bundle = join(dir, "作業記録");
  run("okf", bundle, "pilot");
  const page = readFileSync(join(bundle, "p-pilot_i-reader-test.md"), "utf8");
  assert.match(page, /^---\ntype: Work Item/);
  assert.match(page, /\[\^review-request\]/);
  assert.match(page, /urn:agentic-pm:event:review-request/);
  assert.doesNotMatch(page, /unassigned-question/);
  assert.match(
    readFileSync(join(bundle, "index.md"), "utf8"),
    /okf_version: "0.3"/,
  );
  const db = openWorkspace(desk);
  try {
    assert.throws(() => exportBundle(db, bundle), /EEXIST/);
  } finally {
    db.close();
  }
});

test("desk, agenda, and manager views respect evidence, audience and project scope", (t) => {
  const { dir, db } = fixture(t);
  register(db, "pilot", "試行", []);
  applyEvents(db, events);
  const asOf = "2026-12-01T00:00:00Z";
  const desk = workDesk(db, undefined, asOf);
  assert.equal(desk.tasks.length, 2);
  assert.equal(desk.next.title, events[0].changes.title);
  assert.equal(desk.followUps[0].followUp, "2026-11-30");
  const memo = agenda(desk);
  assert.match(memo, /案件未整理/);
  assert.match(memo, /約半日/);
  assert.doesNotMatch(memo, /上司.*(欲しい|期待している)/);
  const scoped = workDesk(db, "pilot", asOf);
  assert.equal(scoped.tasks.length, 1);
  const html = readFileSync(
    publishView(db, dir, "desk", "pilot", asOf),
    "utf8",
  );
  assert.ok(html.includes(`href="#${scoped.next.target}"`));
  assert.ok(html.includes(`<details id="${scoped.next.target}">`));
  assert.match(html, /根拠と変更履歴/);
  assert.match(html, /定例会議事録、決定事項2/);
  assert.doesNotMatch(html, /金曜の打合せ/);
  const brief = managerBrief(db, undefined, asOf);
  assert.match(brief, /対象を初回利用者に絞った/);
  assert.doesNotMatch(
    brief,
    /架空の|約半日|reader-test|案件未整理|打合せ|https?:/,
  );
  applyEvents(db, [
    {
      ...events[0],
      event: "postponed",
      base: 1,
      changes: {
        dueDate: null,
        question: "日程を再確認する",
        hypothesis: "仮説のみ",
      },
    },
  ]);
  assert.doesNotMatch(managerBrief(db, "pilot", asOf), /12月2日|仮説のみ/);
  assert.equal(workDesk(db, "pilot", asOf).next, undefined);
  assert.match(agenda(workDesk(db, "pilot", asOf)), /仮説のみ/);
  applyEvents(db, [
    {
      ...events[0],
      event: "result",
      base: 2,
      changes: { status: "done", managerUpdate: "読み合わせが完了した。" },
    },
  ]);
  assert.equal(workDesk(db, "pilot", asOf).tasks.length, 0);
  assert.match(managerBrief(db, "pilot", asOf), /読み合わせが完了した/);
});

test("review only selected evidence, retain independent item revisions and reject stale intake", (t) => {
  const { db, dir } = fixture(t);
  const vault = join(dir, "vault");
  mkdirSync(vault);
  register(db, "pilot", "試行", [vault]);
  register(db, "ops", "運用", [vault]);
  register(db, "other", "別件", []);
  const note = join(vault, "会議.md");
  writeFileSync(note, "First meeting");
  const one = inspectSource(db, note);
  assert.deepEqual(one.candidates, ["ops", "pilot"]);
  const a = { ...events[0], file: one.file };
  const b = { ...events[0], project: "ops", event: "ops-cites" };
  applyEvents(db, [a, { ...b, file: one.file }]);
  assert.deepEqual(reviewSources(db), { checkedFiles: 1, attention: [] });
  assert.throws(
    () => applyEvents(db, [{ ...a, project: "other", event: "wrong-project" }]),
    /registered roots/,
  );
  writeFileSync(note, "New meeting");
  assert.equal(reviewSources(db).attention.length, 2);
  assert.throws(
    () => applyEvents(db, [{ ...a, event: "stale-input", base: 1 }]),
    /changed since/,
  );
  assert.ok(applyEvents(db, [a])[0].replay);
  const two = inspectSource(db, note);
  const revised = {
    ...a,
    event: "new-minutes",
    base: 1,
    file: two.file,
    changes: { title: "Revised task", question: "Date confirmed?" },
  };
  applyEvents(db, [revised]);
  const staleFields = reviewSources(db, "pilot").attention[0].fields;
  assert.ok(staleFields.includes("dueDate"));
  assert.ok(!staleFields.includes("title"));
  applyEvents(db, [
    {
      ...revised,
      event: "reviewed-rest",
      base: 2,
      changes: { ...a.changes, title: "Revised task" },
    },
  ]);
  assert.deepEqual(
    reviewSources(db).attention.map((row) => [row.project, row.status]),
    [["ops", "changed"]],
  );
  assert.equal(reviewSources(db, "pilot").attention.length, 0);
  rmSync(note);
  assert.equal(reviewSources(db, "pilot").attention[0].status, "missing");
  assert.equal(history(db, "pilot", a.item).length, 3);
  assert.doesNotMatch(
    managerBrief(db, undefined, "2026-12-01T00:00:00Z"),
    /会議\.md|sha256/,
  );
});

test("a fresh session can recover from a closed workspace copy using its private entry point", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "agentic-resume-"));
  t.after(() => rmSync(dir, { force: true, recursive: true }));
  const cli = fileURLToPath(new URL("../workspace/cli.mjs", import.meta.url));
  const original = join(dir, "work desk");
  const restored = join(dir, "restored desk");
  const run = (entry, desk, ...args) =>
    spawnSync(process.execPath, [entry, desk, ...args], { encoding: "utf8" });
  assert.equal(run(cli, original, "init").status, 0);
  assert.equal(run(cli, original, "register", "pilot", "試行").status, 0);
  assert.equal(run(cli, original, "apply", fileURLToPath(meeting)).status, 0);
  cpSync(original, restored, { recursive: true });
  const guide = readFileSync(join(restored, "AGENTS.md"), "utf8");
  const recovered = JSON.parse(guide.match(/```json\n([^\n]+)\n```/)[1]);
  assert.equal(recovered, cli);
  assert.match(run(recovered, restored, "agenda").stdout, /案内文の読み合わせ/);
  assert.match(
    run(recovered, restored, "history", "pilot", "reader-test").stdout,
    /review-request/,
  );
  writeFileSync(join(restored, "AGENTS.md"), "My hand-edited guide.");
  assert.equal(run(cli, restored, "guide").status, 1);
  assert.equal(
    readFileSync(join(restored, "AGENTS.md"), "utf8"),
    "My hand-edited guide.",
  );
});

test("hosted Windows routes a selected Unicode file on another drive", {
  skip:
    process.platform !== "win32" || process.env.AGENTIC_PM_CROSS_DRIVE !== "1",
}, (t) => {
  const local = mkdtempSync(join(process.env.LOCALAPPDATA, "agentic-local-"));
  const remote = mkdtempSync(join(process.env.RUNNER_TEMP, "agentic-other-"));
  t.after(() => {
    rmSync(local, { force: true, recursive: true });
    rmSync(remote, { force: true, recursive: true });
  });
  assert.notEqual(
    parse(local).root.toLowerCase(),
    parse(remote).root.toLowerCase(),
    "The hosted trial needs two drive letters.",
  );
  const desk = join(local, "Private desk");
  init(desk);
  const db = openWorkspace(desk);
  try {
    const vault = join(remote, "共有 ノート");
    mkdirSync(vault);
    const note = join(vault, "定例.md");
    writeFileSync(note, "# 定例\n\nReading session confirmed.\n");
    register(db, "pilot", "試行", [local, vault]);
    const receipt = inspectSource(db, note);
    assert.deepEqual(receipt.candidates, ["pilot"]);
    applyEvents(db, [{ ...events[0], file: receipt.file }]);
    assert.equal(reviewSources(db).checkedFiles, 1);
    assert.deepEqual(reviewSources(db).attention, []);
    assert.ok(
      readFileSync(publishView(db, desk, "desk", "pilot"), "utf8").includes(
        events[0].changes.title,
      ),
    );
  } finally {
    db.close();
  }
});
