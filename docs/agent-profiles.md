# Agent profiles

All profiles use the same [project-cycle skill](../.agents/skills/github-project-cycle/SKILL.md), GitHub issues, Project and approval boundaries. The skill includes Markdown instructions with standard frontmatter and a read-only milestone reporter. An operator can point an agent directly at the file. [Agent Skills specification](https://agentskills.io/specification)

## Install in another repository

From the destination Git checkout, use GitHub CLI's project-scoped installer. Replace `REVIEWED_COMMIT` with the full commit SHA you intend to adopt. Preview the instructions and inspect all files in the skill directory at that commit, including the JavaScript and GraphQL query, before installation. The hidden-directory flag includes this repository's `.agents/skills` directory in the search. [GitHub CLI installation reference](https://cli.github.com/manual/gh_skill_install)

```sh
gh skill preview niikei/agentic-pm github-project-cycle@REVIEWED_COMMIT --allow-hidden-dirs
gh skill install niikei/agentic-pm github-project-cycle --pin REVIEWED_COMMIT --allow-hidden-dirs --agent codex --scope project
gh skill list --agent codex --scope project --json skillName,version,pinned
```

From the destination root, use Node.js 26 and an authenticated `gh` with read access to the public Project. The example selects the runtime for one command with mise. If Node.js 26 is already active, run the reporter directly with `node`.

```sh
mise exec node@26.13.1 -- node .agents/skills/github-project-cycle/scripts/milestone-report.mjs vitejs/vite 1 36 --plan
```

Verify that the output starts with **Milestone work plan** and links to the requested Project and milestone. Compare an issue in the plan with its GitHub record. A milestone with no open issues prints a message below the heading. Substitute your repository, Project number and milestone number for subsequent runs.

Commit the installed directory so the team can review and reproduce the chosen version. Keep team-specific instructions in the destination's own `AGENTS.md`.

## Update or roll back

Start on an update branch with a clean working tree. Commit or save local edits first. In a consumer trial, reinstalling with `--force` overwrote a customized file but retained files absent from the selected revision. The CLI reported the requested pin even with the extra files present.

Preview the new commit and review its skill sources. Move the installed copy into a temporary directory, then install into the empty destination. Keep the backup until the updated plan works. If installation fails, move the partial copy aside and restore the backup.

```sh
backup_dir=$(mktemp -d)
mv .agents/skills/github-project-cycle "$backup_dir/"
gh skill install niikei/agentic-pm github-project-cycle --pin REVIEWED_COMMIT --allow-hidden-dirs --agent codex --scope project
gh skill list --agent codex --scope project --json skillName,version,pinned
git add -A -- .agents/skills/github-project-cycle
git diff --cached -- .agents/skills/github-project-cycle
```

Compare intentional customizations with the backup and reapply the ones you need. Review the final staged changes, including removals. Check that `gh skill list` reports the intended version and `pinned: true`. Rerun the plan and commit the skill update separately.

To roll back a committed update, run `git revert UPDATE_COMMIT` on a branch, resolve any conflicts with later edits, and review the resulting pin and directory contents. This also removes files introduced by that update. Repeat the previous version's documented check. Versions that predate the bundled reporter support the individual issue and PR commands in their installed instructions.

## Codex

**Verified with Codex.** Codex read the skill by file path in the checkout and used authenticated `gh` for intake, relationships, Project status and PR handoff. To repeat with a real issue, grant the operator the necessary repository and Project access and give Codex this request:

> Read .agents/skills/github-project-cycle/SKILL.md. Resume from the parent issue and its Project. Draft a breakdown for the approved outcome, apply the authorized changes, and link the checks and milestone snapshot in the handoff.

In a fresh Git repository containing only the installed skill, Codex's native skill list found `github-project-cycle` enabled at repository scope. The skill's commands recovered the live parent, child, board status and PR checks. [Portability trial](https://github.com/niikei/agentic-pm/issues/20) · [Original issue-to-PR cycle](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7205444551)

In a read-only trial with two local GitHub captures, Codex CLI selected and read the installed skill for a handoff request that omitted its name. It correctly recovered the issue state and milestone at the requested cutoff. A separate creation-date lookup returned the correct timestamp without reading the skill. See the tested CLI build, prompts and scope in the [implicit selection trial](https://github.com/niikei/agentic-pm/issues/68#issuecomment-7213980816).

## GitHub Copilot

**Optional, native intake trial open.** Open Copilot Chat on GitHub in a session with repository issue access. GitHub documents editable issue drafts and sub-issue trees. [GitHub's issue creation guide](https://docs.github.com/en/copilot/how-tos/copilot-on-github/copilot-for-github-tasks/use-copilot-to-create-or-update-issues)

> For OWNER/REPO#PARENT, draft a work breakdown for OUTCOME under CONSTRAINTS. Reuse matching issues. For each missing deliverable, draft a Project task with an outcome, observable acceptance criteria and public evidence. Explain dependencies. Leave owners and dates open.

Review the proposed tree for duplicates and edit the fields. Select **Review and create** for accepted sub-issues. Check the resulting parent, milestone, Project membership and Status. If the preview is unavailable, use **Issues → New issue → Project task**. The form and CLI fallback have separate evidence. A successful Copilot draft and publication still need a live trial. [Compatibility issue](https://github.com/niikei/agentic-pm/issues/3)

## Claude Code

**Unverified.** For a future trial, open the checkout in Claude Code, supply the shared skill's path and ask for a draft against a real parent issue. Record the invocation, corrections, issue relationships, board membership and PR checks before claiming end-to-end compatibility. Claude Code's skill-loading conventions are documented upstream. [Claude Code skills](https://code.claude.com/docs/en/skills)
