import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  catalog,
  loadDefinition,
  readJson,
  sampleFile,
  validateSnapshot,
} from "../reports/catalog.mjs";

const cli = fileURLToPath(new URL("../reports/cli.mjs", import.meta.url));
function invoke(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

test("every bundled definition validates and has a usable document in the offline gallery", (t) => {
  const entries = catalog();
  const result = invoke(["gallery"]);
  assert.equal(result.status, 0, result.stderr);
  const index = result.stdout.trim();
  const dir = dirname(index);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const page = readFileSync(index, "utf8");
  assert.ok(page.includes('href="./documents/task-desk.html"'));
  assert.ok(
    readFileSync(join(dir, "documents", "task-desk.html"), "utf8").includes(
      "作業の見通し",
    ),
  );
  for (const { id, definition } of entries) {
    const format = definition.format === "html" ? "html" : "md";
    const name = `documents/${id}.${format}`;
    assert.ok(page.includes(`href="./${name}"`));
    assert.ok(readFileSync(join(dir, name), "utf8").includes(definition.title));
    assert.deepEqual(
      loadDefinition(join(dir, "definitions", `${id}.json`)),
      definition,
    );
  }
});

test("a user-owned JSON file changes reader, locale, writer and selected sections from another working directory", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "report-fork-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fork = {
    ...catalog()[0].definition,
    language: "ja",
    reader: "引き継ぎ担当",
    title: "引き継ぎ",
    question: "次に決めることは何か。",
    format: "markdown",
    sections: ["decisions"],
  };
  delete fork.periodDays;
  writeFileSync(join(dir, "our brief.json"), JSON.stringify(fork));
  assert.equal(loadDefinition(join(dir, "our brief.json")).periodDays, 7);
  const good = invoke(["render", "our brief.json"], dir);
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /引き継ぎ担当/);
  assert.match(good.stdout, /W-12/);
  assert.doesNotMatch(good.stdout, /C-17/);
  for (const invalid of [
    { language: "xx" },
    { reader: " " },
    { sections: ["unknown"] },
    { format: "pdf" },
    { schemaVersion: 2 },
  ]) {
    writeFileSync(
      join(dir, "our brief.json"),
      JSON.stringify({ ...fork, ...invalid }),
    );
    const bad = invoke(["render", "our brief.json"], dir);
    assert.notEqual(bad.status, 0);
    assert.equal(bad.stdout, "");
  }
});

test("snapshot validation rejects ambiguous identities, broken evidence links and impossible times", () => {
  for (const mutate of [
    (s) => s.items.push(s.items[0]),
    (s) => {
      s.items[0].url = "file:///private";
    },
    (s) => {
      s.items[0].url = "https://name:password@example.org";
    },
    (s) => {
      s.asOf = "2026-02-30T00:00:00Z";
    },
    (s) => {
      s.items[0].updatedAt = "2029-01-01T00:00:00Z";
    },
    (s) => {
      s.coverageStart = "2029-01-01T00:00:00Z";
    },
  ]) {
    const snapshot = readJson(sampleFile);
    mutate(snapshot);
    assert.throws(() => validateSnapshot(snapshot));
  }
});
