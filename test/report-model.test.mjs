import assert from "node:assert/strict";
import test from "node:test";
import { buildReport } from "../reports/model.mjs";

const definition = {
  title: "Decision brief",
  reader: "Delivery lead",
  language: "en",
  question: "Which decisions need attention?",
  format: "html",
  sections: ["decisions", "changes", "work", "deliveries"],
  periodDays: 2,
};

const snapshot = {
  project: "Library opening",
  asOf: "2026-11-20T15:00:00Z",
  coverageStart: "2026-11-01T00:00:00Z",
  items: [],
  deliveries: [],
};

function item(id, overrides = {}) {
  return {
    id,
    title: "Shared title",
    url: `https://example.org/records/${id}`,
    kind: "work",
    updatedAt: "2026-11-20T12:00:00Z",
    needsDecision: false,
    draft: false,
    decisionSince: null,
    owners: [],
    ...overrides,
  };
}

test("preserves the selected section order, source identities and distinct queues", () => {
  const decision = item("W-1", {
    needsDecision: true,
    decisionSince: "2026-11-17T12:00:00Z",
    owners: ["Facilities", "Operations"],
  });
  const items = [
    item("C-2", { kind: "change" }),
    item("W-2"),
    item("C-1", { kind: "change", draft: true }),
    decision,
    item("W-3", { needsDecision: true }),
  ];
  const { sections, ...metadata } = buildReport(
    { ...definition, sections: ["work", "decisions", "changes"] },
    { ...snapshot, items },
  );
  assert.deepEqual(metadata, {
    title: definition.title,
    reader: definition.reader,
    language: "en",
    question: definition.question,
    project: snapshot.project,
    asOf: snapshot.asOf,
  });
  assert.deepEqual(
    sections.map(({ kind }) => kind),
    ["work", "decisions", "changes"],
  );
  const [work, decisions, changes] = sections;
  assert.deepEqual(
    work.rows.map(({ id }) => id),
    ["W-1", "W-2", "W-3"],
  );
  assert.deepEqual(
    decisions.rows.map(({ id }) => id),
    ["W-1", "W-3"],
  );
  assert.equal(decisions.rows[0].url, decision.url);
  assert.equal(decisions.rows[0].title, decision.title);
  assert.match(decisions.rows[0].cells[0], /17 Nov 2026.*UTC/);
  assert.equal(decisions.rows[0].cells[1], "Facilities, Operations");
  assert.deepEqual(decisions.rows[1].cells, [
    "Start time unknown",
    "Unassigned",
  ]);
  assert.deepEqual(
    changes.rows.map(({ id, cells }) => [id, cells[0]]),
    [
      ["C-1", "Yes"],
      ["C-2", "No"],
    ],
  );
  for (const section of sections) {
    assert.equal(section.count, section.rows.length);
    for (const row of section.rows) {
      assert.equal(section.columns.length, 1 + row.cells.length);
    }
  }
});

test("orders pending decisions by flag time and other open work by last update", () => {
  const a = item("A", {
    needsDecision: true,
    decisionSince: "2026-11-19T00:00:00Z",
  });
  const b = item("B", {
    needsDecision: true,
    decisionSince: "2026-11-18T00:00:00Z",
    updatedAt: "2026-11-19T00:00:00Z",
  });
  const [decisions, work] = buildReport(
    { ...definition, sections: ["decisions", "work"] },
    { ...snapshot, items: [a, b] },
  ).sections;
  assert.deepEqual(
    decisions.rows.map(({ id }) => id),
    ["B", "A"],
  );
  assert.deepEqual(
    work.rows.map(({ id }) => id),
    ["A", "B"],
  );
});

function delivered(id, at) {
  return {
    id,
    title: "Updated reading list",
    url: `https://example.org/changes/${id}`,
    at,
  };
}

function deliverySection(overrides, language = "en") {
  return buildReport(
    { ...definition, sections: ["deliveries"], language },
    { ...snapshot, ...overrides },
  ).sections[0];
}

test("counts individual merges in the inclusive UTC window through capture time", () => {
  const deliveries = [
    delivered("too-old", "2026-11-18T14:59:59Z"),
    delivered("start", "2026-11-18T15:00:00Z"),
    delivered("end", snapshot.asOf),
    delivered("too-late", "2026-11-20T15:00:01Z"),
  ];
  const full = deliverySection({ deliveries });
  assert.deepEqual(
    full.rows.map(({ id }) => id),
    ["end", "start"],
  );
  assert.match(full.description, /2 days.*2 merged changes/);
  const short = deliverySection({
    deliveries,
    coverageStart: "2026-11-19T00:00:00Z",
  });
  assert.deepEqual(
    short.rows.map(({ id }) => id),
    ["end"],
  );
  assert.match(
    short.description,
    /covers only.*19 Nov 2026.*1 merged change\./,
  );
});

test("distinguishes an observed empty interval from a capture with no interval", () => {
  const observed = deliverySection({});
  const absent = deliverySection({ coverageStart: snapshot.asOf });
  assert.equal(observed.count, 0);
  assert.equal(absent.count, null);
  assert.match(observed.description, /0 merged changes/);
  assert.match(observed.empty, /No changes were merged/);
  assert.match(absent.empty, /no delivery observation interval/);
  assert.doesNotMatch(absent.description, /0 merged changes/);
});

test("partitions observed merges once at request, coverage, bin and capture boundaries", () => {
  const start = "2026-11-18T15:00:00Z";
  const inside = "2026-11-18T22:00:00Z";
  const boundary = "2026-11-19T15:00:00Z";
  const deliveries = [start, inside, boundary, snapshot.asOf].map((at, index) =>
    delivered(String(index), at),
  );
  for (const [coverageStart, states, counts] of [
    [start, ["full", "full"], [2, 2]],
    [inside, ["partial", "full"], [1, 2]],
    [boundary, ["none", "full"], [null, 2]],
    [snapshot.asOf, ["none", "none"], [null, null]],
  ]) {
    const { trend, count } = deliverySection({ deliveries, coverageStart });
    assert.deepEqual(
      trend.map((bin) => bin.observed),
      states,
    );
    assert.deepEqual(
      trend.map((bin) => bin.count),
      counts,
    );
    assert.equal(Date.parse(trend[0].start), Date.parse(start));
    assert.equal(Date.parse(trend[1].start), Date.parse(boundary));
    assert.equal(trend[0].end, trend[1].start);
    assert.equal(Date.parse(trend[1].end), Date.parse(snapshot.asOf));
    const observedCounts = trend
      .map((bin) => bin.count)
      .filter((value) => value !== null);
    assert.equal(
      observedCounts.length ? observedCounts.reduce((a, b) => a + b) : null,
      count,
    );
  }
});

test("longer ranges fit at most seven equal UTC intervals with explicit observed zeros", () => {
  for (const periodDays of [8, 14, 30, 90]) {
    const [{ trend }] = buildReport(
      { ...definition, periodDays, sections: ["deliveries"] },
      { ...snapshot, coverageStart: "2026-01-01T00:00:00Z" },
    ).sections;
    assert.ok(trend.length > 1 && trend.length <= 7);
    const width = (periodDays * 86_400_000) / trend.length;
    let boundary = Date.parse(snapshot.asOf) - width * trend.length;
    for (const bin of trend) {
      assert.equal(Date.parse(bin.start), boundary);
      boundary += width;
      assert.equal(Date.parse(bin.end), boundary);
      assert.equal(bin.observed, "full");
      assert.equal(bin.count, 0);
    }
    assert.equal(boundary, Date.parse(snapshot.asOf));
  }
});

test("localizes section headings, empty states, labels and times in Japanese", () => {
  const { sections } = buildReport(
    { ...definition, language: "ja" },
    {
      ...snapshot,
      items: [
        item("W-1", {
          needsDecision: true,
          decisionSince: "2026-11-19T03:00:00Z",
        }),
      ],
    },
  );
  const [decisions, changes, work, deliveries] = sections;
  assert.equal(decisions.title, "判断待ちの作業");
  assert.match(decisions.rows[0].cells[0], /2026.*11.*19.*3:00:00.*UTC/);
  assert.equal(changes.empty, "この記録に未完了の変更リクエストはありません。");
  assert.equal(work.rows[0].cells[0], "はい");
  assert.match(deliveries.description, /0 件/);
});
