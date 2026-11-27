import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

// The caller identifies the same editable field in each revision.
function action(field) {
  if (isDeepStrictEqual(field.current, field.proposed)) return "keep";
  if (!Object.hasOwn(field, "baseline")) return "review";
  if (isDeepStrictEqual(field.baseline, field.current)) return "apply";
  if (isDeepStrictEqual(field.baseline, field.proposed)) return "keep";
  return "review";
}

function plan(fields) {
  if (!Array.isArray(fields)) throw new Error("Expected an array of fields.");
  const seen = new Set();
  return fields.map((field, index) => {
    if (
      !field ||
      typeof field.id !== "string" ||
      !field.id.trim() ||
      !Object.hasOwn(field, "current") ||
      !Object.hasOwn(field, "proposed")
    ) {
      throw new Error(`Field ${index + 1} needs an id, current and proposed.`);
    }
    if (seen.has(field.id)) {
      throw new Error(`Field ${index + 1} repeats an id.`);
    }
    seen.add(field.id);
    const result = action(field);
    return result === "apply"
      ? { id: field.id, action: result, value: field.proposed }
      : { id: field.id, action: result };
  });
}

try {
  const fields = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(plan(fields), null, 2)}\n`);
} catch (error) {
  // Parsing errors may include snippets from private records.
  process.stderr.write(
    `${error instanceof SyntaxError ? "Invalid JSON input." : error.message}\n`,
  );
  process.exitCode = 1;
}
