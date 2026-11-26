# Agent profiles

All profiles use the same [project-cycle skill](../.agents/skills/github-project-cycle/SKILL.md), GitHub issues, Project and approval boundaries. The skill is a Markdown file with standard name and description frontmatter. An operator can point an agent directly at the file. [Agent Skills specification](https://agentskills.io/specification)

## Codex

**Verified with Codex.** Codex read the skill by file path in the checkout and used authenticated `gh` for intake, relationships, Project status and PR handoff. To repeat with a real issue, grant the operator the necessary repository and Project access and give Codex this request:

> Read .agents/skills/github-project-cycle/SKILL.md. Resume from the parent issue and its Project. Draft a breakdown for the approved outcome, apply the authorized changes, and link the checks and milestone snapshot in the handoff.

The evidence applies to explicit file invocation. Automatic discovery was outside this trial. [Work breakdown](https://github.com/niikei/agentic-pm/issues/5#issuecomment-7205444551) · [Verification record](https://github.com/niikei/agentic-pm/issues/7)

## GitHub Copilot

**Optional, native intake trial open.** Open Copilot Chat on GitHub in a session with repository issue access. GitHub documents editable issue drafts and sub-issue trees. [GitHub's issue creation guide](https://docs.github.com/en/copilot/how-tos/copilot-on-github/copilot-for-github-tasks/use-copilot-to-create-or-update-issues)

> For OWNER/REPO#PARENT, draft a work breakdown for OUTCOME under CONSTRAINTS. Reuse matching issues. For each missing deliverable, draft a Project task with an outcome, observable acceptance criteria and public evidence. Explain dependencies. Leave owners and dates open.

Review the proposed tree for duplicates and edit the fields. Select **Review and create** for accepted sub-issues. Check the resulting parent, milestone, Project membership and Status. If the preview is unavailable, use **Issues → New issue → Project task**. The form and CLI fallback have separate evidence. A successful Copilot draft and publication still need a live trial. [Compatibility issue](https://github.com/niikei/agentic-pm/issues/3)

## Claude Code

**Unverified.** For a future trial, open the checkout in Claude Code, supply the shared skill's path and ask for a draft against a real parent issue. Record the invocation, corrections, issue relationships, board membership and PR checks before claiming end-to-end compatibility. Claude Code's skill-loading conventions are documented upstream. [Claude Code skills](https://code.claude.com/docs/en/skills)
