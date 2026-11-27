import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
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
import { refreshBundle } from "../workspace/vault.mjs";
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

test("a shared calendar supplies a zoned meeting without assigning a deadline or guessing the project", (t) => {
  const { db, dir } = fixture(t);
  const root = join(dir, "calendar");
  mkdirSync(root);
  const file = join(root, "appointment.txt");
  writeFileSync(file, "10:30 to 11:00 JST on December 2");
  register(db, "inbox", "未整理", [root]);
  register(db, "pilot", "試行", []);
  const receipt = inspectSource(db, file);
  assert.equal(receipt.shared, true);
  assert.deepEqual(receipt.candidates, []);
  const meeting = {
    start: "2026-12-02T01:30:00Z",
    end: "2026-12-02T11:00:00+09:00",
  };
  const entry = {
    ...events[1],
    file: receipt.file,
    changes: { ...events[1].changes, meeting },
  };
  applyEvents(db, [entry]);
  const asOf = "2026-12-02T01:40:00Z";
  const scene = workDesk(db, undefined, asOf);
  assert.equal(scene.meetings.length, 1);
  assert.equal(scene.meetings[0].offset, null);
  assert.ok(scene.datesUnknown);
  assert.match(agenda(scene), /10[:時]30.*11[:時]00.*JST/);
  assert.equal(
    workDesk(db, undefined, "2026-12-02T02:01:00Z").meetings.length,
    0,
  );
  assert.throws(
    () =>
      applyEvents(db, [
        {
          ...entry,
          event: "invalid-end",
          base: 1,
          changes: { meeting: { start: meeting.start, end: meeting.start } },
        },
      ]),
    /follow/,
  );
  assert.throws(
    () =>
      applyEvents(db, [
        {
          ...entry,
          event: "unknown-zone",
          base: 1,
          changes: { meeting: { start: "2026-12-02T10:30:00" } },
        },
      ]),
    /instant/,
  );
  const assigned = { ...entry, project: "pilot", event: "assign-meeting" };
  applyEvents(db, [
    assigned,
    { ...entry, event: "close-inbox", base: 1, changes: { status: "done" } },
  ]);
  assert.equal(workDesk(db, undefined, asOf).meetings.length, 1);
  assert.deepEqual(reviewSources(db).attention, []);
  assert.doesNotMatch(managerBrief(db, undefined, asOf), /10:30/);
});

test("manager regeneration withholds stale or missing evidence and lists affected items only to the operator", (t) => {
  const { dir, db } = fixture(t);
  register(db, "pilot", "試行", [dir]);
  const note = join(dir, "minutes.md");
  writeFileSync(note, "Confirmed draft one");
  const source = inspectSource(db, note);
  const first = { ...events[0], file: source.file };
  const other = {
    ...events[0],
    event: "independent",
    item: "other",
    changes: {
      title: "Internal only",
      status: "done",
      managerUpdate: "Another verified outcome",
    },
  };
  applyEvents(db, [first, other]);
  const asOf = "2026-11-28T04:00:00Z";
  assert.match(managerBrief(db, "pilot", asOf), /初回利用者/);
  writeFileSync(note, "Decision changed");
  const held = [];
  const brief = managerBrief(db, "pilot", asOf, (row) => held.push(row));
  assert.deepEqual(held, [
    { project: "pilot", item: first.item, reason: "changed" },
  ]);
  assert.match(brief, /Another verified outcome/);
  assert.doesNotMatch(
    brief,
    /初回利用者|minutes\.md|reader-test|changed|Internal only/,
  );
  applyEvents(db, [
    {
      ...first,
      base: 1,
      event: "rechecked",
      file: inspectSource(db, note).file,
      changes: { managerUpdate: "Rechecked outcome" },
    },
  ]);
  assert.match(managerBrief(db, "pilot", asOf), /Rechecked outcome/);
  rmSync(note);
  const path = publishView(db, dir, "manager", "pilot", asOf, (row) =>
    held.push(row),
  );
  assert.equal(held.at(-1).reason, "missing");
  assert.doesNotMatch(readFileSync(path, "utf8"), /Rechecked outcome|missing/);
});

test("refresh a bound OKF project in place, preserve material outside generated text and isolate conflicts", (t) => {
  const { dir, db } = fixture(t);
  register(db, "pilot", "試行", []);
  applyEvents(db, events);
  const target = join(dir, "Knowledge");
  const filename = "p-pilot_i-reader-test.md";
  const page = join(target, filename);
  const first = refreshBundle(db, target, "pilot");
  assert.deepEqual(first.written, [filename, "index.md"]);
  assert.deepEqual(refreshBundle(db, target, "pilot").written, []);
  const personal = "\n## 手書きメモ\n\n[[Original wording]]\n";
  appendFileSync(page, personal);
  writeFileSync(join(target, "Daily.md"), "Private daily note");
  const revise = (event, base, title) =>
    applyEvents(db, [{ ...events[0], event, base, changes: { title } }]);
  revise("new-title", 1, "Revised title");
  assert.deepEqual(refreshBundle(db, target, "pilot").conflicts, []);
  const revised = readFileSync(page, "utf8");
  assert.ok(revised.endsWith(personal));
  assert.match(revised, /# Revised title/);
  assert.equal(
    readFileSync(join(target, "Daily.md"), "utf8"),
    "Private daily note",
  );
  const withProperty = revised.replace(
    "type: Work Item",
    "x-team-tag: Review\ntype: Work Item",
  );
  writeFileSync(page, withProperty);
  revise("newer-title", 2, "Later title");
  assert.deepEqual(refreshBundle(db, target, "pilot").conflicts, [
    { name: filename, reason: "edited" },
  ]);
  assert.equal(readFileSync(page, "utf8"), withProperty);
  assert.doesNotMatch(readFileSync(first.index, "utf8"), /Later title/);
  rmSync(page);
  assert.equal(
    refreshBundle(db, target, "pilot").conflicts[0].reason,
    "removed",
  );
  assert.throws(() => refreshBundle(db, target, "inbox"), /project changed/);
  const ordinary = join(dir, "Existing notes");
  mkdirSync(ordinary);
  assert.throws(() => refreshBundle(db, ordinary, "pilot"), /EEXIST/);
});

test("a portfolio check-in shows a bounded sample, explains ties and retains a complete agenda", (t) => {
  const { db } = fixture(t);
  register(db, "pilot", "試行", []);
  const entries = Array.from({ length: 8 }, (_, i) => ({
    ...events[0],
    event: `record-${i}`,
    item: `task-${i}`,
    changes: {
      title: `Task ${i}`,
      status: "ready",
      nextAction: "Start review",
      estimate: `Estimate ${i}`,
    },
  }));
  applyEvents(db, entries);
  const desk = workDesk(db, undefined, "2026-11-28T00:00:00Z");
  const short = agenda(desk),
    full = agenda(desk, true);
  assert.match(short, /同じ期限条件で着手できる作業が8件/);
  assert.match(short, /ほか5件/);
  assert.doesNotMatch(short, /Estimate 7/);
  assert.match(short, /agenda --all/);
  assert.match(full, /Estimate 7/);
  assert.match(full, /ほかに着手できる作業/);
  assert.doesNotMatch(full, /ほか5件/);
  applyEvents(db, [
    {
      ...entries[7],
      event: "commit-date",
      base: 1,
      changes: { dueDate: "2026-11-30" },
    },
  ]);
  assert.match(
    agenda(workDesk(db, undefined, "2026-11-28T00:00:00Z")),
    /期限が最も早い/,
  );
});

test("compact reminders surface the earliest missed check before newer deadlines and undated intake", (t) => {
  const { db } = fixture(t);
  register(db, "pilot", "Pilot", []);
  const plans = [
    ["a", { dueDate: "2026-12-16", followUp: "2026-11-28" }],
    ["b", { dueDate: "2026-11-28" }],
    ["c", { dueDate: "2026-11-28", followUp: "2026-11-27" }],
    ["z", { followUp: "2026-11-23" }],
  ];
  applyEvents(db, [
    ...plans.map(([item, dates]) => ({
      ...events[0],
      item,
      event: item,
      changes: { title: item, status: "waiting", ...dates },
    })),
    { ...events[1], changes: { title: "Undated intake", status: "waiting" } },
  ]);
  const desk = workDesk(db, undefined, "2026-11-28T00:00:00Z");
  const section = (full) =>
    agenda(desk, full).split("## 忘れそうな確認")[1].split("##")[0];
  const short = section(false);
  assert.deepEqual(
    [...short.matchAll(/\*\*(.*?)\*\*/g)].map((match) => match[1]),
    ["z", "c", "b"],
  );
  assert.match(short, /ほか2件/);
  assert.match(section(true), /\*\*a\*\*[\s\S]*\*\*Undated intake\*\*/);
});

test("private evidence can open an explicit permalink while the manager draft stays self-contained", (t) => {
  const { dir, db } = fixture(t);
  register(db, "pilot", "試行", [dir]);
  const file = join(dir, "private note.md");
  writeFileSync(file, "Source detail");
  const update = {
    ...events[0],
    file: inspectSource(db, file).file,
    permalink: "https://github.com/example/pilot/issues/12#issuecomment-3",
  };
  for (const permalink of [
    "local-note.md",
    "file:///example",
    "https://example:password@example.org/",
  ]) {
    assert.throws(
      () => applyEvents(db, [{ ...update, permalink }]),
      /permalink/,
    );
  }
  applyEvents(db, [update]);
  const desk = readFileSync(publishView(db, dir, "desk", "pilot"), "utf8");
  assert.ok(desk.includes(`href="${update.permalink}"`));
  assert.match(desk, /private note\.md/);
  const folder = join(dir, "Bundle");
  exportBundle(db, folder, "pilot");
  const concept = readFileSync(
    join(folder, "p-pilot_i-reader-test.md"),
    "utf8",
  );
  assert.ok(concept.includes(`resource: "${update.permalink}"`));
  assert.doesNotMatch(concept, /private note\.md/);
  assert.doesNotMatch(
    managerBrief(db, undefined, "2026-11-28T00:00:00Z"),
    /https?:|private note\.md|issuecomment/,
  );
});

test("late-arriving evidence can add independent details and preserves newer field decisions", (t) => {
  const { db } = fixture(t);
  register(db, "pilot", "試行", []);
  applyEvents(db, events);
  const current = {
    ...events[0],
    event: "cancel-commitment",
    base: 1,
    observed: "2026-11-28",
    changes: { dueDate: null },
  };
  applyEvents(db, [current]);
  const earlier = {
    ...current,
    event: "older-note",
    base: 2,
    observed: "2026-11-26",
    changes: { estimate: "One day", dueDate: "2026-12-01" },
  };
  assert.throws(() => applyEvents(db, [earlier]), /Later evidence.*dueDate/);
  applyEvents(db, [
    {
      ...earlier,
      changes: {
        hypothesis: "Ask whether the earlier audience still applies.",
      },
    },
  ]);
  const [result] = items(db, "pilot");
  assert.equal(result.dueDate, null);
  assert.equal(result.revision, 3);
  assert.equal(history(db, "pilot", result.item)[1].observed, "2026-11-28");
});

test("competing CLI sessions preserve one winning revision; output recovery can replay saved intake", async (t) => {
  const { dir, desk, db } = fixture(t);
  register(db, "pilot", "試行", []);
  const cli = fileURLToPath(new URL("../workspace/cli.mjs", import.meta.url));
  const inputs = [
    events[0],
    { ...events[0], event: "concurrent-observation" },
  ].map((event) => {
    const path = join(dir, `${event.event}.json`);
    writeFileSync(path, JSON.stringify([event]));
    return path;
  });
  const call = (...args) =>
    promisify(execFile)(process.execPath, [cli, desk, ...args], {
      encoding: "utf8",
    });
  mkdirSync(join(desk, "desk.html"));
  const result = await Promise.allSettled(
    inputs.map((file) => call("apply", file)),
  );
  const saved = result.find((entry) => entry.reason?.code === 2)?.reason;
  const stale = result.find((entry) => entry.reason?.code === 1)?.reason;
  assert.ok(saved);
  assert.match(saved.stderr, /Intake saved/);
  assert.match(stale.stderr, /current revision/);
  const [{ event }] = JSON.parse(saved.stdout).updates;
  assert.equal(history(db, "pilot", events[0].item).length, 1);
  renameSync(join(desk, "desk.html"), join(desk, "preserved-directory"));
  const retry = JSON.parse(
    (await call("apply", join(dir, `${event}.json`))).stdout,
  );
  assert.equal(retry.updates[0].replay, true);
  assert.ok(readFileSync(retry.desk, "utf8").includes(events[0].changes.title));
});

test("a replaced destination receives no new project pages and a recognizable legacy bundle upgrades in place", (t) => {
  const { dir, db } = fixture(t);
  register(db, "pilot", "試行", []);
  applyEvents(db, events);
  const target = join(dir, "bound");
  refreshBundle(db, target, "pilot");
  const marker = join(target, ".agentic-pm-bundle");
  assert.ok(readFileSync(marker, "utf8").length > 0);
  // A pre-identity workspace records generated baselines without a marker.
  db.exec("DROP TABLE vault_ids");
  rmSync(marker);
  assert.deepEqual(refreshBundle(db, target, "pilot").conflicts, []);
  assert.ok(readFileSync(marker, "utf8").length > 0);
  const page = readFileSync(join(target, "p-pilot_i-reader-test.md"), "utf8");
  assert.match(page, /x-agentic-pm-work-status: "ready"/);
  assert.match(page, /x-agentic-pm-due: "2026-12-02"/);
  assert.doesNotMatch(page, /x-agentic-pm-follow-up/);
  renameSync(target, join(dir, "original-bound"));
  mkdirSync(target);
  applyEvents(db, [{ ...events[0], event: "extra-item", item: "second" }]);
  assert.throws(() => refreshBundle(db, target, "pilot"), /identity changed/);
  assert.deepEqual(readdirSync(target), []);
});

test("a sourced proposal and agent forecast remain distinct from effort and a confirmed deadline", (t) => {
  const { db, dir } = fixture(t);
  register(db, "pilot", "試行", []);
  const forecast = {
    from: "2026-12-04",
    origin: "source",
    basis: "The slide proposes a date pending approval.",
  };
  const entry = {
    ...events[0],
    changes: {
      title: "Prepare distribution",
      status: "ready",
      estimate: "1.5 person-days if a reviewer is available.",
      forecast,
    },
  };
  applyEvents(db, [entry]);
  const at = "2026-12-01T00:00:00Z";
  const first = workDesk(db, "pilot", at);
  assert.equal(first.undated, 1);
  assert.equal(
    first.days.reduce((total, day) => total + day.count, 0),
    0,
  );
  assert.match(agenda(first), /資料上の案/);
  const next = {
    ...entry,
    event: "scenario",
    base: 1,
    changes: {
      forecast: {
        from: "2026-12-05",
        through: "2026-12-08",
        origin: "agent",
        basis: "One review slot assumed.",
      },
    },
  };
  assert.throws(
    () =>
      applyEvents(db, [
        {
          ...next,
          changes: { forecast: { ...forecast, through: "2026-12-03" } },
        },
      ]),
    /precedes/,
  );
  applyEvents(db, [next]);
  assert.match(
    agenda(workDesk(db, "pilot", at)),
    /AIの試算.*2026-12-05〜2026-12-08/,
  );
  const target = join(dir, "forecast");
  exportBundle(db, target, "pilot");
  const page = readFileSync(join(target, "p-pilot_i-reader-test.md"), "utf8");
  assert.match(page, /x-agentic-pm-forecast-from: "2026-12-05"/);
  assert.doesNotMatch(page, /x-agentic-pm-due:/);
  applyEvents(db, [
    {
      ...next,
      event: "committed",
      base: 2,
      changes: { dueDate: "2026-12-07", forecast: null },
    },
  ]);
  const final = workDesk(db, "pilot", at);
  assert.equal(final.undated, 0);
  assert.doesNotMatch(agenda(final), /仮の見通し/);
});
