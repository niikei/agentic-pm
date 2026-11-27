import { labels, sourceUrl, utcTime } from "./shared.mjs";

// Preserve a single inline value in GFM headings, paragraphs, tables and links.
function text(value) {
  return String(value)
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[&<>\\|`*_~[\]!#@]/g, (char) => `&#${char.codePointAt(0)};`)
    .replace(/:(?=\/\/)/g, "&#58;")
    .replace(/\bwww\./gi, (prefix) => `${prefix.slice(0, -1)}&#46;`)
    .replace(/^([+=-])|^(\d+)([.)])/, (_, bullet, number, stop) =>
      bullet
        ? `&#${bullet.codePointAt(0)};`
        : `${number}&#${stop.codePointAt(0)};`,
    );
}

export { text as markdownText };

function sourceItem({ id, title, url }) {
  const label = [text(id), text(title)].filter(Boolean).join(" ");
  const source = sourceUrl(url);
  if (!source) return label;
  const destination = source
    .replace(/[|\\`]/g, (char) => encodeURIComponent(char))
    .replaceAll("&", "&amp;");
  return `[${label}](<${destination}>)`;
}

function tableRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

export function renderMarkdown(model) {
  const copy = labels[model.language];
  const lines = [
    `# ${text(model.title)}`,
    "",
    `**${copy.project}** · ${text(model.project)}  `,
    `**${copy.reader}** · ${text(model.reader)}  `,
    `**${copy.asOf}** · ${utcTime(model.asOf)}`,
    "",
    text(model.question),
    "",
  ];
  for (const section of model.sections) {
    if (section.entries) {
      lines.push(`## ${text(section.title)}`, "");
      if (!section.entries.length) lines.push(text(section.empty), "");
      for (const { title, fields } of section.entries) {
        lines.push(`### ${text(title)}`, "");
        for (const [label, value] of fields) {
          lines.push(`**${text(label)}** · ${text(value)}`, "");
        }
      }
      continue;
    }
    lines.push(
      `## ${text(section.title)} (${section.count ?? copy.unknown})`,
      "",
      text(section.description),
      "",
    );
    if (section.rows.length) {
      lines.push(
        tableRow(section.columns.map(text)),
        tableRow(section.columns.map(() => "---")),
        ...section.rows.map((row) =>
          tableRow([sourceItem(row), ...row.cells.map(text)]),
        ),
      );
    } else {
      lines.push(text(section.empty));
    }
    lines.push("");
  }
  return lines.join("\n");
}
