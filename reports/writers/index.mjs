import { renderHtml } from "./html.mjs";
import { renderMarkdown } from "./markdown.mjs";

const writers = {
  html: { extension: "html", label: "HTML", render: renderHtml },
  markdown: { extension: "md", label: "Markdown", render: renderMarkdown },
};

export function writerFor(format) {
  if (!Object.hasOwn(writers, format))
    throw new Error("Unsupported report format.");
  return writers[format];
}
