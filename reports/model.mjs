const day = 86_400_000;

const labels = {
  en: {
    decisions: {
      title: "Decisions needed",
      description:
        "The oldest recorded requests appear first. Open each item for the question and the person authorized to decide.",
      columns: ["Work item", "Flagged since", "Assignees"],
      empty: "No open work items are marked as needing a decision.",
    },
    changes: {
      title: "Open change requests",
      description:
        "Open each change to see its review discussion and check results.",
      columns: ["Change request", "Draft?", "Last updated"],
      empty: "There are no open change requests in this capture.",
    },
    work: {
      title: "Open work",
      description: "All open work items, most recently updated first.",
      columns: [
        "Work item",
        "Decision requested?",
        "Assignees",
        "Last updated",
      ],
      empty: "There are no open work items in this capture.",
    },
    deliveries: {
      title: "Merged changes",
      columns: ["Change request", "Merged at"],
      empty: "No changes were merged in the observed interval.",
    },
    period: (days, start, end) =>
      `Requested period (${days} ${days === 1 ? "day" : "days"}) from ${start} through ${end}.`,
    partial: (start) =>
      `The capture covers only the interval from ${start} onward.`,
    merges: (count) =>
      `The observed interval includes ${count} merged ${count === 1 ? "change" : "changes"}.`,
    noHistory: "This capture supplies no delivery observation interval.",
    yes: "Yes",
    no: "No",
    unknownTime: "Start time unknown",
    unassigned: "Unassigned",
  },
  ja: {
    decisions: {
      title: "判断待ちの作業",
      description:
        "判断待ちになった日時が古い順に表示します。判断が必要な内容と決裁者は各作業の記録で確認してください。",
      columns: ["作業", "判断待ちの開始日時", "作業担当者"],
      empty: "判断待ちの印が付いた未完了の作業はありません。",
    },
    changes: {
      title: "未完了の変更リクエスト",
      description: "レビューの内容とチェック結果は各リクエストで確認できます。",
      columns: ["変更リクエスト", "ドラフト", "最終更新日時"],
      empty: "この記録に未完了の変更リクエストはありません。",
    },
    work: {
      title: "未完了の作業",
      description: "未完了の作業を最終更新日時の新しい順に表示します。",
      columns: ["作業", "判断待ち", "作業担当者", "最終更新日時"],
      empty: "この記録に未完了の作業はありません。",
    },
    deliveries: {
      title: "マージ済みの変更",
      columns: ["変更リクエスト", "マージ日時"],
      empty: "観測できた期間にマージされた変更はありません。",
    },
    period: (days, start, end) =>
      `集計対象は ${start} から ${end} までの ${days} 日間です。`,
    partial: (start) => `記録があるのは ${start} 以降です。`,
    merges: (count) => `観測できた期間のマージ件数は ${count} 件です。`,
    noHistory: "この記録にはマージ履歴の観測期間がありません。",
    yes: "はい",
    no: "いいえ",
    unknownTime: "開始日時不明",
    unassigned: "未割り当て",
  },
};

function row({ id, title, url }, ...cells) {
  return { id, title, url, cells };
}

function byId(a, b) {
  return a.id.localeCompare(b.id, "en");
}

function newestFirst(field) {
  return (a, b) => Date.parse(b[field]) - Date.parse(a[field]) || byId(a, b);
}

function oldestRequestFirst(a, b) {
  const since = (item) =>
    item.decisionSince ? Date.parse(item.decisionSince) : Infinity;
  return since(a) - since(b) || byId(a, b);
}

function deliveryIntervals(days, requested, observedStart) {
  let bins = Math.min(days, 7);
  // Whole-hour widths keep every boundary representable as an exact UTC instant.
  while ((days * 24) % bins !== 0) bins--;
  const width = (days * day) / bins;
  return Array.from({ length: bins }, (_, index) => {
    const start = requested + index * width;
    const end = start + width;
    let observed = "full";
    if (observedStart >= end) observed = "none";
    else if (observedStart > start) observed = "partial";
    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      observed,
      count: observed === "none" ? null : 0,
    };
  });
}

function mergedChanges(definition, snapshot, text, date) {
  const end = Date.parse(snapshot.asOf);
  const requested = end - definition.periodDays * day;
  const start = Math.max(requested, Date.parse(snapshot.coverageStart));
  const period = text.period(definition.periodDays, date(requested), date(end));
  const trend = deliveryIntervals(definition.periodDays, requested, start);
  const section = { kind: "deliveries", ...text.deliveries, trend };
  if (start >= end) {
    return {
      ...section,
      description: period,
      empty: text.noHistory,
      count: null,
      rows: [],
    };
  }

  const width = (end - requested) / trend.length;
  const observed = [];
  for (const item of snapshot.deliveries) {
    const at = Date.parse(item.at);
    if (at < start || at > end) continue;
    // The final interval also includes the capture instant.
    const index = Math.min(
      Math.floor((at - requested) / width),
      trend.length - 1,
    );
    trend[index].count++;
    observed.push(item);
  }
  const rows = observed
    .sort(newestFirst("at"))
    .map((item) => row(item, date(item.at)));

  const description = [period];
  if (start > requested) description.push(text.partial(date(start)));
  description.push(text.merges(rows.length));
  return {
    ...section,
    description: description.join(" "),
    count: rows.length,
    rows,
  };
}

export function buildReport(definition, snapshot) {
  const { title, reader, language, question } = definition;
  const { project, asOf, items } = snapshot;
  const text = labels[language];
  const clock = new Intl.DateTimeFormat(language === "ja" ? "ja-JP" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "UTC",
  });
  const date = (value) => clock.format(new Date(value));
  const owners = (item) => item.owners.join(", ") || text.unassigned;
  const yesNo = (value) => (value ? text.yes : text.no);

  const sections = definition.sections.map((kind) => {
    if (kind === "deliveries")
      return mergedChanges(definition, snapshot, text, date);

    let rows;
    if (kind === "decisions") {
      rows = items
        .filter((item) => item.kind === "work" && item.needsDecision)
        .sort(oldestRequestFirst)
        .map((item) =>
          row(
            item,
            item.decisionSince ? date(item.decisionSince) : text.unknownTime,
            owners(item),
          ),
        );
    } else if (kind === "changes") {
      rows = items
        .filter((item) => item.kind === "change")
        .sort(newestFirst("updatedAt"))
        .map((item) => row(item, yesNo(item.draft), date(item.updatedAt)));
    } else {
      rows = items
        .filter((item) => item.kind === "work")
        .sort(newestFirst("updatedAt"))
        .map((item) =>
          row(
            item,
            yesNo(item.needsDecision),
            owners(item),
            date(item.updatedAt),
          ),
        );
    }
    return { kind, ...text[kind], count: rows.length, rows };
  });

  return { title, reader, language, question, project, asOf, sections };
}
