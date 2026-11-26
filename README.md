# agentic-pm

A reference implementation for AI-native project management with GitHub Copilot.

The project uses its own public issues, development branches, and pull requests
to demonstrate how to scope an agent's work, verify the result, and hand it to a
human reviewer. Follow work in [GitHub Issues](https://github.com/niikei/agentic-pm/issues) and on the [development board](https://github.com/users/niikei/projects/1).

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
