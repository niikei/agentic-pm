const day = 86_400_000;
const localDay = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const stages = {
  active: "進行中",
  ready: "着手可能",
  backlog: "未着手",
  waiting: "待機中",
  unknown: "状態未記録",
};

export function buildDesk(snapshot, owner) {
  const today = localDay.format(new Date(snapshot.asOf));
  const midnight = Date.parse(today);
  const tasks = snapshot.items
    .filter((item) => !owner || item.owners.includes(owner))
    .map((item) => {
      const offset = item.dueDate
        ? (Date.parse(item.dueDate) - midnight) / day
        : null;
      const waitHours = item.decisionSince
        ? Math.floor(
            (Date.parse(snapshot.asOf) - Date.parse(item.decisionSince)) /
              3_600_000,
          )
        : null;
      return { ...item, waitHours, stage: item.stage ?? "unknown", offset };
    });
  tasks.sort(
    (a, b) =>
      (a.offset ?? Infinity) - (b.offset ?? Infinity) ||
      a.id.localeCompare(b.id, "ja", { numeric: true }),
  );
  const actionable = tasks.filter(
    (task) =>
      ["active", "ready"].includes(task.stage) &&
      task.nextAction &&
      !task.needsDecision &&
      !task.unassignedProject,
  );
  const next = actionable[0];
  const tied = next
    ? actionable.filter((task) => task.offset === next.offset).length
    : 0;
  let nextReason;
  if (actionable.length === 1)
    nextReason = "着手できる状態で、次の行動まで記録された作業はこの1件です。";
  else if (tied > 1)
    nextReason = `同じ期限条件で着手できる作業が${tied}件あります。案件名・ID順の先頭を表示しています。`;
  else if (next)
    nextReason = "着手できる作業の中で、記録された期限が最も早い項目です。";
  const questions = tasks
    .filter((task) => task.needsDecision)
    .sort((a, b) => (b.waitHours ?? -1) - (a.waitHours ?? -1));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(midnight + day * index).toISOString().slice(0, 10);
    return {
      date,
      count: tasks.filter((task) => task.offset === index).length,
    };
  });
  return {
    project: snapshot.project,
    asOf: snapshot.asOf,
    today,
    owner,
    tasks,
    datesUnknown:
      tasks.length > 0 && tasks.every((task) => task.offset === null),
    next,
    nextReason,
    actionable,
    questions,
    days,
    overdue: tasks.filter((task) => task.offset !== null && task.offset < 0)
      .length,
    undated: tasks.filter((task) => task.offset === null).length,
    later: tasks.filter((task) => task.offset >= 7).length,
    counts: Object.fromEntries(
      Object.keys(stages).map((stage) => [
        stage,
        tasks.filter((task) => task.stage === stage).length,
      ]),
    ),
  };
}
