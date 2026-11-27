# Design defaults

Use these defaults when creating or revising a dashboard, report or project document. An explicit reader request or team template takes precedence on presentation. Keep recurring choices in the team's brief or edition definition so the next update preserves them.

## Start with the reader's task

Identify who opens the artifact, where they read it, which question brings them there and what they can do with the answer. Put that answer first. Use the next level of detail for the comparison, decision or evidence the reader needs.

| Reader and setting                  | First thing to show                                                | Where the reader goes next                                                                       |
| ----------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Operator starting work on a laptop  | Next actionable task and its deadline                              | Select a busy day to see the tasks due, or open a pending question to find the owner and source. |
| Manager reading a weekly attachment | What changed for the business and how far each goal has progressed | Read the remaining gap and dated evidence on the same page, including when progress is unknown.  |

## Separate evidence, edition and presentation

- **Evidence.** Map source-specific fields into the shared snapshot. Calculate dates, counts and ordering in the model so the chart and its underlying rows agree. Keep unknown values distinct from observed zero.
- **Edition.** Put the reader, question, language, format and section order in a [report definition](reports/schemas/report-v1.json) or a writing brief. Copy the nearest edition for a new audience. A different grouping or language preserves the underlying work IDs.
- **Presentation.** Keep layout, typography and interaction in the writer or screen that owns them. Reuse a shared model across formats. Use the [catalog extension guide](reports/README.md#where-to-extend-it) to locate the relevant code.

## Choose the visual form

Use a table for exact lookup, aligned bars for comparing counts, and a dated axis for change over time. A pie chart suits a question about a dominant share of a known whole. Give values, units, reporting scope and cutoff where they affect interpretation. In an interactive view, let readers go from a count to the matching records.

For a new Japanese–English web interface, prefer one family that covers both scripts. Pretendard JP is the desk reference. Use size, weight and spacing to distinguish the primary action, body and metadata. Pair status colors with text. Respect the reader's text size and the destination's font and file-size constraints. See the [desk implementation notes](reports/README.md#desk-design-decisions) for font licensing, offline size and the specific Google and Meta guidance applied.

Give repeated navigation enough space for meaningful labels. When a rail competes with the work area, provide a named keyboard-operable control to collapse and restore it. For a one-page brief, headings usually provide enough navigation.

## Review it in use

Open the actual output at the intended size. Follow one realistic task from the first visible answer to its evidence or next action. For an interactive chart, compare a selected value with its filtered rows and repeat by keyboard. For a forwarded brief, check that the recipient can understand the result with only the attachment. Try missing evidence and long mixed-language text. Report what the walkthrough verified and reserve claims about gaze or time saved for observed user sessions.
