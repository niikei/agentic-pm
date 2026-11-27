import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { escapeHtml as h } from "../writers/html.mjs";
import { stages } from "./model.mjs";

const asset = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const styles = asset("desk.css");
const script = asset("controls.js");
const digest = createHash("sha256").update(script).digest("base64");
const week = new Intl.DateTimeFormat("ja-JP", {
  weekday: "short",
  timeZone: "UTC",
});
const md = (date) => date.slice(5).replace("-", "/");
const jump = (filter, label) =>
  `<a href="#tasks" data-filter="${h(filter)}">${label}</a>`;
const due = (task) =>
  task.offset === null
    ? "期限未記録"
    : task.offset < 0
      ? `${-task.offset}日超過`
      : task.offset === 0
        ? "本日期限"
        : `${md(task.dueDate)} 期限`;

function focusCard(desk) {
  const task = desk.next;
  const pending = desk.questions[0];
  if (!task && pending)
    return `<section class="focus"><h2>先に確認する</h2><div class="focus-meta">${h(pending.id)} ／ 要確認</div><h3>${h(pending.question ?? pending.title)}</h3><p>確認待ちの記録を開き、判断に必要な情報を確認する。</p><a class="source" href="${h(pending.url)}">確認事項を開く ↗</a></section>`;
  return `<section class="focus"><h2><span class="target" aria-hidden="true">◎</span> 次に取りかかる</h2>${
    task
      ? `<div class="focus-meta">${h(task.id)} <i>／</i> ${stages[task.stage]} <i>／</i> ${due(task)}</div><h3>${h(task.title)}</h3><p>${h(task.nextAction)}</p><a class="source" href="${h(task.url)}">元の記録を開く <span aria-hidden="true">↗</span></a>`
      : `<h3>次の作業は未確定</h3><p>着手できる状態と次の行動がそろった作業はありません。</p><a class="source" href="#tasks">一覧で記録を確認 ↓</a>`
  }</section>`;
}

function deadlines(desk) {
  if (desk.datesUnknown) {
    return `<section id="deadlines" class="panel deadline"><div class="section-head"><h2>期限の分布</h2></div><div class="date-gap"><strong>期限の記録待ち</strong><p>全${desk.tasks.length}件の期限が未記録です。</p></div><div class="chart-footer">${jump("undated", "期限未記録のタスクを見る ↓")}</div></section>`;
  }
  const max = Math.max(1, ...desk.days.map((d) => d.count));
  const bars = desk.days.map(
    ({ date, count }, index) =>
      `<li><a href="#tasks" data-filter="day:${date}" aria-label="${md(date)}期限の${count}件"><span class="plot"><b>${count}</b><i style="--height:${(count / max) * 76}%"></i></span><span class="tick">${md(date)}<small>${index === 0 ? "本日" : week.format(Date.parse(date))}</small></span></a></li>`,
  );
  return `<section id="deadlines" class="panel deadline"><div class="section-head"><h2>期限の分布</h2><span>記録済みの期限 · 7日間</span></div><ul class="bars">${bars.join("")}</ul><div class="chart-footer">${jump("overdue", `期限超過 <b>${desk.overdue}</b>`)}${jump("later", `期間後 <b>${desk.later}</b>`)}${jump("undated", `期限未記録 <b>${desk.undated}</b>`)}</div></section>`;
}

function taskRow(task) {
  const tone =
    task.offset === null
      ? ""
      : task.offset < 0
        ? "late"
        : task.offset === 0
          ? "today"
          : "";
  return `<tr data-id="${h(task.id)}" data-stage="${task.stage}" data-date="${h(task.dueDate ?? "")}" data-offset="${task.offset ?? ""}" data-question="${task.needsDecision}">
<td><span class="key">${h(task.id)}</span><details><summary>${h(task.title)}</summary><div class="notes"><p>${h(task.nextAction ?? "次の行動は未記録です。")}</p>${task.question ? `<p>確認事項 · ${h(task.question)}</p>` : ""}<p>担当 · ${h(task.owners.join("、") || "未割り当て")}</p><a href="${h(task.url)}">元の記録を開く ↗</a></div></details></td><td><span class="status ${task.stage}">${stages[task.stage]}</span></td><td class="due ${tone}">${task.dueDate ? md(task.dueDate) : "未記録"}${tone ? `<small>${due(task)}</small>` : ""}</td></tr>`;
}

function register(desk) {
  const choices = [
    ["all", "すべて"],
    ["overdue", "期限超過"],
    ["today", "本日期限"],
    ["question", "要確認"],
    ["later", "7日間より後"],
    ["undated", "期限未記録"],
    ...Object.entries(stages),
    ...desk.days.map((d) => [`day:${d.date}`, `${md(d.date)} 期限`]),
  ];
  return `<section class="panel register" id="tasks"><div class="section-head"><h2>タスク一覧</h2><span id="matches" aria-live="polite">${desk.tasks.length}件</span></div>
<div class="toolbar" hidden><input type="search" aria-label="タスクを検索" placeholder="名前・番号・担当で検索"><select aria-label="タスクを絞り込む">${choices.map(([value, label]) => `<option value="${h(value)}">${h(label)}</option>`).join("")}</select></div>
<table><thead><tr><th>タスク</th><th>状態</th><th>期限</th></tr></thead><tbody>${desk.tasks.map(taskRow).join("")}</tbody></table><p class="empty" id="empty" ${desk.tasks.length ? "hidden" : ""}>該当するタスクはありません。</p></section>`;
}

function questions(desk) {
  const max = Math.max(1, ...desk.questions.map((task) => task.waitHours ?? 0));
  const links = desk.questions.map((task) => {
    const waiting =
      task.waitHours === null
        ? "開始時刻は未記録"
        : task.waitHours < 1
          ? "1時間未満"
          : `${task.waitHours}時間`;
    return `<li><a href="${h(task.url)}"><span class="key">${h(task.id)} · ${due(task)} · 担当 ${h(task.owners.join("、") || "未割り当て")}</span><strong>${h(task.question ?? task.title)}</strong><span aria-hidden="true">↗</span><span class="age"><i aria-hidden="true"><b style="width:${((task.waitHours ?? 0) / max) * 100}%"></b></i>${waiting}</span></a></li>`;
  });
  return `<section id="questions" class="panel questions"><div class="section-head"><h2>確認事項</h2><span>待ち時間順 · ${links.length}件</span></div>${links.length ? `<ul>${links.join("")}</ul>` : '<p class="empty">確認待ちの印が付いた項目はありません。</p>'}</section>`;
}

function distribution(desk) {
  return `<section class="panel mix"><div class="section-head"><h2>作業状態の内訳</h2><span>全${desk.tasks.length}件</span></div>
<ul class="legend">${Object.entries(stages)
    .map(([stage, label]) => {
      const count = desk.counts[stage];
      const share = desk.tasks.length ? (100 * count) / desk.tasks.length : 0;
      return `<li>${jump(stage, `<span>${label}</span><span class="track" aria-hidden="true"><i class="${stage}" style="width:${share}%"></i></span><b>${count}</b>`)}</li>`;
    })
    .join("")}</ul></section>`;
}

export function renderDesk(desk) {
  const font = readFileSync(
    new URL("fonts/PretendardJPVariable.woff2", import.meta.url),
  ).toString("base64");
  const license = asset("fonts/LICENSE.txt");
  const stats = [
    ["all", "未完了", desk.tasks.length],
    ["overdue", "期限超過", desk.datesUnknown ? null : desk.overdue],
    ["today", "本日期限", desk.datesUnknown ? null : desk.days[0].count],
    ["question", "要確認", desk.questions.length],
  ];
  const asOf = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(desk.asOf));
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="text-scale" content="scale"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; script-src 'sha256-${digest}'; base-uri 'none'; form-action 'none'"><title>作業デスク · ${h(desk.project)}</title><style>@font-face{font-family:"Pretendard JP Variable";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-display:swap}
${styles}</style></head>
<body><a class="skip" href="#overview">本文へ</a><div class="shell"><aside class="rail"><div class="rail-head"><div class="brand"><i aria-hidden="true"></i>作業デスク</div><button type="button" class="nav-toggle" hidden aria-controls="desk-nav" aria-expanded="true" aria-label="ナビを閉じる" title="ナビを閉じる"><span aria-hidden="true">‹</span></button></div><nav id="desk-nav" aria-label="ページ内ナビゲーション"><a href="#overview"><span>▦</span>概要</a><a href="#tasks" data-filter="all"><span>☰</span>タスク一覧</a><a href="#deadlines"><span>▥</span>期限</a><a href="#questions"><span>◇</span>確認事項</a></nav></aside>
<main id="overview"><header><div><p class="project">${h(desk.project)} <span class="scope">／ ${h(desk.owner || "全担当")}</span></p><h1>作業の見通し</h1></div><div class="stamp">基準日時 <time datetime="${h(desk.asOf)}">${h(asOf)} JST</time></div></header>
<div class="top">${focusCard(desk)}${deadlines(desk)}</div>
<div class="stats">${stats
    .map(([filter, label, count]) => {
      const contents = `<span>${label}</span><strong>${count ?? "—"}</strong><small>${count === null ? "不明" : "件"}</small>`;
      return filter === "question"
        ? `<a href="#questions">${contents}</a>`
        : jump(count === null ? "undated" : filter, contents);
    })
    .join("")}</div>
<div class="lower">${register(desk)}<div class="side">${questions(desk)}${distribution(desk)}</div></div></main></div>
<template id="font-license"><pre>${h(license)}</pre></template><script>${script}</script></body></html>\n`;
}
