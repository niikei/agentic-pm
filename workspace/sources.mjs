import { isUtf8 } from "node:buffer";
import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, isAbsolute, relative, sep } from "node:path";

export function contains(root, file) {
  const path = relative(root, file);
  return (
    path === "" ||
    (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`))
  );
}

export function locate(db, file) {
  const target = realpathSync(file);
  const roots = db
    .prepare("SELECT project,path FROM roots ORDER BY project")
    .all();
  return [
    ...new Set(
      roots
        .filter((root) => contains(root.path, target))
        .map((root) => root.project),
    ),
  ];
}

const baselineLimit = 4 * 1024 * 1024;

function fingerprint(file, keepText) {
  if (!statSync(file).isFile()) throw new Error("Select a regular file.");
  const fd = openSync(file, "r");
  try {
    const before = fstatSync(fd, { bigint: true });
    let chunks = keepText && before.size <= baselineLimit ? [] : null;
    let bytes = 0;
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    for (;;) {
      const length = readSync(fd, buffer);
      if (!length) break;
      const part = buffer.subarray(0, length);
      hash.update(part);
      bytes += length;
      if (chunks && bytes <= baselineLimit) chunks.push(Buffer.from(part));
      else chunks = null;
    }
    const after = fstatSync(fd, { bigint: true });
    if (after.mtimeNs !== before.mtimeNs || after.size !== before.size)
      throw new Error("Source changed while reading. Read it again.");
    const body = chunks && Buffer.concat(chunks);
    return {
      sha256: hash.digest("hex"),
      body: body && !body.includes(0) && isUtf8(body) ? body : null,
    };
  } finally {
    closeSync(fd);
  }
}

function readSource(db, file, project, scope, keepText) {
  if (!isAbsolute(file)) throw new Error("Select an absolute file path.");
  const path = realpathSync(file);
  if (scope && (!contains(scope, path) || path !== file))
    throw new Error("Source moved outside the scan or became a link.");
  const roots = locate(db, path);
  const shared = roots.includes("inbox");
  const candidates = roots.filter((id) => id !== "inbox");
  if (
    !shared &&
    (!candidates.length ||
      (project && project !== "inbox" && !candidates.includes(project)))
  )
    throw new Error("Source is outside the project's registered roots.");
  const { sha256, body } = fingerprint(path, keepText);
  const selection = { candidates, shared, file: { path, sha256 } };
  return keepText ? { ...selection, body } : selection;
}

export function inspectSource(db, file, project, scope) {
  return readSource(db, file, project, scope, false);
}

export function inspectReviewedFile(db, file) {
  const keepText = [".md", ".markdown", ".txt"].includes(
    extname(file).toLowerCase(),
  );
  return readSource(db, file, undefined, undefined, keepText);
}

export function sourceStatus(db, project, file, files) {
  if (!files.has(file.path)) {
    try {
      files.set(file.path, inspectSource(db, file.path));
    } catch (err) {
      files.set(file.path, {
        status: err.code === "ENOENT" ? "missing" : "unavailable",
      });
    }
  }
  const result = files.get(file.path);
  if (result.status) return result.status;
  if (
    !result.shared &&
    project !== "inbox" &&
    !result.candidates.includes(project)
  )
    return "unavailable";
  return result.file.path === file.path && result.file.sha256 === file.sha256
    ? "current"
    : "changed";
}

export function reviewSources(db, project) {
  if (project && !db.prepare("SELECT 1 FROM projects WHERE id=?").get(project))
    throw new Error("Unknown project.");
  const rows = db
    .prepare(
      "SELECT project,item,payload FROM events WHERE (? IS NULL OR project=?) ORDER BY seq DESC",
    )
    .all(project ?? null, project ?? null);
  const seen = new Set();
  const files = new Map();
  const attention = [];
  for (const row of rows) {
    const { file, source, observed, changes } = JSON.parse(row.payload);
    const fields = [];
    for (const [field, value] of Object.entries(changes)) {
      const key = JSON.stringify([row.project, row.item, field]);
      if (seen.has(key)) continue;
      seen.add(key);
      if (value !== null) fields.push(field);
    }
    if (!file || !fields.length) continue;
    const status = sourceStatus(db, row.project, file, files);
    if (status === "current") continue;
    attention.push({
      project: row.project,
      item: row.item,
      fields,
      source,
      observed,
      path: file.path,
      status,
    });
  }
  return { checkedFiles: files.size, attention };
}
