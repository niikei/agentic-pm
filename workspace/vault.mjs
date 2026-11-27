import { randomUUID } from "node:crypto";
import {
  constants,
  copyFileSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { bundlePages } from "./okf.mjs";
import { transaction } from "./store.mjs";

// Install without replacing a new file written by somebody else.
function install(source, target) {
  try {
    linkSync(source, target);
  } catch (error) {
    if (
      !["EPERM", "EACCES", "ENOSYS", "ENOTSUP", "EOPNOTSUPP"].includes(
        error.code,
      )
    )
      throw error;
    copyFileSync(source, target, constants.COPYFILE_EXCL);
  }
}

function save(target, current, proposed) {
  const staging = mkdtempSync(
    join(dirname(target), `.save-${basename(target)}-`),
  );
  const saved = join(staging, "original");
  const next = join(staging, "proposed");
  let hasOriginal = false;
  try {
    writeFileSync(next, proposed, { flag: "wx", mode: 0o600 });
    if (current !== undefined) {
      renameSync(target, saved);
      hasOriginal = true;
      if (!lstatSync(saved).isFile() || !readFileSync(saved).equals(current))
        throw new Error("The note changed during refresh.");
    }
    install(next, target);
    hasOriginal = false;
  } catch (error) {
    if (hasOriginal) {
      try {
        if (!lstatSync(saved).isFile()) throw new Error("Changed file type.");
        install(saved, target);
        hasOriginal = false;
      } catch {
        throw new Error(
          `Another writer changed this note. Its previous entry is preserved at ${saved}.`,
          { cause: error },
        );
      }
    }
    throw error;
  } finally {
    if (!hasOriginal) rmSync(staging, { force: true, recursive: true });
  }
}

function refreshPage(target, baseline, proposed) {
  const stat = lstatSync(target, { throwIfNoEntry: false });
  if (!stat) {
    if (baseline !== undefined) return "removed";
    save(target, undefined, proposed);
    return "written";
  }
  if (!stat.isFile()) return "different file type";
  const current = readFileSync(target);
  const next = Buffer.from(proposed);
  if (
    current.equals(next) ||
    (baseline !== undefined && current.subarray(0, next.length).equals(next))
  )
    return "current";
  if (baseline === undefined) return "occupied";
  if (proposed === baseline) return "preserved";
  const before = Buffer.from(baseline);
  if (!current.subarray(0, before.length).equals(before)) return "edited";
  save(target, current, Buffer.concat([next, current.subarray(before.length)]));
  return "written";
}

function workspaceDirectory(db) {
  return dirname(
    db
      .prepare("PRAGMA database_list")
      .all()
      .find((row) => row.name === "main").file,
  );
}

export function bundles(db) {
  if (
    !db
      .prepare(
        "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='vaults'",
      )
      .get()
  )
    return [];
  const directory = workspaceDirectory(db);
  return db
    .prepare("SELECT project,path FROM vaults ORDER BY project,path")
    .all()
    .map(({ project, path }) => ({
      project,
      path: resolve(directory, path),
    }));
}

const marker = ".agentic-pm-bundle";

function verifyDestination(target, token) {
  const file = join(target, marker);
  if (
    !lstatSync(target).isDirectory() ||
    !lstatSync(file, { throwIfNoEntry: false })?.isFile() ||
    readFileSync(file, "utf8") !== token
  )
    throw new Error(
      "The bound folder identity changed. Restore the original destination or bind a new folder.",
    );
}

function recognizeLegacyPages(db, key, target) {
  const known = db
    .prepare(
      "SELECT name,body FROM vault_pages WHERE path=? AND name!='index.md'",
    )
    .all(key);
  return known.some(({ name, body }) => {
    const file = join(target, name);
    return (
      lstatSync(file, { throwIfNoEntry: false })?.isFile() &&
      readFileSync(file, "utf8").startsWith(body)
    );
  });
}

export function refreshBundle(db, directory, project) {
  if (!project)
    throw new Error("Choose a single project for the linked bundle.");
  const absolute = resolve(directory);
  const target = join(realpathSync(dirname(absolute)), basename(absolute));
  db.exec(`
    CREATE TABLE IF NOT EXISTS vaults(path TEXT PRIMARY KEY,project TEXT NOT NULL REFERENCES projects(id));
    CREATE TABLE IF NOT EXISTS vault_ids(path TEXT PRIMARY KEY REFERENCES vaults(path),token TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS vault_pages(path TEXT NOT NULL REFERENCES vaults(path),name TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(path,name));
  `);
  // Store the built-in destination relative to the database so restored copies publish locally.
  const localName = `okf-${project}`;
  const key =
    target === join(workspaceDirectory(db), localName) &&
    !db.prepare("SELECT 1 FROM vaults WHERE path=?").get(target)
      ? localName
      : target;
  const token = transaction(db, () => {
    const binding = db
      .prepare("SELECT project FROM vaults WHERE path=?")
      .get(key);
    if (binding) {
      if (binding.project !== project || !lstatSync(target).isDirectory())
        throw new Error("The bound folder or its project changed.");
      const saved = db
        .prepare("SELECT token FROM vault_ids WHERE path=?")
        .get(key);
      if (saved) return saved.token;
      if (!recognizeLegacyPages(db, key, target))
        throw new Error(
          "Original generated notes could not be identified in this older bundle. Choose a new dedicated folder.",
        );
    } else {
      if (!db.prepare("SELECT 1 FROM projects WHERE id=?").get(project))
        throw new Error("Unknown project.");
      mkdirSync(target, { mode: 0o700 });
      db.prepare("INSERT INTO vaults VALUES (?,?)").run(key, project);
    }
    const value = randomUUID();
    writeFileSync(join(target, marker), value, { flag: "wx", mode: 0o600 });
    db.prepare("INSERT INTO vault_ids VALUES (?,?)").run(key, value);
    return value;
  });
  return transaction(db, () => {
    verifyDestination(target, token);
    const written = [],
      conflicts = [];
    const baseline = db.prepare(
      "SELECT body FROM vault_pages WHERE path=? AND name=?",
    );
    const remember = db.prepare(
      "INSERT INTO vault_pages VALUES (?,?,?) ON CONFLICT(path,name) DO UPDATE SET body=excluded.body",
    );
    for (const { name, body } of bundlePages(db, project)) {
      // Keep the index coherent if a concept needs the operator's attention.
      if (name === "index.md" && conflicts.length) continue;
      const previous = baseline.get(key, name)?.body;
      const result = refreshPage(join(target, name), previous, body);
      if (result === "written") written.push(name);
      if (["written", "current"].includes(result)) {
        if (previous !== body) remember.run(key, name, body);
      } else if (result !== "preserved")
        conflicts.push({ name, reason: result });
    }
    return { index: join(target, "index.md"), written, conflicts };
  });
}
