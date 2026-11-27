import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";

const source = (name) => new URL(name, import.meta.url);
const directory = source("./definitions/");
export const sampleFile = source("./examples/rollout.json");
export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function validUtc(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return false;
  const canonical = new Date(time).toISOString();
  return canonical.slice(0, 19) === value.slice(0, 19);
}

const ajv = new Ajv({
  useDefaults: true,
  formats: {
    "date-time": validUtc,
    uri(value) {
      if (!URL.canParse(value) || /[\s\\]/u.test(value)) return false;
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    },
  },
});
const checkDefinition = ajv.compile(
  readJson(source("./schemas/report-v1.json")),
);
const checkSnapshot = ajv.compile(
  readJson(source("./schemas/snapshot-v1.json")),
);

function checked(check, value, label) {
  if (!check(value)) {
    throw new Error(
      `${label}: ${ajv.errorsText(check.errors, { dataVar: label })}`,
    );
  }
  return value;
}

export function loadDefinition(file) {
  return checked(checkDefinition, readJson(file), "report definition");
}

export function catalog() {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      id: file.slice(0, -5),
      definition: loadDefinition(new URL(encodeURIComponent(file), directory)),
    }));
}

export function selectDefinition(name) {
  if (name.endsWith(".json")) return loadDefinition(resolve(name));
  const entry = catalog().find(({ id }) => id === name);
  if (!entry)
    throw new Error(
      `Unknown report: ${name}. Use reports list to see the catalog.`,
    );
  return entry.definition;
}

export function validateSnapshot(snapshot) {
  checked(checkSnapshot, snapshot, "snapshot");
  if (Date.parse(snapshot.coverageStart) > Date.parse(snapshot.asOf)) {
    throw new Error("Snapshot coverage starts after its capture.");
  }
  const goals = new Set();
  for (const observation of snapshot.outcomes ?? []) {
    if (Date.parse(observation.observedAt) > Date.parse(snapshot.asOf)) {
      throw new Error("A goal observation is dated after the snapshot cutoff.");
    }
    const goal = observation.goal.trim();
    if (goals.has(goal))
      throw new Error("Duplicate goal in outcome observations.");
    goals.add(goal);
  }
  for (const records of [snapshot.items, snapshot.deliveries]) {
    if (new Set(records.map(({ id }) => id)).size !== records.length) {
      throw new Error(
        "Snapshot contains duplicate record IDs within one collection.",
      );
    }
  }
  for (const item of snapshot.items) {
    if (Date.parse(item.updatedAt) > Date.parse(snapshot.asOf)) {
      throw new Error("An open record was updated after the snapshot cutoff.");
    }
    if (
      item.decisionSince &&
      (!item.needsDecision ||
        Date.parse(item.decisionSince) > Date.parse(snapshot.asOf))
    ) {
      throw new Error(
        "Snapshot contains a decision start inconsistent with its capture.",
      );
    }
  }
  return snapshot;
}
