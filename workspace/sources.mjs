import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, relative, sep } from "node:path";

function contains(root, file) {
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

function digest(file) {
  if (!statSync(file).isFile()) throw new Error("Select a regular file.");
  const fd = openSync(file, "r");
  try {
    const before = fstatSync(fd, { bigint: true });
    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    for (;;) {
      const length = readSync(fd, buffer);
      if (!length) break;
      hash.update(buffer.subarray(0, length));
    }
    const after = fstatSync(fd, { bigint: true });
    if (after.mtimeNs !== before.mtimeNs || after.size !== before.size)
      throw new Error("Source changed while reading. Read it again.");
    return hash.digest("hex");
  } finally {
    closeSync(fd);
  }
}

export function inspectSource(db, file, project) {
  if (!isAbsolute(file)) throw new Error("Select an absolute file path.");
  const path = realpathSync(file);
  const candidates = locate(db, path);
  if (
    !candidates.length ||
    (project && project !== "inbox" && !candidates.includes(project))
  )
    throw new Error("Source is outside the project's registered roots.");
  return { candidates, file: { path, sha256: digest(path) } };
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
    if (
      !result.status &&
      (row.project === "inbox" || result.candidates.includes(row.project)) &&
      result.file.sha256 === file.sha256 &&
      result.file.path === file.path
    )
      continue;
    attention.push({
      project: row.project,
      item: row.item,
      fields,
      source,
      observed,
      path: file.path,
      status: result.status ?? "changed",
    });
  }
  return { checkedFiles: files.size, attention };
}
