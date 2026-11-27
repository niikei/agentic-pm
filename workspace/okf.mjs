import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { markdownText } from "../reports/writers/markdown.mjs";
import { history, items } from "./store.mjs";

const labels = {
  status: "作業状態",
  nextAction: "次の行動",
  question: "要確認",
  dueDate: "確定期限",
  followUp: "次回確認日",
  estimate: "見積もりと前提",
  hypothesis: "仮説",
  managerUpdate: "上司向けの記述",
};
const status = {
  backlog: "未着手",
  ready: "着手可能",
  active: "進行中",
  waiting: "待機中",
  done: "完了",
};

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
  for (const { event, source } of used) {
    lines.push(
      `  - id: ${JSON.stringify(event)}`,
      `    resource: "urn:agentic-pm:event:${event}"`,
      `    title: ${JSON.stringify(source)}`,
    );
  }
  lines.push("---", "", `# ${markdownText(item.title)}`, "");
  for (const [key, label] of Object.entries(labels)) {
    if (!item[key]) continue;
    lines.push(
      `- **${label}** · ${markdownText(key === "status" ? status[item.status] : item[key])}[^${sourceOf.get(key).event}]`,
    );
  }
  lines.push("");
  for (const { event, source, observed } of used)
    lines.push(`[^${event}]: ${observed} · ${markdownText(source)}`);
  return `${lines.join("\n")}\n`;
}

export function exportBundle(db, destination, project) {
  // Materialize one database snapshot before creating any destination files.
  db.exec("BEGIN");
  let pages;
  try {
    pages = items(db, project).map((item) => ({
      name: `p-${item.project}_i-${item.item}.md`,
      title: item.title,
      body: concept(item, history(db, item.project, item.item)),
    }));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  mkdirSync(destination, { mode: 0o700 });
  const write = (file, value) =>
    writeFileSync(join(destination, file), value, { flag: "wx", mode: 0o600 });
  for (const page of pages) write(page.name, page.body);
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
  write("index.md", `${index.join("\n")}\n`);
  return join(destination, "index.md");
}
