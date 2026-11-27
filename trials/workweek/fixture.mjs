import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { materials, newMaterials } from "./case.mjs";

const cli = fileURLToPath(new URL("../../workspace/cli.mjs", import.meta.url));
const repositories = ["portal", "relay"];
function git(folder, args, date) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.toUpperCase().startsWith("GIT_"),
    ),
  );
  if (date) {
    env.GIT_AUTHOR_DATE = `${date}T10:00:00+09:00`;
    env.GIT_COMMITTER_DATE = env.GIT_AUTHOR_DATE;
  }
  return execFileSync(
    "git",
    [
      "-c",
      "core.autocrlf=false",
      "-c",
      "core.hooksPath=.git/no-trial-hooks",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "user.name=Trial",
      "-c",
      "user.email=trial@example.invalid",
      ...args,
    ],
    { cwd: folder, encoding: "utf8", env },
  ).trim();
}
export function setup(root, days) {
  mkdirSync(root, { mode: 0o700 });
  const desk = join(root, "desk");
  const run = (...args) =>
    execFileSync(process.execPath, [cli, desk, ...args], { stdio: "pipe" });
  run("init");
  for (const folder of ["portal", "relay", "notes"])
    mkdirSync(join(root, folder));
  for (const [path, content] of Object.entries(materials(days)))
    writeFileSync(join(root, path), content, { flag: "wx" });
  const heads = {};
  for (const folder of repositories) {
    const path = join(root, folder);
    git(path, ["init", "--quiet", "--initial-branch=main", "--template="]);
    git(path, ["add", "-f", "--", "Delivery.md"]);
    git(
      path,
      ["commit", "--quiet", "-m", "📝 Record the pilot delivery state"],
      days.monday,
    );
    heads[folder] = git(path, ["rev-parse", "HEAD"]);
  }
  run(
    "register",
    "pilot",
    "夜間受付",
    join(root, "portal"),
    join(root, "relay"),
  );
  run("shared", join(root, "notes"));
  writeFileSync(
    join(root, "trial.json"),
    JSON.stringify({ version: 1, monday: days.monday, heads }, null, 2),
    { flag: "wx" },
  );
  return desk;
}

function matches(path, body) {
  return (
    lstatSync(path, { throwIfNoEntry: false })?.isFile() &&
    readFileSync(path, "utf8") === body
  );
}
function thursdayCommit(path, base, csv) {
  const [head, parent, ...extra] = git(path, [
    "rev-list",
    "--parents",
    "-1",
    "HEAD",
  ]).split(" ");
  return (
    parent === base &&
    !extra.length &&
    git(path, ["diff", "--name-only", base, head]) === "Retry-check.csv" &&
    git(path, ["show", "HEAD:Retry-check.csv"]) === csv.trimEnd()
  );
}
export function repositoryMatches(root, folder, base, advanced, days) {
  const path = join(root, folder);
  if (git(path, ["status", "--porcelain"])) return false;
  return advanced
    ? thursdayCommit(
        path,
        base,
        newMaterials(days, "thursday")["relay/Retry-check.csv"],
      )
    : git(path, ["rev-parse", "HEAD"]) === base;
}
export function reveal(root, meta, days, phase) {
  if (!["thursday", "friday"].includes(phase))
    throw new Error("Only Thursday and Friday introduce source files.");
  for (const folder of ["notes", "relay", "relay/.git", "desk"]) {
    if (!lstatSync(join(root, folder)).isDirectory())
      throw new Error("Expected the original trial directories.");
  }
  const relay = join(root, "relay"),
    base = meta.heads.relay;
  const later = newMaterials(days, "thursday"),
    csv = later["relay/Retry-check.csv"];
  const files = newMaterials(days, phase);
  if (
    phase === "friday" &&
    (!repositoryMatches(root, "relay", base, true, days) ||
      !Object.entries(later).every(([name, body]) =>
        matches(join(root, name), body),
      ))
  )
    throw new Error("Reveal the Thursday evidence before the Friday outcome.");
  const existing = git(relay, ["rev-parse", "HEAD"]);
  if (phase === "thursday") {
    if (existing !== base && !thursdayCommit(relay, base, csv))
      throw new Error(
        "Unexpected repository revision; keep the operator's changes.",
      );
    const status = git(relay, [
      "status",
      "--porcelain",
      "--untracked-files=all",
    ]);
    if (!["", "?? Retry-check.csv", "A  Retry-check.csv"].includes(status))
      throw new Error(
        "Unexpected repository edits; keep the operator's changes.",
      );
  }
  for (const [name, body] of Object.entries(files)) {
    const path = join(root, name);
    if (lstatSync(path, { throwIfNoEntry: false }) && !matches(path, body))
      throw new Error("A source file already has different content.");
  }
  for (const [name, body] of Object.entries(files)) {
    const path = join(root, name);
    try {
      writeFileSync(path, body, { flag: "wx" });
    } catch (error) {
      if (error.code !== "EEXIST" || !matches(path, body)) throw error;
    }
  }
  if (phase === "thursday") {
    if (existing === base) {
      git(relay, ["add", "-f", "--", "Retry-check.csv"]);
      git(
        relay,
        [
          "commit",
          "--quiet",
          "-m",
          "✅ Record the retry trial",
          "--",
          "Retry-check.csv",
        ],
        days.thursday,
      );
    }
    execFileSync(
      process.execPath,
      [cli, join(root, "desk"), "register", "supplies", "備品調達"],
      { stdio: "pipe" },
    );
  }
}
