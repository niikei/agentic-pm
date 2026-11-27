import assert from "node:assert/strict";
import test from "node:test";
import {
  readJson,
  sampleFile,
  selectDefinition,
  validateSnapshot,
} from "../reports/catalog.mjs";
import { buildReport } from "../reports/model.mjs";
import { renderHtml } from "../reports/writers/html.mjs";
import { renderMarkdown } from "../reports/writers/markdown.mjs";

const definition = selectDefinition("manager-outcomes-ja");

test("the standalone management edition reports attributed observations without repository activity or external links", () => {
  const input = validateSnapshot(readJson(sampleFile));
  const model = buildReport(definition, input);
  for (const render of [renderHtml, renderMarkdown]) {
    const output = render(model);
    for (const term of [
      "目標3拠点のうち2拠点",
      "今週、北港と南港",
      "短縮幅は未確認",
      "議事録・議題1",
      "2026/11/27",
    ]) {
      assert.ok(output.includes(term), term);
    }
    assert.doesNotMatch(
      output,
      /W-12|C-17|https?:\/\/|GitHub|マージ|変更リクエスト/,
    );
  }
  assert.doesNotMatch(renderHtml(model), /class="metrics"|<script/);
});

test("absent and empty goal observations stay unknown even with merged work", () => {
  const input = readJson(sampleFile);
  assert.ok(input.deliveries.length);
  delete input.outcomes;
  for (const snapshot of [input, { ...input, outcomes: [] }]) {
    const model = buildReport(definition, validateSnapshot(snapshot));
    for (const render of [renderHtml, renderMarkdown]) {
      assert.match(render(model), /成果と進捗は未確認/);
      assert.doesNotMatch(render(model).split("</head>").pop(), /0%|0件/);
    }
  }
});

test("source text is escaped, progress alone is supported, and observations respect identity and cutoff", () => {
  const input = readJson(sampleFile);
  const goal = input.outcomes[0];
  delete goal.result;
  delete input.outcomes[1].progress;
  goal.progress = "<b>2/3</b>";
  const model = buildReport(
    { ...definition, language: "en" },
    validateSnapshot(input),
  );
  assert.match(renderHtml(model), /&lt;b&gt;2\/3/);
  assert.match(renderMarkdown(model), /&#60;b&#62;2\/3/);
  assert.match(renderHtml(model), /result has yet to be confirmed/);
  assert.match(
    renderHtml(model),
    /Progress toward this goal has yet to be confirmed/,
  );
  assert.throws(
    () => validateSnapshot({ ...input, outcomes: [goal, goal] }),
    /Duplicate goal/,
  );
  for (const patch of [
    { observedAt: "2030-01-01T00:00:00Z" },
    { source: " " },
  ]) {
    assert.throws(() =>
      validateSnapshot({ ...input, outcomes: [{ ...goal, ...patch }] }),
    );
  }
});
