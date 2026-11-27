import assert from "node:assert/strict";
import test from "node:test";
import { renderHtml } from "../reports/writers/html.mjs";
import { renderMarkdown } from "../reports/writers/markdown.mjs";

const model = {
  title: "Launch & support",
  reader: "Delivery lead",
  language: "en",
  question: "What landed?",
  project: "Pilot <North>",
  asOf: "2026-11-27T01:02:03Z",
  sections: [
    {
      kind: "work",
      title: "Open work",
      description: "Work in this capture.",
      empty: "No open work.",
      columns: ["Item", "Status"],
      count: 2,
      rows: [
        {
          id: "W-12",
          title: 'A | B [draft] <b title="new">',
          url: "https://example.org/p(1)?x=a|b&y=2",
          cells: ["first\n## next"],
        },
        {
          id: "W-13",
          title: "[link](http://example.org) www.example.org",
          url: "data:text/plain,unsafe",
          cells: ["<img src=x>"],
        },
      ],
    },
    {
      kind: "deliveries",
      title: "Merged changes",
      description: "Requested period of seven days.",
      empty: "No observation interval.",
      columns: ["Item", "Merged at"],
      count: null,
      rows: [],
    },
  ],
};

test("HTML renders localized, keyboard-accessible summaries, tables and empty states in report order", () => {
  const report = renderHtml(model);
  assert.match(report, /^<!doctype html>\n<html lang="en">/);
  assert.match(report, /<h1>Launch &amp; support<\/h1>/);
  assert.match(
    report,
    /<time datetime="2026-11-27T01:02:03Z">2026-11-27 01:02:03 UTC<\/time>/,
  );
  assert.match(report, /<nav aria-labelledby="overview">/);
  for (const { kind } of model.sections) {
    assert.ok(report.includes(`href="#${kind}"`));
    assert.ok(report.includes(`<h2 id="${kind}" tabindex="-1">`));
  }
  assert.ok(report.indexOf('id="work"') < report.indexOf('id="deliveries"'));
  assert.match(report, /<span class="metric-value">2<\/span>/);
  assert.match(report, /class="unknown">Unobserved</);
  assert.match(report, /<th scope="col">Status<\/th>/);
  assert.match(report, /<th scope="row"><span class="item-id">W-12</);
  assert.match(report, /<p class="empty">No observation interval\.<\/p>/);
  assert.doesNotMatch(report, /<script|<link[^>]+stylesheet/i);
});

test("HTML quotes untrusted labels, cells and source URLs", () => {
  const report = renderHtml(model);
  assert.ok(report.includes("Pilot &lt;North&gt;"));
  assert.ok(report.includes('href="https://example.org/p(1)?x=a|b&amp;y=2"'));
  assert.ok(report.includes("A | B [draft] &lt;b title=&quot;new&quot;&gt;"));
  assert.ok(report.includes("&lt;img src=x&gt;"));
  assert.doesNotMatch(report, /<img|href="(?:data|http):/);
});

test("Markdown preserves literal input, HTTPS destinations, section counts and source table shape", () => {
  const report = renderMarkdown(model);
  assert.match(report, /^# Launch &#38; support\n/);
  assert.ok(report.includes("## Open work (2)"));
  assert.ok(report.includes("## Merged changes (Unobserved)"));
  assert.ok(report.includes("No observation interval."));
  assert.ok(report.includes("| Item | Status |\n| --- | --- |"));
  assert.ok(report.includes("A &#124; B &#91;draft&#93; &#60;b"));
  assert.ok(report.includes("](<https://example.org/p(1)?x=a%7Cb&amp;y=2>)"));
  assert.ok(report.includes("| first &#35;&#35; next |"));
  assert.ok(report.includes("www&#46;example.org"));
  assert.doesNotMatch(report, /<img|data:text|\]\(http:|^## next/m);
});

test("Japanese profiles localize writer labels, including the empty history summary", () => {
  const japanese = { ...model, language: "ja" };
  for (const render of [renderHtml, renderMarkdown]) {
    const report = render(japanese);
    for (const label of ["対象読者", "基準日時", "観測なし"]) {
      assert.ok(report.includes(label));
    }
    assert.doesNotMatch(report, /Prepared for|Snapshot|Unobserved/);
  }
});

test("delivery chart shows observed zero, uncovered time and partial intervals with accessible UTC ranges", () => {
  const intervals = [
    ["none", null],
    ["partial", 0],
    ["full", 1],
    ["full", 3],
  ].map(([observed, count], index) => ({
    start: `2026-11-${23 + index}T01:02:03Z`,
    end: `2026-11-${24 + index}T01:02:03Z`,
    observed,
    count,
  }));
  const sections = [
    model.sections[0],
    { ...model.sections[1], count: 4, trend: intervals },
  ];
  const report = renderHtml({ ...model, sections });
  assert.equal(report.match(/<figure /g)?.length, 1);
  assert.ok(
    report.includes("<figcaption>Merged changes by interval</figcaption>"),
  );
  assert.ok(report.includes("Interval start (UTC)"));
  assert.ok(
    report.includes(
      "2026-11-23 01:02:03 UTC – 2026-11-24 01:02:03 UTC · Unobserved",
    ),
  );
  assert.ok(report.includes("Partial coverage · Merged changes 0"));
  assert.ok(report.includes("Full coverage · Merged changes 3"));
  assert.match(report, /class="bar-value">—<\/span>\s*<span class="bar none"/);
  assert.match(
    report,
    /class="bar-value">0<\/span>\s*<span class="bar partial"/,
  );
  assert.match(report, /class="bar full" style="--size: 33\.3\d*%"/);
  assert.match(report, /class="bar full" style="--size: 100%"/);
  const japanese = renderHtml({ ...model, sections, language: "ja" });
  for (const label of [
    "期間別のマージ件数",
    "各期間の開始日時（UTC）",
    "観測なし",
    "一部を観測 · マージ件数 0",
    "全期間を観測 · マージ件数 3",
  ]) {
    assert.ok(japanese.includes(label));
  }
  assert.doesNotMatch(
    japanese,
    /Full coverage|Partial coverage|Interval start/,
  );
});
