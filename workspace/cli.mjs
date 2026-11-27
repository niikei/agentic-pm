import { readFileSync } from "node:fs";
import { exportBundle } from "./okf.mjs";
import {
  applyEvents,
  history,
  init,
  items,
  locate,
  openWorkspace,
  projects,
  register,
} from "./store.mjs";

import { agenda, publishView, workDesk } from "./views.mjs";

const usage = `node workspace/cli.mjs WORKSPACE COMMAND [arguments]
  init
  register PROJECT NAME [ABSOLUTE_DIRECTORY ...]
  projects
  locate FILE
  apply UPDATE_FILE
  items [PROJECT]
  history PROJECT ITEM
  okf NEW_DIRECTORY [PROJECT]
  desk [PROJECT]
  agenda [PROJECT]
  manager [PROJECT]`;
const [directory, command, ...args] = process.argv.slice(2);
function run() {
  if (directory === "--help") return usage;
  if (!directory || !command) throw new Error(usage);
  if (command === "init" && !args.length) {
    init(directory);
    return "Workspace created.";
  }
  const db = openWorkspace(directory);
  try {
    switch (command) {
      case "register":
        if (args.length >= 2) {
          register(db, args[0], args[1], args.slice(2));
          return projects(db);
        }
        break;
      case "projects":
        if (!args.length) return projects(db);
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
          const desk = publishView(db, directory, "desk");
          return { updates, desk };
        }
        break;
      case "items":
        if (args.length <= 1) return items(db, args[0]);
        break;
      case "desk":
      case "manager":
        if (args.length <= 1)
          return publishView(db, directory, command, args[0]);
        break;
      case "agenda":
        if (args.length <= 1)
          return agenda(workDesk(db, args[0], new Date().toISOString()));
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
  console.error(error.message);
  process.exitCode = 1;
}
