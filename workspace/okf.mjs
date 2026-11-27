import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stages } from "../reports/desk/model.mjs";
import { markdownText } from "../reports/writers/markdown.mjs";
import { sourceUrl } from "../reports/writers/shared.mjs";
import { forecastLabel, labels, meetingTime } from "./fields.mjs";
import { fieldSources, history, items } from "./store.mjs";

const status = { ...stages, done: "完了", reference: "参考情報" };

export const indexPreamble = [
  "---",
  'okf_version: "0.3"',
  "title: 作業記録",
  "---",
  "",
  "# 作業記録",
  "",
].join("\n");

function fieldValue(item, key) {
  if (key === "status") return status[item.status];
  if (key === "meeting") return meetingTime(item.meeting);
  if (key === "forecast") return forecastLabel(item.forecast);
  return item[key];
}

function concept(item, events) {
  const sourceOf = fieldSources(events);
  const used = new Set(
    Object.keys({ title: "", ...labels })
      .filter((key) => item[key])
      .map((key) => sourceOf.get(key)),
  );
  const lines = [
    "---",
    item.status === "reference" ? "type: Reference Note" : "type: Work Item",
    `title: ${JSON.stringify(item.title)}`,
    `x-agentic-pm-project: ${JSON.stringify(item.project)}`,
    `x-agentic-pm-revision: ${item.revision}`,
    ...Object.entries({
      "x-agentic-pm-work-status": item.status,
      "x-agentic-pm-due": item.dueDate,
      "x-agentic-pm-forecast-from": item.forecast?.from,
      "x-agentic-pm-forecast-through": item.forecast?.through,
      "x-agentic-pm-follow-up": item.followUp,
      "x-agentic-pm-meeting-start": item.meeting?.start,
    })
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    "sources:",
  ];
  for (const { event, source, permalink } of used) {
    lines.push(
      `  - id: ${JSON.stringify(event)}`,
      `    resource: ${JSON.stringify(sourceUrl(permalink) ?? `urn:agentic-pm:event:${event}`)}`,
      `    title: ${JSON.stringify(source)}`,
    );
  }
  lines.push("---", "", `# ${markdownText(item.title)}`, "");
  for (const [key, label] of Object.entries(labels)) {
    if (!item[key]) continue;
    lines.push(
      `- **${label}** · ${markdownText(fieldValue(item, key))}[^${sourceOf.get(key).event}]`,
    );
  }
  lines.push("");
  for (const { event, source, observed } of used)
    lines.push(`[^${event}]: ${observed} · ${markdownText(source)}`);
  return `${lines.join("\n")}\n`;
}

export function bundlePages(db, project) {
  const pages = items(db, project).map((item) => ({
    name: `p-${item.project}_i-${item.item}.md`,
    title: item.title,
    body: concept(item, history(db, item.project, item.item)),
  }));
  const index = [
    indexPreamble,
    ...pages.map((page) => `- [${markdownText(page.title)}](${page.name})`),
  ];
  return [...pages, { name: "index.md", body: `${index.join("\n")}\n` }];
}

export function exportBundle(db, destination, project) {
  db.exec("BEGIN");
  let pages;
  try {
    pages = bundlePages(db, project);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  mkdirSync(destination, { mode: 0o700 });
  writeFileSync(join(destination, ".agentic-pm-snapshot"), "OKF snapshot\n", {
    flag: "wx",
    mode: 0o600,
  });
  for (const page of pages)
    writeFileSync(join(destination, page.name), page.body, {
      flag: "wx",
      mode: 0o600,
    });
  return join(destination, "index.md");
}
