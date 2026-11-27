import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { writeGuide } from "./guide.mjs";
import { exportBundle } from "./okf.mjs";
import { inspectSource, locate, reviewSources } from "./sources.mjs";
import {
  applyEvents,
  history,
  init,
  items,
  openWorkspace,
  projects,
  register,
} from "./store.mjs";
import { bundles, refreshBundle } from "./vault.mjs";
import { agenda, publishView, workDesk } from "./views.mjs";

const usage = `node workspace/cli.mjs WORKSPACE COMMAND [arguments]
  init
  guide
  register PROJECT NAME [ABSOLUTE_DIRECTORY ...]
  shared ABSOLUTE_DIRECTORY [...]
  projects
  locate FILE
  inspect ABSOLUTE_FILE
  review [PROJECT]
  apply UPDATE_FILE
  items [PROJECT]
  history PROJECT ITEM
  okf NEW_DIRECTORY [PROJECT]
  okf-refresh DIRECTORY PROJECT
  bundles
  desk [PROJECT]
  agenda [PROJECT] [--all]
  manager [PROJECT]`;
const [directory, command, ...args] = process.argv.slice(2);
function run() {
  if (directory === "--help") return usage;
  if (!directory || !command) throw new Error(usage);
  if (command === "init" && !args.length) {
    init(directory);
    return writeGuide(directory);
  }
  const db = openWorkspace(directory);
  try {
    switch (command) {
      case "guide":
        if (!args.length) return writeGuide(directory);
        break;
      case "register":
        if (args.length >= 2) {
          register(db, args[0], args[1], args.slice(2));
          return projects(db);
        }
        break;
      case "shared":
        if (args.length) {
          register(db, "inbox", "未整理", args);
          return projects(db);
        }
        break;
      case "projects":
        if (!args.length) return projects(db);
        break;
      case "inspect":
        if (args.length === 1) return inspectSource(db, args[0]);
        break;
      case "review":
        if (args.length <= 1) return reviewSources(db, args[0]);
        break;
      case "locate":
        if (args.length === 1) return locate(db, args[0]);
        break;
      case "apply":
        if (args.length === 1) {
          const updates = applyEvents(
            db,
            JSON.parse(readFileSync(args[0], "utf8").replace(/^\uFEFF/, "")),
          );
          try {
            const desk = publishView(db, directory, "desk");
            return { updates, desk };
          } catch (error) {
            process.exitCode = 2;
            console.error(
              "Intake saved. Resolve the output problem and run desk to refresh the view.",
            );
            return {
              updates,
              desk: null,
              refreshError: error.code ?? "unavailable",
            };
          }
        }
        break;
      case "items":
        if (args.length <= 1) return items(db, args[0]);
        break;
      case "desk":
      case "manager":
        if (args.length <= 1)
          return publishView(
            db,
            directory,
            command,
            args[0],
            undefined,
            ({ project, item, reason }) =>
              console.error(
                `Withheld ${project}/${item} (${reason}). Review its evidence before sharing.`,
              ),
          );
        break;
      case "agenda": {
        const { values, positionals } = parseArgs({
          args,
          allowPositionals: true,
          options: { all: { type: "boolean" } },
        });
        if (positionals.length <= 1)
          return agenda(
            workDesk(db, positionals[0], new Date().toISOString()),
            values.all,
          );
        break;
      }
      case "bundles":
        if (!args.length) return bundles(db);
        break;
      case "okf-refresh":
        if (args.length === 2) {
          const result = refreshBundle(db, ...args);
          if (result.conflicts.length) process.exitCode = 2;
          return result;
        }
        break;
      case "okf":
        if (args.length === 1 || args.length === 2)
          return exportBundle(db, ...args);
        break;
      case "history":
        if (args.length === 2) return history(db, ...args);
        break;
    }
    throw new Error(usage);
  } finally {
    db.close();
  }
}

try {
  const result = run();
  console.log(
    typeof result === "string" ? result : JSON.stringify(result, null, 2),
  );
} catch (error) {
  console.error(
    error instanceof SyntaxError ? "Invalid JSON input." : error.message,
  );
  process.exitCode = 1;
}
