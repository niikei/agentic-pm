import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const biome = require.resolve("@biomejs/biome/bin/biome");

test("formatting agent instructions normalizes YAML and preserves Mermaid source", () => {
  const diagram = [
    "```mermaid",
    "flowchart LR",
    "    Issue[Scoped issue] --> Review[Human review]",
    "```",
  ].join("\n");
  const input = [
    "---",
    'applyTo:    "**/*.md"',
    "---",
    "",
    "# Review",
    "",
    diagram,
    "",
  ].join("\n");

  const formatted = execFileSync(
    process.execPath,
    [
      biome,
      "format",
      "--stdin-file-path=.github/instructions/review.instructions.md",
    ],
    { input, encoding: "utf8" },
  );

  assert.equal(formatted, input.replace("applyTo:    ", "applyTo: "));
});
