# Contributing

## Local development

Follow [Getting started](README.md#getting-started). CI uses mise 2026.11.7.
The tool lock covers Linux x64 and macOS arm64. With mise activated in your
shell, you can omit `mise exec --` from these commands.

| Command                    | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `mise exec -- pnpm format` | Apply Biome formatting. Review the diff before staging.                                    |
| `mise exec -- pnpm lint`   | Run Biome, markdownlint-cli2, actionlint, and offline zizmor audits.                       |
| `mise exec -- pnpm test`   | Run the Node test suite, including the frontmatter and Mermaid regression test.            |
| `mise exec -- pnpm check`  | Verify formatting, lint, local links and anchors, staged and committed secrets, and tests. |

Stage new files before the final check so Gitleaks scans their contents. CI
fetches the full Git history. Lychee runs offline to keep PR results independent
of external site availability. Open new external references when reviewing them.

Pin tools in `mise.toml` and regenerate `mise.lock` with `mise lock`. Pin
JavaScript dependencies in `package.json` and refresh `pnpm-lock.yaml` with
`mise exec -- pnpm install`. When upgrading pnpm, update both version pins.
Review lockfile changes and run the frozen install and checks before submitting.

## Formatting and diagrams

Biome 2.6.9 formats GitHub Flavored Markdown, YAML, JSON, and JavaScript.
Enable its frontmatter parser so formatting preserves agent metadata. Biome
formats Issue Forms and workflows as YAML and preserves the contents of Mermaid
fences. This coverage allows the repository to use one formatter.
See [Biome language support](https://biomejs.dev/introduction/language-support/).

Use one H1, unique headings, and consecutive heading levels in each Markdown
document. markdownlint-cli2 checks these conventions and Lychee checks local
heading links across files. Install the recommended VS Code extensions to use
the workspace formatter on save. Use Mermaid for small embedded diagrams and
D2 source for complex architecture diagrams. Preview diagram changes when
reviewing their meaning.

## Public review workflow

```mermaid
flowchart LR
    Issue[Issue with acceptance criteria] --> Branch[Development branch]
    Branch --> PR[Pull request with evidence]
    PR --> Checks[Repository checks]
    Checks --> Review[Human review]
```

Use a GitHub issue for each independently verifiable outcome. Use the Project
for status, milestones for agreed phases, and GitHub's sub-issue and dependency
relationships when work needs to be split or sequenced. Keep progress and
recovery notes on the issue. Include the branch, PR, last verified result,
blocker, and next action when handing over a long-running task.

Link the issue from the PR with `Closes #<number>`. Describe what changed and
how a reviewer can reproduce the result. Distinguish verified results,
hypotheses, proposals, and known limitations in public updates. Follow the
[agent approval rules](AGENTS.md#human-approval).

Write public documentation, comments, issues, PRs, and commits in English.
Keep commits atomic. Prefix concise imperative subjects with ✨ for features,
🐛 for fixes, 📝 for documentation, ♻️ for refactoring, 🚿 for cleanup,
✅ for tests, 🔧 for configuration, 🔒 for security, or 👷 for CI/CD.
