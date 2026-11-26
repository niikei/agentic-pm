# agentic-pm

A reference implementation for AI-native project management with GitHub Copilot.

The project uses its own public issues, development branches, and pull requests
to demonstrate how to scope an agent's work, verify the result, and hand it to a
human reviewer. Follow work in [GitHub Issues](https://github.com/niikei/agentic-pm/issues) and on the [development board](https://github.com/users/niikei/projects/1).

## For project managers

Open the [development board](https://github.com/users/niikei/projects/1) in
your browser. Select an issue by its title to see what will count as done.
For v0.1, start with the [delivery decision](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7199295133)
to see what can proceed while Copilot intake waits. The
[candidate handoff](https://github.com/niikei/agentic-pm/issues/7#issuecomment-7199647505)
records what passed and which decisions belong to the maintainer.

To try the process on your own project, follow the
[browser walkthrough](docs/lifecycle.md#start-with-one-outcome).

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
