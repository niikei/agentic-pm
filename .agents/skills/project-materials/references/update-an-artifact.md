# Refresh part of an existing deliverable

Identify the exact file and editable scope. Match a task by its stable work ID, a slide by its identity or verified heading, and a text section by its heading and context. Row and slide positions can move. Preserve unrelated sections, sheets, comments, formulas, layout and manually maintained columns. A template supplies structure; a previous report also contains dated claims that need rechecking.

Compare three versions when they are available: the last generated content, the current human-edited artifact, and the proposed refresh. An agreed prior revision in Git or the file editor's version history works as the baseline. A private working copy is enough for an unversioned trial.

| Current value and proposed value                       | Action inside the editable scope                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Current equals the baseline                            | Apply the newly supported change.                                                                                                      |
| Proposed equals the baseline or already equals current | Keep the current value.                                                                                                                |
| Both changed differently since the baseline            | Preserve the current value and report the location, the competing change and its source. Apply independent updates elsewhere.          |
| Baseline unavailable                                   | Make only edits explicitly identified by the user or otherwise demonstrably safe. Offer the rest as a separate draft or targeted diff. |

For text in Git, a three-way diff can help identify overlapping edits. For a workbook, compare actual cells and formulas for the same ID. For slides, update the agreed content inside the existing slide. A change of source unit, reporting period or meaning can conflict even when the text edits touch different lines.

Prepare and verify changes on a copy or in the editor's revision system. Before replacing an existing artifact, recheck that the version read is still current. Use a conditional save when the store supports one. If the source advanced or the editor cannot safely replace it, keep the verified candidate separately or reapply the comparison to the newer version. Retrying an unchanged input should preserve the existing result without adding duplicate rows, sections or new decisions.

## Compare editable fields with Node.js

When several independently editable fields share an artifact, the bundled [comparison command](../scripts/plan-updates.mjs) applies the table above to JSON values. Run it from the installed directory containing `SKILL.md`. Pass only fields inside the requested edit scope. This optional command reads standard input and writes a plan to standard output.

```sh
node scripts/plan-updates.mjs <<'JSON'
[
  {"id":"WBS/B/status","baseline":"Scheduled","current":"Scheduled","proposed":"Ready"},
  {"id":"Report/decision","baseline":"Pending","current":"Chair requested a call","proposed":"Deferred"},
  {"id":"Report/attendance","current":4,"proposed":5}
]
JSON
```

This yields `apply` with the new status, then two `review` results. A JSON `null` can represent a known blank cell. Omit `baseline` when the prior value is unknown. Use a consistent representation across versions, including units and formulas where relevant. Each ID must appear exactly once. The writer handles the format, version check and scoped save; keep or review results preserve the current field.
