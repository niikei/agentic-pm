import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { briefs, calendar } from "./case.mjs";
import { reveal, setup } from "./fixture.mjs";
import { score } from "./score.mjs";

function main() {
  const [command, directory, arg, ...extra] = process.argv.slice(2);
  if (
    !["setup", "brief", "score", "reveal"].includes(command) ||
    !directory ||
    (extra.length &&
      !(command === "score" && arg === "next-monday" && extra.length === 1))
  )
    throw new Error(
      "Use setup NEW_DIRECTORY [MONDAY], brief DIRECTORY DAY, reveal DIRECTORY thursday|friday or score DIRECTORY DAY [RESTORED_DESK].",
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
  if (command === "reveal") {
    reveal(root, meta, days, arg);
    return;
  }
  if (!Object.hasOwn(prompts, arg))
    throw new Error("Choose a day listed in the workplace trial guide.");
  if (command === "brief") {
    process.stdout.write(prompts[arg]);
    return;
  }
  if (arg === "next-monday" && extra.length !== 1)
    throw new Error("Supply the restored desk as the final argument.");
  const checks = score(root, meta, days, arg, extra[0] && resolve(extra[0]));
  console.log(JSON.stringify({ phase: arg, checks }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
}
try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
