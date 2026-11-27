import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const command = fileURLToPath(
  new URL(
    "../.agents/skills/project-materials/scripts/plan-updates.mjs",
    import.meta.url,
  ),
);

function run(input) {
  return spawnSync(process.execPath, [command], { input, encoding: "utf8" });
}

test("plans independent edits, preserves human changes and handles an unknown baseline", () => {
  const fields = [
    { id: "A", baseline: null, current: null, proposed: "Ready" },
    { id: "B", baseline: 0, current: 2, proposed: 0 },
    { id: "C", baseline: "Draft", current: "Chair note", proposed: "Approved" },
    { id: "D", current: null, proposed: 0 },
    {
      id: "E",
      current: { qty: 0, unit: "days" },
      proposed: { unit: "days", qty: 0 },
    },
  ];
  const result = run(JSON.stringify(fields));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    { id: "A", action: "apply", value: "Ready" },
    { id: "B", action: "keep" },
    { id: "C", action: "review" },
    { id: "D", action: "review" },
    { id: "E", action: "keep" },
  ]);
  fields[0].current = "Ready";
  assert.equal(
    JSON.parse(run(JSON.stringify(fields)).stdout)[0].action,
    "keep",
  );
});

test("rejects ambiguous input without emitting partial edits or source text", () => {
  const row = { id: "a", current: "", proposed: "sensitive fixture" };
  for (const input of [
    JSON.stringify([row, row]),
    JSON.stringify([row, { id: "b" }]),
    "sensitive fixture",
  ]) {
    const result = run(input);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.doesNotMatch(result.stderr, /sensitive fixture/);
  }
});
