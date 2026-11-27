# Report catalog

Choose an edition, open the local gallery, or copy a definition to make a team-owned version. The examples run offline from a synthetic project snapshot. Source titles stay in their original language. The sample links to the [synthetic field notes](examples/field-notes.md).

| Edition                                                        | Reader and purpose                                                         | Output            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------- |
| [Developer triage](definitions/developer-triage-ja.json)       | Developers checking open changes, decision flags and other work            | Japanese HTML     |
| [Delivery review](definitions/delivery-review-en.json)         | Delivery teams inspecting the last week's merged changes and open requests | English HTML      |
| [Weekly decision brief](definitions/manager-decisions-en.json) | Decision makers following flagged issues and recently merged work          | English Markdown  |
| [Weekly handoff](definitions/weekly-handoff-ja.json)           | The incoming operator checking recent deliveries and remaining work        | Japanese Markdown |

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

## Make a variant

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
| `sections`                    | Ordered, unique selection of decisions, changes, work and deliveries. The decisions queue is a subset of open work.                                               |
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
