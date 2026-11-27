import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stages } from "../reports/desk/model.mjs";
import { markdownText } from "../reports/writers/markdown.mjs";
import { sourceUrl } from "../reports/writers/shared.mjs";
import { labels, meetingTime } from "./fields.mjs";
import { history, items } from "./store.mjs";

const status = { ...stages, done: "完了" };

function concept(item, events) {
  const sourceOf = new Map();
  for (const event of events) {
    for (const key of Object.keys(event.changes)) sourceOf.set(key, event);
  }
  const used = new Set(
    Object.keys({ title: "", ...labels })
      .filter((key) => item[key])
      .map((key) => sourceOf.get(key)),
  );
  const lines = [
    "---",
    "type: Work Item",
    `title: ${JSON.stringify(item.title)}`,
    `x-agentic-pm-project: ${JSON.stringify(item.project)}`,
    `x-agentic-pm-revision: ${item.revision}`,
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
      `- **${label}** · ${markdownText(key === "status" ? status[item.status] : key === "meeting" ? meetingTime(item.meeting) : item[key])}[^${sourceOf.get(key).event}]`,
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
    "---",
    'okf_version: "0.3"',
    "title: 作業記録",
    "---",
    "",
    "# 作業記録",
    "",
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
  for (const page of pages)
    writeFileSync(join(destination, page.name), page.body, {
      flag: "wx",
      mode: 0o600,
    });
  return join(destination, "index.md");
}
