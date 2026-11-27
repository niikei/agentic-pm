# Agent profiles

All profiles use the same [project-cycle skill](../.agents/skills/github-project-cycle/SKILL.md), GitHub issues, Project and approval boundaries. The skill is a Markdown file with standard name and description frontmatter. An operator can point an agent directly at the file. [Agent Skills specification](https://agentskills.io/specification)

## Install in another repository

From the destination Git checkout, use GitHub CLI's project-scoped installer. Replace `REVIEWED_COMMIT` with the full commit SHA you intend to adopt. Preview the skill and review its source before installation. The hidden-directory flag includes this repository's `.agents/skills` directory in the search. [GitHub CLI installation reference](https://cli.github.com/manual/gh_skill_install)

```sh
gh skill preview niikei/agentic-pm github-project-cycle@REVIEWED_COMMIT --allow-hidden-dirs
gh skill install niikei/agentic-pm github-project-cycle --pin REVIEWED_COMMIT --allow-hidden-dirs --agent codex --scope project
gh skill list --agent codex --scope project --json skillName,version,pinned
```

The installed skill includes read-only commands for a handoff using an issue, its Project and its PR. For a full milestone snapshot in the reference checkout, use the [milestone reporter](lifecycle.md#verify-a-milestone-snapshot).

## Codex

**Verified with Codex.** Codex read the skill by file path in the checkout and used authenticated `gh` for intake, relationships, Project status and PR handoff. To repeat with a real issue, grant the operator the necessary repository and Project access and give Codex this request:

> Read .agents/skills/github-project-cycle/SKILL.md. Resume from the parent issue and its Project. Draft a breakdown for the approved outcome, apply the authorized changes, and link the checks and milestone snapshot in the handoff.

In a fresh Git repository containing only the installed skill, Codex's native skill list found `github-project-cycle` enabled at repository scope. The skill's commands recovered the live parent, child, board status and PR checks. This verifies discovery and explicit use. Automatic selection from a natural-language request remains untested. [Portability trial](https://github.com/niikei/agentic-pm/issues/20) · [Original issue-to-PR cycle](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7205444551)

## GitHub Copilot

**Optional, native intake trial open.** Open Copilot Chat on GitHub in a session with repository issue access. GitHub documents editable issue drafts and sub-issue trees. [GitHub's issue creation guide](https://docs.github.com/en/copilot/how-tos/copilot-on-github/copilot-for-github-tasks/use-copilot-to-create-or-update-issues)

> For OWNER/REPO#PARENT, draft a work breakdown for OUTCOME under CONSTRAINTS. Reuse matching issues. For each missing deliverable, draft a Project task with an outcome, observable acceptance criteria and public evidence. Explain dependencies. Leave owners and dates open.

Review the proposed tree for duplicates and edit the fields. Select **Review and create** for accepted sub-issues. Check the resulting parent, milestone, Project membership and Status. If the preview is unavailable, use **Issues → New issue → Project task**. The form and CLI fallback have separate evidence. A successful Copilot draft and publication still need a live trial. [Compatibility issue](https://github.com/niikei/agentic-pm/issues/3)

## Claude Code

**Unverified.** For a future trial, open the checkout in Claude Code, supply the shared skill's path and ask for a draft against a real parent issue. Record the invocation, corrections, issue relationships, board membership and PR checks before claiming end-to-end compatibility. Claude Code's skill-loading conventions are documented upstream. [Claude Code skills](https://code.claude.com/docs/en/skills)
