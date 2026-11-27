export const labels = {
  en: {
    project: "Project",
    reader: "Prepared for",
    asOf: "Snapshot",
    overview: "In this report",
    unknown: "Unobserved",
    skip: "Skip to report details",
  },
  ja: {
    project: "プロジェクト",
    reader: "対象読者",
    asOf: "基準日時",
    overview: "レポートの概要",
    unknown: "観測なし",
    skip: "詳細へ移動",
  },
};

export function utcTime(asOf) {
  return new Date(asOf)
    .toISOString()
    .replace("T", " ")
    .replace(/(?:\.000)?Z$/, " UTC");
}

export function sourceUrl(value) {
  if (
    typeof value !== "string" ||
    !/^https:\/\//i.test(value) ||
    !URL.canParse(value)
  )
    return null;
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password
    ? url.href
    : null;
}
