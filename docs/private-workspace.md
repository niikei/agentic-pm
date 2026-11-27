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

Use only directories approved for the selected AI session. Select a single note, meeting excerpt or screenshot for intake. A vault's settings, attachments and other notes can stay untouched. Registered paths and local work records belong in the private workspace. This repository's public Project tracks development of the tool.

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

## Read the result in Obsidian or another editor

Export an optional [Open Knowledge Format v0.3 bundle](https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md) into a **new** folder inside an authorized private vault or anywhere else you read Markdown. Open its `index.md`. Omit the final project ID to include all projects and the inbox.

```powershell
node workspace/cli.mjs $desk okf "C:\Notes\Work\Pilot snapshot 01" pilot
```

Each work item has a Markdown page, portable links from the index, and field-level source notes. The private bundle includes working hypotheses and source labels. Readers may edit or move this copy. Use a fresh destination for a later snapshot to preserve edits. Plain notes, Obsidian wikilinks and properties in other folders keep their original form. This workflow supports one-way export. Changes to an exported note can be submitted as new evidence in a later intake.

Close the CLI before copying the private workspace for backup. Restore the whole folder on a local disk with the same access restrictions. Use `items` and `history` to resume from another approved session.
