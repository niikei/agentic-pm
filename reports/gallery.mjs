import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReport } from "./model.mjs";
import { escapeHtml, renderHtml } from "./writers/html.mjs";
import { writerFor } from "./writers/index.mjs";

const styles = readFileSync(new URL("./gallery.css", import.meta.url), "utf8");

export function writeGallery(entries, snapshot) {
  const folder = mkdtempSync(join(tmpdir(), "agentic-pm-reports-"));
  mkdirSync(join(folder, "definitions"));
  mkdirSync(join(folder, "documents"));
  mkdirSync(join(folder, "schemas"));
  copyFileSync(
    new URL("./schemas/report-v1.json", import.meta.url),
    join(folder, "schemas/report-v1.json"),
  );
  const cards = entries.map(({ id, definition }) => {
    const report = buildReport(definition, snapshot);
    const writer = writerFor(definition.format);
    const filename = encodeURIComponent(id);
    writeFileSync(join(folder, "documents", `${id}.html`), renderHtml(report));
    let documentLink = "";
    if (definition.format !== "html") {
      writeFileSync(
        join(folder, "documents", `${id}.${writer.extension}`),
        writer.render(report),
      );
      documentLink = `<a href="./documents/${filename}.${writer.extension}">${writer.label} file</a>`;
    }
    copyFileSync(
      new URL(`./definitions/${filename}.json`, import.meta.url),
      join(folder, "definitions", `${id}.json`),
    );
    return `<article lang="${escapeHtml(definition.language)}">
<p class="meta" lang="en">${escapeHtml(definition.language.toUpperCase())} · ${escapeHtml(definition.format.toUpperCase())}</p>
<h2>${escapeHtml(definition.title)}</h2><p>${escapeHtml(definition.question)}</p><p class="reader">${escapeHtml(definition.reader)}</p>
<nav lang="en" aria-label="Files for ${escapeHtml(id)}"><a href="./documents/${filename}.html">Open HTML view</a>${documentLink}<a href="./definitions/${filename}.json">Definition</a></nav></article>`;
  });
  const page = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'">
<title>Report catalog · agentic-pm</title><style>${styles}</style><main><header><h1>Report catalog</h1><p>${escapeHtml(snapshot.project)} · <time>${escapeHtml(snapshot.asOf)}</time></p></header><div class="grid">${cards.join("\n")}</div></main></html>\n`;
  const index = join(folder, "index.html");
  writeFileSync(index, page);
  return index;
}
