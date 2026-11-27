import {
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv";
import { inspectSource } from "./sources.mjs";

const text = { type: "string", minLength: 1, pattern: "\\S" };
const id = { type: "string", pattern: "^[a-z][a-z0-9-]{0,47}$" };
const fields = {
  title: text,
  status: { enum: ["backlog", "ready", "active", "waiting", "done"] },
  nextAction: text,
  question: text,
  estimate: text,
  hypothesis: text,
  dueDate: { type: "string", format: "date" },
  followUp: { type: "string", format: "date" },
  managerUpdate: text,
};
const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(+date) && date.toISOString().startsWith(value);
};
const ajv = new Ajv({ formats: { date: validDate } });
const validateId = ajv.compile(id);
const validateEvent = ajv.compile({
  type: "object",
  additionalProperties: false,
  required: [
    "event",
    "project",
    "item",
    "base",
    "observed",
    "source",
    "changes",
  ],
  properties: {
    event: id,
    project: id,
    item: id,
    base: { type: "integer", minimum: 0 },
    observed: { type: "string", format: "date" },
    source: text,
    file: {
      type: "object",
      required: ["path", "sha256"],
      additionalProperties: false,
      properties: {
        path: text,
        sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
      },
    },
    changes: {
      type: "object",
      minProperties: 1,
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(fields).map(([key, definition]) => [
          key,
          ["title", "status"].includes(key)
            ? definition
            : { anyOf: [definition, { type: "null" }] },
        ]),
      ),
    },
  },
});

const database = "workdesk.sqlite";
export function init(directory) {
  // Resolve the parent before checking boundaries, including directory junctions.
  const parent = realpathSync(dirname(resolve(directory)));
  for (let path = parent; ; path = dirname(path)) {
    if (existsSync(join(path, ".git")))
      throw new Error("Choose a private workspace outside a Git checkout.");
    if (dirname(path) === path) break;
  }
  // Exclusive creation keeps existing notes and other workspaces intact.
  mkdirSync(directory, { mode: 0o700 });
  const file = join(directory, database);
  writeFileSync(file, "", { flag: "wx", mode: 0o600 });
  const db = new DatabaseSync(file);
  try {
    db.exec(`
      BEGIN;
      CREATE TABLE projects(id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE roots(project TEXT REFERENCES projects(id), path TEXT NOT NULL, PRIMARY KEY(project,path));
      CREATE TABLE events(seq INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL, project TEXT REFERENCES projects(id), item TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, UNIQUE(project,item,revision));
      INSERT INTO projects VALUES ('inbox','未整理');
      PRAGMA user_version = 1;
      COMMIT;
    `);
  } finally {
    db.close();
  }
}

export function openWorkspace(directory) {
  const file = join(directory, database);
  if (!lstatSync(file).isFile())
    throw new Error("Expected a private workspace database.");
  const db = new DatabaseSync(file, { timeout: 5000 });
  if (db.prepare("PRAGMA user_version").get().user_version === 1) return db;
  db.close();
  throw new Error("Unknown workspace version.");
}

export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function register(db, project, name, paths) {
  if (!validateId(project) || project === "inbox" || !name?.trim())
    throw new Error("Supply a project ID and a display name.");
  const roots = paths.map((path) => {
    if (!isAbsolute(path) || !statSync(path).isDirectory())
      throw new Error("Register an existing absolute directory.");
    return realpathSync(path);
  });
  transaction(db, () => {
    db.prepare(
      "INSERT INTO projects VALUES (?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name",
    ).run(project, name);
    const add = db.prepare("INSERT OR IGNORE INTO roots VALUES (?,?)");
    for (const root of roots) add.run(project, root);
  });
}

export function projects(db) {
  return db
    .prepare("SELECT * FROM projects ORDER BY id")
    .all()
    .map((project) => ({
      ...project,
      roots: db
        .prepare("SELECT path FROM roots WHERE project=? ORDER BY path")
        .all(project.id)
        .map((row) => row.path),
    }));
}

export function applyEvents(db, events) {
  if (!Array.isArray(events) || !events.length)
    throw new Error("Expected a nonempty JSON array of updates.");
  return transaction(db, () =>
    events.map((event) => {
      if (!validateEvent(event))
        throw new Error(ajv.errorsText(validateEvent.errors));
      const prior = db
        .prepare("SELECT payload,revision FROM events WHERE id=?")
        .get(event.event);
      if (prior) {
        if (!isDeepStrictEqual(JSON.parse(prior.payload), event))
          throw new Error(`Event ID already used: ${event.event}`);
        return { event: event.event, revision: prior.revision, replay: true };
      }
      if (event.file) {
        const { file } = inspectSource(db, event.file.path, event.project);
        if (!isDeepStrictEqual(file, event.file))
          throw new Error(
            "Source changed since selection. Read it again before applying.",
          );
      }
      const current = db
        .prepare(
          "SELECT revision,state FROM events WHERE project=? AND item=? ORDER BY revision DESC LIMIT 1",
        )
        .get(event.project, event.item);
      if ((current?.revision ?? 0) !== event.base)
        throw new Error(
          `Read the current revision of ${event.project}/${event.item} and reconcile the update.`,
        );
      const state = {
        ...(current ? JSON.parse(current.state) : {}),
        ...event.changes,
      };
      if (!state.title || !state.status)
        throw new Error("New items need a title and a status.");
      const revision = event.base + 1;
      db.prepare(
        "INSERT INTO events(id,project,item,revision,payload,state) VALUES (?,?,?,?,?,?)",
      ).run(
        event.event,
        event.project,
        event.item,
        revision,
        JSON.stringify(event),
        JSON.stringify(state),
      );
      return { event: event.event, revision, replay: false };
    }),
  );
}

export function items(db, project) {
  if (project && !db.prepare("SELECT 1 FROM projects WHERE id=?").get(project))
    throw new Error("Unknown project.");
  const rows = db
    .prepare(
      `SELECT project,item,revision,payload,state FROM events AS e WHERE (? IS NULL OR project=?) AND NOT EXISTS (SELECT 1 FROM events newer WHERE newer.project=e.project AND newer.item=e.item AND newer.revision>e.revision) ORDER BY project,item`,
    )
    .all(project ?? null, project ?? null);
  return rows.map((row) => {
    const { source, observed } = JSON.parse(row.payload);
    return {
      project: row.project,
      item: row.item,
      revision: row.revision,
      source,
      observed,
      ...JSON.parse(row.state),
    };
  });
}

export function history(db, project, item) {
  return db
    .prepare(
      "SELECT payload FROM events WHERE project=? AND item=? ORDER BY revision",
    )
    .all(project, item)
    .map((row) => JSON.parse(row.payload));
}
