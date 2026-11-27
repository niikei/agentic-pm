import { run } from "../.agents/skills/github-project-cycle/scripts/milestone-report.mjs";

export { renderReport } from "../.agents/skills/github-project-cycle/scripts/milestone-report.mjs";

if (import.meta.main) run(process.argv.slice(2));
