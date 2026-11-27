# agentic-pm

An agent-agnostic reference implementation for AI-native project management on GitHub. GitHub Issues hold the work breakdown, acceptance criteria and decisions. GitHub Projects tracks delivery status. An agent can resume work from those records using the standard GitHub CLI.

## Follow a delivery

Start with the [development board](https://github.com/users/niikei/projects/1). Open an issue to see its outcome, dependencies and review evidence. The [v0.1 scope](https://github.com/niikei/agentic-pm/issues/5) and [candidate handoff](https://github.com/niikei/agentic-pm/issues/7) show the process on this repository.

To try it, follow the [browser walkthrough](docs/lifecycle.md) or give your agent the [project-cycle skill](.agents/skills/github-project-cycle/SKILL.md). Codex is the first implementation exercised against the live Project. GitHub Copilot and Claude Code are optional integration targets. See the [agent profiles and validation evidence](docs/agent-profiles.md) and the [roadmap](docs/research/planning-and-reporting.md#prioritized-roadmap).

To use the skill in another repository, follow the [project-scoped installation](docs/agent-profiles.md#install-in-another-repository).

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
