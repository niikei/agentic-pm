# agentic-pm

An agent-agnostic reference implementation for AI-native project management on GitHub. GitHub Issues hold the work breakdown, acceptance criteria and decisions. GitHub Projects tracks delivery status. An agent can resume work from those records using the standard GitHub CLI.

## Follow a delivery

Start with the [development board](https://github.com/users/niikei/projects/1). Open an issue to see its outcome, dependencies and review evidence. The [v0.1 scope](https://github.com/niikei/agentic-pm/issues/5) and [candidate handoff](https://github.com/niikei/agentic-pm/issues/7) show the process on this repository.

To try it, follow the [browser walkthrough](docs/lifecycle.md) or give your agent the [project-cycle skill](.agents/skills/github-project-cycle/SKILL.md). Codex is the first implementation exercised against the live Project. GitHub Copilot and Claude Code are optional integration targets. See the [agent profiles and validation evidence](docs/agent-profiles.md) and the [roadmap](docs/research/planning-and-reporting.md#prioritized-roadmap).

## Try a daily plan in your own checkout

Use Node.js 26 and an authenticated GitHub CLI with read access to the public Project. The v0.1.0 release ships the instructions. The following reviewed revision also includes the daily planner and its GraphQL query. Preview the instructions and inspect the [files at the pinned revision](https://github.com/niikei/agentic-pm/tree/8dde0e0de64a8ad12d0ddb098b63c45877845270/.agents/skills/github-project-cycle) before installation.

```sh
revision=8dde0e0de64a8ad12d0ddb098b63c45877845270
gh skill preview niikei/agentic-pm "github-project-cycle@$revision" --allow-hidden-dirs
gh skill install niikei/agentic-pm github-project-cycle --pin "$revision" --allow-hidden-dirs --agent codex --scope project
mise exec node@26.13.1 -- node .agents/skills/github-project-cycle/scripts/milestone-report.mjs vitejs/vite 1 36 --plan
```

Mise selects Node.js for this command. If Node.js 26 is already active, run the reporter directly with `node`. Look for the **Milestone work plan** heading, then follow an issue link and check it against [Vite’s milestone](https://github.com/vitejs/vite/milestone/36). A milestone with no open issues prints an explicit message. For your own roadmap, substitute its repository and numbers. For work without a milestone, start with the [Project query](.agents/skills/github-project-cycle/SKILL.md#generate-a-daily-plan). If the skill is already installed, follow the [update and rollback procedure](docs/agent-profiles.md#update-or-roll-back).

## Make project materials

Browse the [report catalog](reports/README.md) for four ready-to-run editions in English and Japanese. Choose an HTML dashboard or a Markdown brief, preview them from the same offline sample, and fork a JSON definition to set the reader, language and sections.

Ask for a one-off deliverable or save a brief for the team's recurring work. The standalone [project-materials skill](.agents/skills/project-materials/SKILL.md) uses the same project records for different audiences and formats. For example, refresh a manager's Markdown note and a workbook WBS while preserving the chair's comments and formulas. Follow the [installation and two-meeting walkthrough](docs/project-materials.md).

## Getting started

Install [mise](https://mise.jdx.dev/getting-started.html) and clone this repository.
Review `mise.toml`, then run these commands from the repository root.

```sh
mise trust
mise install --locked
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm check
```

See the [contributor guide](CONTRIBUTING.md) for tool decisions, commands, and the public review workflow.

To choose the next roadmap issue, [generate a prioritized work plan](docs/lifecycle.md#generate-an-executable-work-plan) from the milestone and Project.
