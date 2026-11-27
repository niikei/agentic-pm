import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { prepareReceipts } from "./intake.mjs";
import { inspectReviewedFile } from "./sources.mjs";

import { fieldSources, history } from "./store.mjs";

function currentCitations(db, path) {
  const items = db
    .prepare(
      "SELECT DISTINCT project,item FROM events WHERE json_extract(payload,'$.file.path')=? ORDER BY project,item",
    )
    .all(path);
  const citations = [];
  for (const { project, item } of items) {
    const sources = fieldSources(history(db, project, item));
    const fields = [...sources]
      .filter(
        ([key, event]) =>
          event.file?.path === path && event.changes[key] !== null,
      )
      .map(([key]) => key);
    if (fields.length) citations.push({ project, item, fields });
  }
  return citations;
}

export function noteChanges(db, directory, path) {
  const { file, body } = inspectReviewedFile(db, path);
  prepareReceipts(db);
  const previous = db
    .prepare("SELECT * FROM reviewed_notes WHERE path=?")
    .get(file.path);
  if (previous?.sha256 === file.sha256) return { file, mode: "unchanged" };
  const selection = { file, citedBy: currentCitations(db, file.path) };
  if (!previous?.body || !body)
    return {
      ...selection,
      mode: "read",
      reason:
        "A comparable pair of reviewed UTF-8 text versions is unavailable.",
    };

  // Run in a private scratch directory with fixed operands. Source checkout settings
  // and the index play no role when the prior reading contained uncommitted edits.
  const scratch = mkdtempSync(join(resolve(directory), ".note-diff-"));
  try {
    writeFileSync(join(scratch, "previous"), previous.body, {
      flag: "wx",
      mode: 0o600,
    });
    writeFileSync(join(scratch, "current"), body, { flag: "wx", mode: 0o600 });
    // Git for Windows can open an ordinary empty config through either path API.
    const config = join(scratch, "empty.gitconfig");
    writeFileSync(config, "", { flag: "wx", mode: 0o600 });
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => !key.toUpperCase().startsWith("GIT_"),
      ),
    );
    const diff = spawnSync(
      "git",
      [
        "--no-pager",
        "-c",
        "core.autocrlf=false",
        "diff",
        "--no-index",
        "--no-ext-diff",
        "--no-textconv",
        "--no-color",
        "--ignore-cr-at-eol",
        "--unified=3",
        "--",
        "previous",
        "current",
      ],
      {
        cwd: scratch,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 128 * 1024,
        env: {
          ...env,
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: config,
          GIT_ATTR_NOSYSTEM: "1",
          GIT_CEILING_DIRECTORIES: dirname(scratch),
        },
      },
    );
    if (!diff.error && diff.status === 1 && diff.stdout.includes("\n@@ "))
      return {
        ...selection,
        mode: "diff",
        previousSha256: previous.sha256,
        patch: diff.stdout,
      };
    if (!diff.error && diff.status === 0 && !diff.stdout)
      return {
        ...selection,
        mode: "line-endings",
        previousSha256: previous.sha256,
      };
    return {
      ...selection,
      mode: "read",
      reason: `Git could not return a complete, bounded text diff (${diff.error?.code ?? diff.signal ?? diff.status}). Read the current note.`,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
