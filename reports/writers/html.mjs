import { readFileSync } from "node:fs";
import { deliveryChart } from "./delivery-chart.mjs";
import { labels, sourceUrl, utcTime } from "./shared.mjs";

const styles = readFileSync(new URL("report.css", import.meta.url), "utf8");
const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => entities[character]);
}

function rowMarkup(row) {
  const url = sourceUrl(row.url);
  const title = escapeHtml(row.title);
  return `<tr>
<th scope="row"><span class="item-id">${escapeHtml(row.id)}</span>${url ? `<a href="${escapeHtml(url)}">${title}</a>` : title}</th>
${row.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("\n")}
</tr>`;
}

function detail(section, language) {
  const id = escapeHtml(section.kind);
  const content = section.rows.length
    ? `<div class="table-scroll" role="region" aria-labelledby="${id}" tabindex="0">
<table aria-labelledby="${id}">
<thead><tr>${section.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr></thead>
<tbody>${section.rows.map(rowMarkup).join("\n")}</tbody>
</table>
</div>`
    : `<p class="empty">${escapeHtml(section.empty)}</p>`;
  return `<section class="detail ${id}" aria-labelledby="${id}">
<h2 id="${id}" tabindex="-1">${escapeHtml(section.title)}</h2>
<p class="description">${escapeHtml(section.description)}</p>
${section.kind === "deliveries" ? deliveryChart(section.trend, language) : ""}
${content}
</section>`;
}

export function renderHtml(model) {
  const copy = labels[model.language];
  const cards = model.sections.map(
    ({
      kind,
      title,
      count,
    }) => `<li class="${escapeHtml(kind)}"><a href="#${escapeHtml(kind)}">
<span class="metric-label">${escapeHtml(title)}</span>
<span class="metric-value">${count ?? `<span class="unknown">${copy.unknown}</span>`}</span><span class="arrow" aria-hidden="true">↓</span>
</a></li>`,
  );
  return `<!doctype html>
<html lang="${escapeHtml(model.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(model.title)} · ${escapeHtml(model.project)}</title>
<style>${styles}</style>
</head>
<body>
<a class="skip" href="#details">${copy.skip}</a>
<main>
<header>
<dl class="masthead">
<div><dt>${copy.project}</dt><dd>${escapeHtml(model.project)}</dd></div>
<div><dt>${copy.asOf}</dt><dd><time datetime="${escapeHtml(model.asOf)}">${escapeHtml(utcTime(model.asOf))}</time></dd></div>
</dl>
<div class="intro">
<p class="reader">${copy.reader}<span>${escapeHtml(model.reader)}</span></p>
<h1>${escapeHtml(model.title)}</h1>
<p class="question">${escapeHtml(model.question)}</p>
</div>
</header>
<nav aria-labelledby="overview">
<h2 class="overview-title" id="overview">${copy.overview}</h2>
<ul class="metrics">${cards.join("\n")}</ul>
</nav>
<div id="details" tabindex="-1">${model.sections.map((section) => detail(section, model.language)).join("\n")}</div>
</main>
</body>
</html>
`;
}
