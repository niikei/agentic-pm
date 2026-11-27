import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { history, items, openWorkspace } from "../../workspace/store.mjs";
import { briefs, calendar, materials } from "./case.mjs";

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
function setup(root, days) {
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

function score(root, meta, days, phase) {
  const desk = join(root, "desk"),
    db = openWorkspace(desk);
  try {
    const rows = items(db),
      pilot = rows.filter((row) => row.project === "pilot");
    const deadlineItems = pilot.filter((row) =>
      history(db, row.project, row.item).some(
        (event) => event.changes.dueDate === days.friday,
      ),
    );
    const cited = new Set(
      rows.flatMap((row) =>
        history(db, row.project, row.item).flatMap((event) =>
          event.file ? [event.file.path] : [],
        ),
      ),
    );
    const checks = {
      originals: Object.entries(materials(days)).every(
        ([file, body]) =>
          existsSync(join(root, file)) &&
          readFileSync(join(root, file), "utf8") === body,
      ),
      bothRepositoriesCited: repositories.every(
        (folder) =>
          existsSync(join(root, folder, "Delivery.md")) &&
          cited.has(realpathSync(join(root, folder, "Delivery.md"))),
      ),
      repositories: repositories.every((folder) => {
        const path = join(root, folder);
        return (
          git(path, ["rev-parse", "HEAD"]) === meta.heads[folder] &&
          !git(path, ["status", "--porcelain"])
        );
      }),
      ambiguousIntake: rows.some(
        (row) =>
          row.project === "inbox" &&
          row.status !== "done" &&
          row.status !== "reference",
      ),
      mondayDeadlineRecorded: deadlineItems.length === 1,
    };
    if (phase === "monday")
      checks.activeDeadline =
        deadlineItems.length === 1 && deadlineItems[0].dueDate === days.friday;
    else {
      checks.deadlineWithdrawn =
        deadlineItems.length === 1 &&
        !deadlineItems[0].dueDate &&
        !pilot.some((row) => row.status !== "done" && row.dueDate);
      checks.reviewTime = pilot.some(
        (row) =>
          Date.parse(row.meeting?.start) ===
            Date.parse(`${days.friday}T15:00:00+09:00`) &&
          Date.parse(row.meeting?.end) ===
            Date.parse(`${days.friday}T15:30:00+09:00`),
      );
    }
    if (phase === "wednesday") {
      const target = join(desk, "manager-handoff.md");
      const body = existsSync(target)
        ? readFileSync(target, "utf8").trim()
        : "";
      checks.handoffSaved = body.length > 0;
      checks.handoffAudience =
        Boolean(body) &&
        !(
          /AMBER-LOCKER|https?:\/\/|file:\/\/|[A-Za-z]:\\/.test(body) ||
          body.includes(root)
        );
    }
    return checks;
  } finally {
    db.close();
  }
}

function main() {
  const [command, directory, arg, ...extra] = process.argv.slice(2);
  if (
    !["setup", "brief", "score"].includes(command) ||
    !directory ||
    extra.length
  )
    throw new Error(
      "Use setup NEW_DIRECTORY [MONDAY], brief DIRECTORY DAY or score DIRECTORY DAY.",
    );
  const root = resolve(directory);
  if (command === "setup") {
    console.log(setup(root, calendar(arg ?? "2026-11-30")));
    return;
  }
  const meta = JSON.parse(readFileSync(join(root, "trial.json"), "utf8"));
  if (meta.version !== 1) throw new Error("Unknown trial format.");
  const days = calendar(meta.monday),
    prompts = briefs(days);
  if (!Object.hasOwn(prompts, arg))
    throw new Error("Choose monday, tuesday or wednesday.");
  if (command === "brief") {
    process.stdout.write(prompts[arg]);
    return;
  }
  const checks = score(root, meta, days, arg);
  console.log(JSON.stringify({ phase: arg, checks }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
}
try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
