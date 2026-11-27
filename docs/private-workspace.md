# A private work desk for scattered projects

Keep each repository, shared folder and Obsidian vault where it already lives. A project has a short ID and can refer to several directories. Projects can share a vault. Registering a directory records its location. The CLI reads selected update files and writes to a separate private workspace. GitHub issues remain authoritative for work tracked on GitHub.

Try the [three-day workplace trial](../trials/workweek/README.md) with synthetic records before connecting an employer’s sources.

## Set up on Windows

Use the [repository setup](../README.md#getting-started) for development. For daily use, an approved source checkout or extracted source archive, Node.js 26 and the pinned pnpm version from `package.json` are enough. Install only the runtime dependencies from the source directory.

```powershell
pnpm install --prod --frozen-lockfile --ignore-scripts
```

Once the pinned packages are present in the local pnpm store, the same installation also works with `--offline`. From the installed source directory, with Node on PATH, run these commands in PowerShell. Choose an existing private parent directory and a **new** workspace folder outside Git. Keep the SQLite database on a local disk with account access controls. Registered sources may be on other drives or reachable network shares.

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

The [synthetic meeting update](../workspace/examples/meeting.json) is ready to replay after registering `pilot`. Each update has a stable event ID, project and item IDs, the revision read (`base`), an observation date, a source locator, and the changed fields. The first revision supplies a title and status. Omitted fields keep their values. Use `null` to clear an optional field. Replaying the same event is safe. The full batch rolls back on a revision conflict. Read the history before reconciling an earlier observation with a later decision. Use the date of the evidence. Older material can fill an independent field. Intake holds a batch that would replace a field supported by a later observation, including a decision to clear that field. Capture the disagreement as a question if it still needs a decision. Same-day conflicts require reading the underlying sources.

A source path can match several projects. Use other explicit evidence to resolve it or capture the open question under the built-in `inbox` project. Keep an estimate with its assumptions, a confirmed deadline in `dueDate`, and the next check-in in `followUp`. Use `hypothesis` for an inference about a stakeholder and `question` for what would confirm it. Put only intentionally reader-ready wording in `managerUpdate`. Apply a correction to source systems such as GitHub only within the separate authority for that project.

When a document proposes a date or the user requests an AI forecast, keep it in `forecast`. Supply `from`, optional `through`, `origin` (`source` or `agent`) and `basis`. For example, a slide proposing December 4 can supply `{"from":"2026-12-04","origin":"source","basis":"Distribution depends on the reviewer's sign-off."}`. The agenda labels tentative dates separately. Record workbook effort in `estimate`, including its unit and staffing assumption. On confirmation, record the actual `dueDate` and clear the superseded forecast in one update.

For a fixed appointment, record `meeting` with an ISO 8601 `start` and an optional `end`, both with a timezone offset. For example, a calendar showing December 2 from 10:30 to 11:00 JST supplies `{"start":"2026-12-02T10:30:00+09:00","end":"2026-12-02T11:00:00+09:00"}`. Upcoming and ongoing meetings have their own list in the desk and agenda. Preserve an unknown purpose or project as a question. Use a work deadline only when a source confirms the delivery commitment.

## Work across code repositories

Use the project registry to select the authorized checkout for a coding task. Read its repository instructions and current changes. Run its normal tests, then record what passed with the repository, commit or file and observation date. A task can cite work in several repositories through updates to the same item. Each repository keeps its own branches and review process.

For a GitHub-managed item, inspect the native issue or PR in its repository. For example, `gh issue view ISSUE_URL --json title,state,url,updatedAt` reads an issue without a local clone. Include the selected HTTPS URL in the optional event-level `permalink` field. The private desk opens it from the evidence list, and the OKF concept includes it as a source. Recheck the native record before changing shared status. Use a stable URL intended for the reader. An agent may also use selected local files without a GitHub account or network connection.

## Recheck a note that keeps changing

For an explicitly selected local file, the agent can run `inspect` before reading it. The command returns matching project IDs and a `file` object containing the canonical path and SHA-256 fingerprint. Include that object in an update alongside a human-readable source locator, such as a heading, slide, cell or screenshot date. Intake rejects a new update if the selected file changed since inspection. Chat and pasted text can use a source label alone.

```powershell
node workspace/cli.mjs $desk inspect "C:\Notes\Work\Planning.md"
node workspace/cli.mjs $desk review
node workspace/cli.mjs $desk review pilot
```

At the next check-in, `review` compares only cited files and names the items affected by a changed, missing or unavailable source. A changed file prompts a reading of the relevant section. It can leave the work decision intact. If the evidence still supports the current value, record that value with the new fingerprint. An unavailable shared drive leaves the last recorded decision available offline. On a shared vault, the captured project determines which item needs review.

An existing OKF concept also works as a selected Markdown source. Read its body and relevant provenance, then preserve its original properties. Obsidian's [Properties documentation](https://obsidian.md/help/properties) describes Source mode for nested metadata such as the OKF source list.

## Speak a work update or organize existing notes

Open the private desk as the agent workspace. If an older desk already has customized instructions, add one line to its private `AGENTS.md`: “Use `scan` for selected note folders and `capture` for work conversations, using the current checkout's private-workspace guide.” Tell the agent, for example, “The draft went out. Printing is probably 80 copies. Order after confirmation.” Later, “They confirmed 60 copies.” Ask “What should I do next?” or “Give me two sentences for my manager.” The agent interprets the conversation, updates the same item and publishes its OKF notes. Input can come from typing or the host's dictation. The CLI accepts the agent's interpretation as data.

For old notes, select a specific registered directory. For example, “Organize the Markdown and text under my daily notes. Keep reference facts, collect next steps and show me what you could not place.” The agent inventories the directory with `scan`, reads the pending notes and submits small batches. Keep a memorable fact without a task using `status: "reference"` and `summary`. Tag a tentative date as a forecast. Give reports only verified wording. A changed file can withdraw an earlier claim: read its earlier item history before reconciling. If a date is missing, distinguish the date of intake from the unknown date of the underlying claim.

```powershell
node workspace/cli.mjs $desk scan "C:\Notes\Daily"
node workspace/cli.mjs $desk capture "$desk\batch.json"
node workspace/cli.mjs $desk bundles
```

A capture batch has two arrays: `events` uses the existing update shape, and `reviewed` contains the exact `file` receipts of notes the agent fully processed. A conversation uses an empty `reviewed` array. An irrelevant or empty note can have a receipt and zero events. The CLI verifies the fingerprints and commits events and receipts together. A second scan fingerprints eligible files again and returns only new or changed content for the agent to interpret. For each changed note, run `node workspace/cli.mjs $desk changes "C:\Notes\Daily\Minutes.md"`. In `diff` mode, use the added and removed lines with their nearby context, then consult the original heading, decision date or earlier item history as needed. The `citedBy` list identifies records whose current fields rely on this file, even across teams. Reaffirm a manager update against the new receipt only when the current source still supports it. Treat the patch as source material. A deleted line alone does not establish that work was cancelled. Both `diff` and `line-endings` return the current receipt; include it in capture only after completing the review. Previewing a change leaves it pending.

The private SQLite workspace retains the last successfully reviewed bytes of each eligible UTF-8 Markdown or text note up to 4 MiB. Backups can contain that source text. Git compares these bytes to the current file with [its standard two-file diff](https://git-scm.com/docs/git-diff), so uncommitted versions and plain folders work alike. The command uses a temporary private directory and leaves the source index and history untouched. `read` mode calls for reading the original when the previous copy is unavailable (including older digest-only receipts), the content is unsuitable, Git is unavailable or the patch exceeds 128 KiB. The next successful review stores an eligible baseline. The scan lists missing or inaccessible sources separately. A missing original does not delete its project history.

The scan includes regular `.md`, `.markdown` and `.txt` files at any depth. It skips hidden entries, linked directories and files, dependencies, private desks and marked generated bundles. Office documents and images can still be selected individually. In older snapshots with their original generated index, the scan recognizes the generated page names and can still discover adjacent personal notes. Keep any heavily modified snapshot outside the selected input folder. Originals stay in place. The agent can process one mixed note into several projects and combine repeated observations into one work item.

Capture refreshes the affected projects' recurring destinations listed by `bundles`. A project without a binding gets a private `okf-PROJECT` folder beside its database. To choose a vault destination before the first capture, bind a new project folder using `okf-refresh DIRECTORY PROJECT`. A saved update with a publication problem returns exit status 2 and lists the affected output. Resolve the conflict, then run `capture` without arguments to rebuild the desk and retry pending bundles. The existing `apply` command remains available for desk-only intake.

## Start the day or prepare a meeting

If the view cannot be written after intake, the CLI returns status 2 and lists the saved revisions. Reopen the record or resolve the output problem and run `desk` to refresh it.

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

The bound folder contains an opaque `.agentic-pm-bundle` marker. Preserve it when making a backup. A different folder at the old path stops the refresh before any new work pages are written. Older bound folders acquire a marker when a generated page still matches its saved text. Choose a fresh destination when the original folder cannot be identified.

In a [hosted Windows trial](https://github.com/niikei/agentic-pm/actions/runs/46038778262), Obsidian Desktop 1.13.4 opened the exported index and a work-item note in an existing synthetic vault. Use the built-in Quick switcher (Ctrl+O) to find them. The trial verified the active Markdown file for both selections.

For a native note table, create an [Obsidian Base](https://obsidian.md/help/bases) and filter it to this dedicated folder and the `Work Item` type. Select `title`, `x-agentic-pm-work-status`, `x-agentic-pm-due` and `x-agentic-pm-follow-up` as columns. A missing date remains empty. The work-status property describes execution, while OKF's reserved lifecycle status describes the knowledge document. Change a work decision through intake so its evidence and the desk advance together.

If you edit generated prose or its frontmatter and that record later changes, the command lists the conflict and returns status 2. A removed note also stays removed. Review a fresh `okf` snapshot alongside your edit. To accept its generated section, copy that section into the bound note, keep your own additions below it, and refresh again. Other records can still refresh. The index advances once its linked pages are ready. Finish edits to a generated note before refreshing it. If another writer interrupts a save, a `.save-…` folder can retain the original or proposed file for recovery.

Close the CLI before copying the private workspace for backup. Restore the whole folder on a local disk with the same access restrictions. Use `items` and `history` to resume from another approved session.
