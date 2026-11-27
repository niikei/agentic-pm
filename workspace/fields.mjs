export const labels = {
  meeting: "会議の時間",
  forecast: "仮の見通し",
  status: "作業状態",
  nextAction: "次の行動",
  question: "要確認",
  dueDate: "確定期限",
  followUp: "次回確認日",
  estimate: "見積もりと前提",
  hypothesis: "仮説",
  managerUpdate: "上司向けの記述",
};

const localTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function meetingTime(meeting) {
  const start = new Date(meeting.start);
  const range = meeting.end
    ? localTime.formatRange(start, new Date(meeting.end))
    : localTime.format(start);
  return `${range} JST`;
}

export function forecastLabel(forecast) {
  const dates =
    forecast.through && forecast.through !== forecast.from
      ? `${forecast.from}〜${forecast.through}`
      : forecast.from;
  return `${forecast.origin === "agent" ? "AIの試算" : "資料上の案"} · ${dates}（${forecast.basis}）`;
}
