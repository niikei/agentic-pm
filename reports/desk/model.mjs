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
  const next = tasks.find(
    (task) =>
      ["active", "ready"].includes(task.stage) &&
      task.nextAction &&
      !task.needsDecision,
  );
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
