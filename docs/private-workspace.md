# A private work desk for scattered projects

Keep each repository, shared folder and Obsidian vault where it already lives. A project has a short ID and can refer to several directories. Projects can share a vault. Registering a directory records its location. The CLI reads selected update files and writes to a separate private workspace. GitHub issues remain authoritative for work tracked on GitHub.

## Set up on Windows

Use the [repository setup](../README.md#getting-started) or install Node.js 26 and the locked pnpm dependencies in an approved checkout. From that checkout, with the pinned Node on PATH, run these commands in PowerShell. Choose an existing private parent directory and a **new** workspace folder outside Git. Keep the SQLite database on a local disk with account access controls. Registered sources may be on other drives or reachable network shares.

```powershell
$desk = Join-Path $env:LOCALAPPDATA 'MyWorkDesk'
node workspace/cli.mjs $desk init
node workspace/cli.mjs $desk register pilot "Service pilot" "D:\Code\Service" "C:\Notes\Work"
node workspace/cli.mjs $desk register ops "Operations" "E:\Operations" "C:\Notes\Work"
node workspace/cli.mjs $desk projects
```

If a common calendar or daily-notes folder supplies evidence to many projects, register it once with `node workspace/cli.mjs $desk shared "C:\Notes\Daily"`. An agent may cite a selected file there for any registered project. The location alone leaves the destination open.

Use only directories approved for the selected AI session. Select a single note, meeting excerpt or screenshot for intake. A vault's settings, attachments and other notes can stay untouched. Registered paths and local work records belong in the private workspace. This repository's public Project tracks development of the tool.

## Open a fresh AI session

Open the private workspace folder in your approved agent. Initialization writes a local `AGENTS.md` with the CLI path and recovery commands. In a tool that reads this file automatically, start with “What should I work on today?” In another tool, select that file as context. For an older workspace, run `node workspace/cli.mjs $desk guide` once. The command preserves an existing guide. After moving the software checkout, update the CLI path in your private guide.

## Capture a change

Tell the agent what happened. For example, “From today's pilot minutes, the reading session is confirmed for December 2. Draft the instructions first. Half a day is my estimate.” The agent reads the selected evidence in an approved environment, checks current items, and prepares an update file in the private workspace. For a pasted calendar or image, identify the event and its date or ask for the unreadable detail. The CLI accepts structured updates from an agent or a person.

```powershell
node workspace/cli.mjs $desk locate "C:\Notes\Work\Planning.md"
node workspace/cli.mjs $desk items pilot
node workspace/cli.mjs $desk apply workspace/examples/meeting.json
node workspace/cli.mjs $desk history pilot reader-test
```

The [synthetic meeting update](../workspace/examples/meeting.json) is ready to replay after registering `pilot`. Each update has a stable event ID, project and item IDs, the revision read (`base`), an observation date, a source locator, and the changed fields. The first revision supplies a title and status. Omitted fields keep their values. Use `null` to clear an optional field. Replaying the same event is safe. The full batch rolls back on a revision conflict. Read the history before reconciling an earlier observation with a later decision.

A source path can match several projects. Use other explicit evidence to resolve it or capture the open question under the built-in `inbox` project. Keep an estimate with its assumptions, a confirmed deadline in `dueDate`, and the next check-in in `followUp`. Use `hypothesis` for an inference about a stakeholder and `question` for what would confirm it. Put only intentionally reader-ready wording in `managerUpdate`. Apply a correction to source systems such as GitHub only within the separate authority for that project.

For a fixed appointment, record `meeting` with an ISO 8601 `start` and an optional `end`, both with a timezone offset. For example, a calendar showing December 2 from 10:30 to 11:00 JST supplies `{"start":"2026-12-02T10:30:00+09:00","end":"2026-12-02T11:00:00+09:00"}`. Upcoming and ongoing meetings have their own list in the desk and agenda. Preserve an unknown purpose or project as a question. Use a work deadline only when a source confirms the delivery commitment.

## Recheck a note that keeps changing

For an explicitly selected local file, the agent can run `inspect` before reading it. The command returns matching project IDs and a `file` object containing the canonical path and SHA-256 fingerprint. Include that object in an update alongside a human-readable source locator, such as a heading, slide, cell or screenshot date. Intake rejects a new update if the selected file changed since inspection. Chat and pasted text can use a source label alone.

```powershell
node workspace/cli.mjs $desk inspect "C:\Notes\Work\Planning.md"
node workspace/cli.mjs $desk review
node workspace/cli.mjs $desk review pilot
```

At the next check-in, `review` compares only cited files and names the items affected by a changed, missing or unavailable source. A changed file prompts a reading of the relevant section. It can leave the work decision intact. If the evidence still supports the current value, record that value with the new fingerprint. An unavailable shared drive leaves the last recorded decision available offline. On a shared vault, the captured project determines which item needs review.

An existing OKF concept also works as a selected Markdown source. Read its body and relevant provenance, then preserve its original properties. Obsidian's [Properties documentation](https://obsidian.md/help/properties) describes Source mode for nested metadata such as the OKF source list.

## Start the day or prepare a meeting

Applying a batch refreshes the portfolio's `desk.html` in the private workspace. Open this file on the laptop. The first card links to the task and its dated evidence. The deadline chart counts confirmed deadlines. A separate list shows follow-ups, including requests for clarification. Refresh the desk at the start of a new day to advance the Tokyo date. Each project can also have its own desk.

```powershell
node workspace/cli.mjs $desk desk
node workspace/cli.mjs $desk desk pilot
node workspace/cli.mjs $desk agenda
node workspace/cli.mjs $desk manager pilot
```

Ask the agent “What might I forget?” or “What should I raise in the meeting?” The `agenda` command gives it the recorded next action, due follow-ups, item estimates, questions and labeled hypotheses. The default shows up to three entries per section and counts any additional entries. Use `agenda --all` for the full agenda, including other actionable items. Equally dated candidates are identified as tied. Open task history to check an assumption. The agent can use a selected meeting's purpose to choose which of those questions belong in that meeting.

The `manager` command writes a separate Markdown draft using only current, explicitly prepared manager wording and observation dates. A later item update retires earlier wording until it is reaffirmed. When the wording cites a local file, generation rechecks its fingerprint. The terminal identifies any withheld items whose wording needs another look. The inbox and private citations stay in the personal views. Review the draft before sharing. Copy a generated view before making manual edits; re-running its command replaces that view.

## Read the result in Obsidian or another editor

Export an optional [Open Knowledge Format v0.3 bundle](https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md) into a **new** folder inside an authorized private vault or anywhere else you read Markdown. Open its `index.md`. Omit the final project ID to include all projects and the inbox.

```powershell
node workspace/cli.mjs $desk okf "C:\Notes\Work\Pilot snapshot 01" pilot
```

Each work item has a Markdown page, portable links from the index, and field-level source notes. The private bundle includes working hypotheses and source labels. Readers may edit or move this copy. Use a fresh destination for a later snapshot to preserve edits. Plain notes, Obsidian wikilinks and properties in other folders keep their original form. This workflow supports one-way export. Changes to an exported note can be submitted as new evidence in a later intake.

For a stable link from your existing daily notes, bind a **new, dedicated** subfolder to one project with `okf-refresh`. The agent can use `bundles` to recover the destination and run the same command after later intake. The workspace remembers the last generated text. It preserves text you append after a generated note, including a personal memo or wikilinks, and leaves unrelated files alone.

```powershell
node workspace/cli.mjs $desk okf-refresh "C:\Notes\Work\Pilot desk" pilot
```

If you edit generated prose or its frontmatter and that record later changes, the command lists the conflict and returns status 2. A removed note also stays removed. Review a fresh `okf` snapshot alongside your edit. To accept its generated section, copy that section into the bound note, keep your own additions below it, and refresh again. Other records can still refresh. The index advances once its linked pages are ready. Finish edits to a generated note before refreshing it. If another writer interrupts a save, a `.save-…` folder can retain the original or proposed file for recovery.

Close the CLI before copying the private workspace for backup. Restore the whole folder on a local disk with the same access restrictions. Use `items` and `history` to resume from another approved session.
