import { randomUUID } from "node:crypto";
import { lstatSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { contains, inspectSource, locate } from "./sources.mjs";
import { recordEvents, transaction } from "./store.mjs";
import { bundles, refreshBundle } from "./vault.mjs";
import { publishView } from "./views.mjs";

function prepareReceipts(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS reviewed_notes(path TEXT PRIMARY KEY, sha256 TEXT NOT NULL)",
  );
}

function generatedDirectory(dir, desk, bound) {
  return (
    contains(desk, dir) ||
    bound.some(({ path }) => contains(path, dir)) ||
    [".agentic-pm-bundle", ".agentic-pm-snapshot", "workdesk.sqlite"].some(
      (name) =>
        lstatSync(join(dir, name), { throwIfNoEntry: false }) !== undefined,
    )
  );
}

export function scanNotes(db, workspace, directory) {
  if (!isAbsolute(directory))
    throw new Error("Choose an absolute notes directory.");
  const root = realpathSync(directory);
  if (!statSync(root).isDirectory() || !locate(db, root).length)
    throw new Error("Choose a directory inside a registered or shared root.");
  const desk = realpathSync(workspace),
    bound = bundles(db);
  for (let ancestor = root; ; ancestor = dirname(ancestor)) {
    if (generatedDirectory(ancestor, desk, bound))
      throw new Error(
        "Choose source notes outside workspaces and generated bundles.",
      );
    if (dirname(ancestor) === ancestor) break;
  }
  prepareReceipts(db);
  const known = new Map(
    db
      .prepare("SELECT path,sha256 FROM reviewed_notes")
      .all()
      .filter((row) => contains(root, row.path))
      .map((row) => [row.path, row.sha256]),
  );
  const pending = [],
    unavailable = [],
    skipped = [];
  let unchanged = 0;
  function visit(dir) {
    try {
      if (realpathSync(dir) !== dir || generatedDirectory(dir, desk, bound)) {
        skipped.push(dir);
        return;
      }
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (
          entry.isSymbolicLink() ||
          entry.name.startsWith(".") ||
          entry.name === "node_modules"
        ) {
          skipped.push(path);
          continue;
        }
        if (entry.isDirectory()) {
          visit(path);
          continue;
        }
        if (
          !entry.isFile() ||
          ![".md", ".markdown", ".txt"].includes(extname(path).toLowerCase())
        )
          continue;
        try {
          const selection = inspectSource(db, path, undefined, root);
          const previous = known.get(path);
          if (previous === selection.file.sha256) unchanged++;
          else
            pending.push({
              status: previous ? "changed" : "new",
              ...selection,
            });
        } catch {
          unavailable.push(path);
        }
        known.delete(path);
      }
    } catch {
      unavailable.push(dir);
      skipped.push(dir);
    }
  }
  visit(root);
  const missing = [...known.keys()]
    .filter((path) => !skipped.some((dir) => contains(dir, path)))
    .sort();
  pending.sort((a, b) => a.file.path.localeCompare(b.file.path));
  return { pending, unchanged, missing, unavailable: unavailable.sort() };
}

function preparePublications(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS capture_publications(project TEXT PRIMARY KEY REFERENCES projects(id), generation TEXT NOT NULL)",
  );
}

export function capture(db, directory, batch) {
  if (
    !batch ||
    !Array.isArray(batch.events) ||
    !Array.isArray(batch.reviewed) ||
    (!batch.events.length && !batch.reviewed.length)
  )
    throw new Error(
      "Supply events and reviewed arrays with at least one update or receipt.",
    );
  const { events, reviewed } = batch;
  const updates = transaction(db, () => {
    prepareReceipts(db);
    const remember = db.prepare(
      "INSERT INTO reviewed_notes VALUES (?,?) ON CONFLICT(path) DO UPDATE SET sha256=excluded.sha256",
    );
    for (const receipt of reviewed) {
      if (
        !receipt ||
        typeof receipt.path !== "string" ||
        !isDeepStrictEqual(inspectSource(db, receipt.path).file, receipt)
      )
        throw new Error(
          "Reviewed source changed. Read it again before capture.",
        );
      remember.run(receipt.path, receipt.sha256);
    }
    const saved = recordEvents(db, events);
    preparePublications(db);
    const schedule = db.prepare(
      "INSERT INTO capture_publications VALUES (?,?) ON CONFLICT(project) DO UPDATE SET generation=excluded.generation",
    );
    for (const project of new Set(events.map((event) => event.project)))
      schedule.run(project, randomUUID());
    return saved;
  });
  return {
    updates,
    reviewed: reviewed.length,
    ...publishCaptured(db, directory),
  };
}

export function publishCaptured(db, directory) {
  preparePublications(db);
  const publications = [],
    problems = [];
  let desk;
  try {
    desk = publishView(db, directory, "desk");
  } catch (error) {
    problems.push({ output: "desk", reason: error.message });
  }
  const existing = bundles(db);
  for (const { project, generation } of db
    .prepare(
      "SELECT project,generation FROM capture_publications ORDER BY project",
    )
    .all()) {
    const previousProblems = problems.length;
    const destinations = existing
      .filter((binding) => binding.project === project)
      .map((binding) => binding.path);
    if (!destinations.length)
      destinations.push(join(realpathSync(directory), `okf-${project}`));
    for (const path of destinations) {
      try {
        const result = refreshBundle(db, path, project);
        publications.push(result);
        if (result.conflicts.length)
          problems.push({
            output: path,
            reason: "Review conflicting notes before refreshing.",
          });
      } catch (error) {
        problems.push({ output: path, reason: error.message });
      }
    }
    if (previousProblems === problems.length)
      db.prepare(
        "DELETE FROM capture_publications WHERE project=? AND generation=?",
      ).run(project, generation);
  }
  return { desk, publications, problems };
}
