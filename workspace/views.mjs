import { randomUUID } from "node:crypto";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderDesk } from "../reports/desk/html.mjs";
import { buildDesk } from "../reports/desk/model.mjs";
import { markdownText as md } from "../reports/writers/markdown.mjs";
import { labels, meetingTime } from "./fields.mjs";
import { history, items, projects, transaction } from "./store.mjs";

export function workDesk(db, project, asOf) {
  const names = new Map(projects(db).map((entry) => [entry.id, entry.name]));
  const records = items(db, project).filter(
    (record) => record.status !== "done",
  );
  const tasks = records.map((record) => {
    const target = `record-${record.project}_${record.item}`;
    const events = history(db, record.project, record.item);
    const evidence = events.map((event) => ({
      date: event.observed,
      source: event.source,
      changes: Object.keys(event.changes).map((key) => labels[key] ?? "件名"),
    }));
    return {
      id: `${names.get(record.project)} · ${record.item}`,
      title: record.title,
      target,
      url: `#${target}`,
      stage: record.status,
      owners: [],
      dueDate: record.dueDate,
      nextAction: record.nextAction,
      question: record.question,
      needsDecision: Boolean(record.question),
      meeting: record.meeting,
      meetingLabel: record.meeting && meetingTime(record.meeting),
      estimate: record.estimate,
      followUp: record.followUp,
      hypothesis: record.hypothesis,
      evidence,
      unassignedProject: record.project === "inbox",
    };
  });
  const desk = buildDesk({
    project: project ? names.get(project) : "全案件",
    asOf,
    items: tasks,
  });
  desk.followUps = desk.tasks
    .filter((task) => task.followUp)
    .sort((a, b) => a.followUp.localeCompare(b.followUp));
  desk.meetings = desk.tasks
    .filter(
      (task) =>
        task.meeting &&
        Date.parse(task.meeting.end ?? task.meeting.start) >= Date.parse(asOf),
    )
    .sort((a, b) => Date.parse(a.meeting.start) - Date.parse(b.meeting.start));
  return desk;
}

export function agenda(desk) {
  const lines = [
    `# ${md(desk.project)}の仕事メモ`,
    "",
    `基準日 · ${desk.today} JST`,
    "",
  ];
  const describe = (task, value) =>
    `- **${md(task.title)}** （${md(task.id)}） · ${md(value)}`;
  const section = (title, rows, empty) =>
    lines.push(`## ${title}`, "", ...(rows.length ? rows : [empty]), "");
  section(
    "次にやること",
    desk.next ? [describe(desk.next, desk.next.nextAction)] : [],
    "着手できる次の行動は未記録です。",
  );
  section(
    "忘れそうな確認",
    desk.tasks
      .filter(
        (t) =>
          (t.followUp && t.followUp <= desk.today) ||
          (t.offset !== null && t.offset <= 0) ||
          t.unassignedProject,
      )
      .map((t) =>
        describe(
          t,
          [
            t.followUp && `確認日 ${t.followUp}`,
            t.dueDate && `期限 ${t.dueDate}`,
            t.unassignedProject && "案件未整理",
            t.question,
          ]
            .filter(Boolean)
            .join(" ／ "),
        ),
      ),
    "確認日や確定期限を迎えた作業、案件未整理の作業はありません。",
  );
  section(
    "時間の見積もり",
    desk.tasks.filter((t) => t.estimate).map((t) => describe(t, t.estimate)),
    "作業時間の見積もりは未記録です。",
  );
  section(
    "会議の予定",
    desk.meetings.map((task) => describe(task, task.meetingLabel)),
    "今後の会議時刻は未記録です。",
  );
  section(
    "会議で確認すること",
    desk.questions.map((t) => describe(t, t.question)),
    "確認事項は未記録です。",
  );
  section(
    "関係者についての仮説",
    desk.tasks
      .filter((t) => t.hypothesis)
      .map((t) => describe(t, t.hypothesis)),
    "根拠をたどれる仮説は未記録です。",
  );
  return lines.join("\n");
}

export function managerBrief(db, project, asOf) {
  const lines = [
    "# 進捗報告",
    "",
    `作成日 · ${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date(asOf))}`,
    "",
  ];
  const updates = [];
  for (const record of items(db, project)) {
    if (record.project === "inbox" || !record.managerUpdate) continue;
    const events = history(db, record.project, record.item);
    // Later changes can invalidate an earlier reader-ready statement.
    const last = events.at(-1);
    if (!last.changes.managerUpdate) continue;
    updates.push({ date: last.observed, text: last.changes.managerUpdate });
  }
  updates.sort((a, b) => b.date.localeCompare(a.date));
  for (const { date, text } of updates) lines.push(`- ${date} · ${md(text)}`);
  if (!updates.length) lines.push("今回共有する進捗は未記録です。");
  return `${lines.join("\n")}\n`;
}

export function publishView(
  db,
  directory,
  edition,
  project,
  asOf = new Date().toISOString(),
) {
  return transaction(db, () => {
    const contents =
      edition === "manager"
        ? managerBrief(db, project, asOf)
        : renderDesk(workDesk(db, project, asOf));
    const extension = edition === "manager" ? "md" : "html";
    const destination = join(
      directory,
      `${edition}${project ? `-p-${project}` : ""}.${extension}`,
    );
    const temp = join(directory, `.${randomUUID()}.tmp`);
    try {
      writeFileSync(temp, contents, { flag: "wx", mode: 0o600 });
      renameSync(temp, destination);
    } finally {
      rmSync(temp, { force: true });
    }
    return destination;
  });
}
