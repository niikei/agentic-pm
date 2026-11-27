# Report catalog

Choose an edition, open the local gallery, or copy a definition to make a team-owned version. The examples run offline from a synthetic project snapshot. Source titles stay in their original language. The sample links to the [synthetic field notes](examples/field-notes.md).

| Edition                                                           | Reader and purpose                                                                    | Output            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------- |
| [Developer triage](definitions/developer-triage-ja.json)          | Developers checking open changes, decision flags and other work                       | Japanese HTML     |
| [Delivery review](definitions/delivery-review-en.json)            | Delivery teams inspecting the last week's merged changes and open requests            | English HTML      |
| [Weekly decision brief](definitions/manager-decisions-en.json)    | Decision makers following flagged issues and recently merged work                     | English Markdown  |
| [Weekly handoff](definitions/weekly-handoff-ja.json)              | The incoming operator checking recent deliveries and remaining work                   | Japanese Markdown |
| [Results and goal progress](definitions/manager-outcomes-ja.json) | A manager checking what changed for the business and how far each goal has progressed | Japanese HTML     |

## Browse and generate

After [setting up the checkout](../README.md#getting-started), list the definitions or generate a gallery:

```sh
mise exec -- pnpm --silent reports list
mise exec -- pnpm --silent reports gallery
```

Open the printed `index.html` path in a browser. The new local directory contains the definitions, an offline HTML view of every edition, and the native Markdown files for Markdown editions. To share the gallery with an authorized reader, keep its relative folder structure together.

Generate a single edition from the same [synthetic capture](examples/rollout.json):

```sh
mise exec -- pnpm --silent reports render manager-decisions-en
```

To compare editions on the same live evidence, capture a public GitHub repository once with an authenticated GitHub CLI. Use new output filenames when redirecting stdout. The shell opens a redirected file before the command runs.

```sh
mise exec -- pnpm --silent reports capture niikei/agentic-pm --days 7 > snapshot.json
mise exec -- pnpm --silent reports gallery --input snapshot.json
mise exec -- pnpm --silent reports render weekly-handoff-ja --input snapshot.json > handoff.md
```

For a single live read use `reports render developer-triage-ja --github OWNER/REPO`. The report is a dated snapshot. Re-run the command for a fresh observation. Generated files stay local until the user chooses a destination.

## Open a personal task desk

Generate a standalone Japanese desktop page for an operator. The [sample](examples/desk.json) is an invented task list. The command can also read the standard project snapshot or a public GitHub repository.

```sh
mise exec -- pnpm --silent reports desk > desk.html
mise exec -- pnpm --silent reports desk --github niikei/agentic-pm > repo-desk.html
mise exec -- pnpm --silent reports desk --input snapshot.json --owner LOGIN > my-desk.html
```

Open the local file. With no owner filter the desk covers all open issues and change requests in the input. An exact owner match narrows the entire page. Collapse the navigation with its chevron to give the work area more width. Select a deadline bar or workflow state to see matching tasks. The confirmation count jumps directly to the questions. Search and expand a task for its action, owner and source. The confirmation queue shows time since the recorded decision flag. Its bars are relative to the longest known wait.

A saved item may carry a calendar `dueDate` (YYYY-MM-DD), `stage` (`ready`, `active` or `waiting`), `nextAction`, and a `question` for a flagged decision. Copy these from the planning record. The next-action panel selects the earliest dated ready or active task with an explicit action and no decision flag. Undated tasks follow dated ones, with ties ordered by ID. When no such task exists, it surfaces the longest known outstanding confirmation. The seven-day chart starts on the capture's Japan calendar date. Overdue, later and undated work have separate totals.

A repository capture supplies open records, assignees and decision flags. Task deadlines and Project workflow state require a planning source. Missing fields stay visible. Re-render to refresh the local file.

### Desk design decisions

The first row pairs the next recorded action with the deadline calendar. Below it, the confirmation count opens the outstanding questions, where each row names the recorded task owner and links to evidence. The status chart uses four bars with a common baseline so a reader can compare similar counts and select the underlying work. The [UK Analysis Function chart guidance](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/) discusses bars for small category differences. These choices come from a task walkthrough. Human gaze patterns and time savings have yet to be measured.

The desk embeds the unmodified [Pretendard JP v1.3.9 variable font](https://github.com/orioncactus/pretendard/tree/5c41199ea0024a9e0b2cb31735265056e5472d76/packages/pretendard-jp/dist/web/variable/woff2) and its [SIL Open Font License](desk/fonts/LICENSE.txt) in each standalone document. This adds about 7.1 MB to the HTML and keeps Japanese, Latin and numeric text available offline. System fonts cover unsupported characters.

The root text size follows the reader's browser settings and opts into OS scaling on supporting browsers, following [Chrome's text-scale guidance](https://github.com/GoogleChrome/modern-web-guidance/blob/2b4aa13a72dd47cd135b06ce5abfccd92e19b24f/skills/modern-web-guidance/guides/accessibility/respect-os-text-scale.md). The named, reversible rail control follows the interaction in [Meta Astryx's SideNav collapse specification](https://github.com/meta/astryx/blob/41ea1657c894c0d99391b2adbfcf66ffb005a14a/docs/specs/components/SideNav/SideNavCollapseButton.spec.md). A native button implements it in the standalone page.

## Prepare a manager's outcomes brief

The recipient can open the standalone HTML file offline or print it. Each goal includes a confirmed result, progress toward its target and a dated source in plain language. The synthetic example distinguishes two sites using a new intake procedure from the effect on waiting time, which has yet to be measured.

```sh
mise exec -- pnpm --silent reports render manager-outcomes-ja > example-brief.html
```

For a real brief, add an `outcomes` array to a saved snapshot and render with `--input snapshot.json`. Use a recognizable project name. Write one observation per goal, in the reader's language, and put the most important goal first. Take `result` from a dated acceptance or operations record. For `progress`, give a comparable earlier value, current value and target when available, or describe the verified stage and what remains. Supply a shareable source locator (for example, meeting date and agenda item, or workbook tab and row) and its UTC observation time. See the [sample input](examples/rollout.json) and [source records](examples/field-notes.md#rollout-results).

Omit either claim when the evidence is missing. The brief marks it as unconfirmed. A plain GitHub capture supplies no goal observations. The renderer does not estimate business progress from closed issues or merged changes. Review the standalone file before sharing it.

## Make a variant

Start with the [design defaults](../DESIGN.md) to choose the reader’s question and how they will use the result.

Copy any definition, keep it in your own repository and edit it directly. The record is data and can be reviewed in Git. Its filename is the catalog ID when placed in `reports/definitions/`. The CLI also accepts a path outside the catalog, including a path with spaces.

```sh
mkdir -p briefs
cp -i reports/definitions/manager-decisions-en.json briefs/team.json
# Edit briefs/team.json, then render it with the same snapshot.
mise exec -- pnpm --silent reports render briefs/team.json --input snapshot.json
```

For example, change `reader` to your steering group, write a new `question` and set `sections` to `["decisions"]`. Change `format` to `"html"` for a standalone page. Copying just the file can change the relative path to its editor schema. In the example above, use `"$schema": "../reports/schemas/report-v1.json"`, or omit that optional editor hint. The CLI always checks the installed v1 schema.

| Property                      | Effect                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`               | Selects the v1 definition contract. Use Git revisions to track editions of an individual report.                                                                  |
| `title`, `reader`, `question` | Declare the audience and the question the document should answer, in the intended language. Reader is a free-text description.                                    |
| `language`, `format`          | Select English or Japanese interface labels and HTML or Markdown output. Translate the author-provided title, question and reader when making a language edition. |
| `sections`                    | Ordered, unique selection of outcomes, decisions, changes, work and deliveries. The decisions queue is a subset of open work.                                     |
| `periodDays`                  | Delivery lookback in 24-hour periods, from 1 to 90 (default 7). Open items show their state at capture.                                                           |

An editor can validate a definition against [report-v1.json](schemas/report-v1.json). The existing offline check validates and renders every bundled definition, including new files. These structured editions complement the [free-form project-materials skill](../docs/project-materials.md), which also supports writing from arbitrary records, custom templates and scoped edits to existing artifacts.

## Where to extend it

| Change                                             | Location                                                                                                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publish another edition of existing report content | Add one JSON file to [definitions](definitions). Listing and the gallery discover it automatically.                                                                                      |
| Read another system                                | Map its records into the [snapshot contract](schemas/snapshot-v1.json) and pass the JSON with `--input`. The bundled [GitHub reader](sources/github.mjs) owns API and label conventions. |
| Add a measure or locale                            | Extend the [shared report model](model.mjs) and the definition schema. Add writer labels for a locale and a test of the new behavior.                                                    |
| Add an output format                               | Render the shared model in [writers](writers), register the writer and extension, and add the format to the schema.                                                                      |
| Change shared HTML appearance                      | Edit [report.css](writers/report.css). The stylesheet is embedded in each output.                                                                                                        |

## What the evidence supports

The GitHub reader maps open issues to work items, open pull requests to change requests, and actual merge times to deliveries. A work item with the `needs decision` label appears in the decision queue. Its visible label application gives the waiting start; missing history leaves that time unknown. Assignees are reported as recorded. The decision record identifies who has approval authority. Open change requests show draft state and link to the source for current reviews and checks.

The delivery window starts at the later of the requested start and the repository's creation. A saved capture can cover a shorter period than the selected report. The output identifies partial coverage and distinguishes an unobserved interval from zero observed merges. Counts describe merged changes; evaluating user impact or developer productivity needs additional evidence.

The GitHub CLI uses paginated, read-only calls. A capture stops if a page fails, a visible inconsistency is detected, or collection exceeds 200 requests, 30 seconds per request or 16 MiB per response. GitHub reads are nontransactional; a capture cannot prove all records came from one atomic instant. Refresh if the source is changing while you collect it. Review records and linked evidence for the destination audience before sharing.
