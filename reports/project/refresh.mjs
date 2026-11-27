import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, selectDefinition, validateSnapshot } from "../catalog.mjs";
import { renderDesk } from "../desk/html.mjs";
import { buildReport } from "../model.mjs";
import { captureGitHub } from "../sources/github.mjs";
import { renderHtml } from "../writers/html.mjs";
import { captureBoard, captureRelations, repository } from "./github.mjs";
import { buildProjectDesk } from "./model.mjs";

function renderBrief() {
  const outcomes = readJson(new URL("./outcomes.json", import.meta.url));
  const asOf = outcomes
    .map((item) => item.observedAt)
    .sort()
    .at(-1);
  const snapshot = validateSnapshot({
    project: "agentic-pm",
    asOf,
    coverageStart: asOf,
    items: [],
    deliveries: [],
    outcomes,
  });
  return renderHtml(
    buildReport(selectDefinition("manager-outcomes-ja"), snapshot),
  );
}

function refresh() {
  const [audience = "operator", ...extra] = process.argv.slice(2);
  if (extra.length || !["operator", "manager"].includes(audience))
    throw new Error("Usage: pnpm desk:project [operator|manager]");
  let page;
  let filename;
  if (audience === "manager") {
    filename = "brief.html";
    page = renderBrief();
  } else {
    filename = "index.html";
    const snapshot = validateSnapshot(captureGitHub(repository, 7));
    page = renderDesk(
      buildProjectDesk(snapshot, captureBoard(), captureRelations(snapshot)),
    );
  }
  const folder = fileURLToPath(
    new URL("../../dist/project-desk/", import.meta.url),
  );
  mkdirSync(folder, { recursive: true });
  const staging = mkdtempSync(join(folder, ".refresh-"));
  const target = join(folder, filename);
  try {
    writeFileSync(join(staging, filename), page);
    renameSync(join(staging, filename), target);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  console.log(target);
}

try {
  refresh();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
