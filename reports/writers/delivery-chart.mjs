import { utcTime } from "./shared.mjs";

const labels = {
  en: {
    title: "Merged changes by interval",
    axis: "Interval start (UTC)",
    full: "Full coverage",
    partial: "Partial coverage",
    none: "Unobserved",
    count: "Merged changes",
  },
  ja: {
    title: "期間別のマージ件数",
    axis: "各期間の開始日時（UTC）",
    full: "全期間を観測",
    partial: "一部を観測",
    none: "観測なし",
    count: "マージ件数",
  },
};

export function deliveryChart(bins, language) {
  if (!bins?.length) return "";
  const copy = labels[language];
  const locale = language === "ja" ? "ja-JP" : "en-GB";
  const day = new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
  const clock = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
  const maximum = Math.max(1, ...bins.map((bin) => bin.count ?? 0));
  const bars = bins.map(({ start, end, observed, count }) => {
    const date = new Date(start);
    const summary = [
      `${utcTime(start)} – ${utcTime(end)}`,
      copy[observed],
      count === null ? null : `${copy.count} ${count}`,
    ]
      .filter(Boolean)
      .join(" · ");
    const size = (100 * (count ?? 0)) / maximum;
    return `<li title="${summary}">
<span class="sr-only">${summary}</span>
<div class="column" aria-hidden="true">
<span class="bar-value">${count ?? "—"}</span>
<span class="bar ${observed}" style="--size: ${size}%"></span>
</div>
<div class="tick" aria-hidden="true">${day.format(date)}<small>${clock.format(date)}</small></div>
</li>`;
  });
  const legend = ["full", "partial", "none"]
    .filter((status) => bins.some((bin) => bin.observed === status))
    .map(
      (status) =>
        `<span><i aria-hidden="true" class="${status}"></i>${copy[status]}</span>`,
    );
  return `<figure class="trend">
<figcaption>${copy.title}</figcaption>
<p class="legend">${legend.join("")}</p>
<ol class="bins" style="--bins: ${bins.length}">${bars.join("\n")}</ol>
<p class="axis">${copy.axis}</p>
</figure>`;
}
