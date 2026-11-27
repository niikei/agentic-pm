import { buildDesk } from "../desk/model.mjs";

const reviews = {
  APPROVED: "承認済み",
  CHANGES_REQUESTED: "修正依頼",
  REVIEW_REQUIRED: "レビュー必須",
};
export function buildProjectDesk(snapshot, board, relations) {
  const stages = { Todo: "backlog", "In Progress": "active" };
  const items = snapshot.items.map((item) => ({
    ...item,
    projectRecord: true,
    stage: Object.hasOwn(stages, board.get(item.url))
      ? stages[board.get(item.url)]
      : item.stage,
  }));
  const desk = buildDesk({ ...snapshot, items });
  const byId = new Map(desk.tasks.map((task) => [task.id, task]));
  desk.recentChanges = [];
  const changes = [
    ...desk.tasks.filter((task) => task.kind === "change"),
    ...snapshot.deliveries,
  ];
  for (const change of changes) {
    const { issues, review } = relations.get(change.id);
    const state = change.at
      ? "マージ済み"
      : change.draft
        ? "ドラフト"
        : (reviews[review] ?? "オープン");
    const pr = { id: change.id, url: change.url, title: change.title, state };
    if (change.at) desk.recentChanges.push({ ...pr, at: change.at, issues });
    else Object.assign(change, { linkedIssues: issues, changeState: state });
    for (const issue of issues) {
      const task = byId.get(issue.id);
      if (task?.kind === "work") {
        task.linkedChanges ??= [];
        task.linkedChanges.push(pr);
      }
    }
  }
  desk.recentChanges.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  desk.coverageStart = snapshot.coverageStart;
  return desk;
}
