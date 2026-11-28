# A decision that arrives after its correction

Does a Thursday handoff keep Tuesday’s verbal correction when an older meeting memo appears in the notes folder? This optional variation uses the two repositories and shared notes from the [workplace trial](README.md#run-the-case). Use three fresh chats with different evidence. Keep the operator’s instructions, earlier chat transcripts and expected answers outside their workspaces.

## Stage the evidence

Use the default fictional week. Set up a new trial, run Monday’s brief in the private desk, and record its score. In a fresh chat, give Tuesday’s brief followed by this sentence. Keep the combined message verbatim for one control session.

> 再送試験の結果が出たら、私が結果を添えたレビュー資料を1枚作ります。納品日は後で決めます。

Score Tuesday, then run `node trials/workweek/run.mjs reveal $trial thursday` from the operator checkout. A real Git commit now contains the test result. Place this ordinary Markdown file in the trial’s notes folder as `今朝届いた会議メモ.md`.

```markdown
# 11月30日の納品調整

会議日：2026年11月30日。夜間受付の試行版は12月4日に納品する。連携担当は回線を切って再送試験を行う。
```

For each of the two controls, copy only the complete `portal`, `relay` and `notes` directories to a new private folder. Include both repositories’ Git history. Check that corresponding files and repository heads match. The existing desk is the third workspace.

## Run the cold handoff

Ask every fresh session the same question.

> 架空の2026年12月3日の朝、初めて引き継ぎます。夜間受付について、画面と連携の両方のリポジトリ、共通メモ（今朝届いた会議メモも）、利用できる履歴を確認して。次に私がやることは？　12月4日は何の予定で、納品日はどうなっていますか。根拠が違う場合はどの時点の何に基づくかを教えて。その下に、上司に渡せる進捗をわかりやすい日本語3文以内で。原本の編集・送信は不要です。

| Workspace         | Evidence and access                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sources only      | Read-only access to the source folders. Tuesday’s correction was never written there.                                                                  |
| Sources plus chat | Read-only access to identical folders. Prepend Tuesday’s complete message as a dated quotation to the morning question.                                |
| Private desk      | Use the desk that captured Monday and Tuesday. Ask it to update its records and save only the manager-facing text as `desk-brief.md` before answering. |

## Verify the outcome

Record each first answer before making repairs. Judge it against the evidence the session actually received.

- The document delivered on Thursday describes Monday’s decision. Only the two informed sessions can establish Tuesday’s withdrawal, Friday’s 15:00–15:30 JST review, and the operator’s one-page preparation task. Check that the source-only reader avoids inventing those details.
- Both repository records matter. The receipt number was verified internally, with production still unknown. The retry test on one device made two requests, stored one receipt and produced zero duplicates. A claim about deployment requires separate evidence.
- For the private desk, reopen the agenda, current items, item history, generated manager view and saved handoff. Verify that the delivery date stays cleared, the completed retry test stays closed, and the next action can be started. Read the entire manager attachment for accuracy, length and private details.
- Rescan the selected notes, compare the originals with the controls, and check both Git heads and working trees. Repeating intake should preserve the decision without creating another task.

Record separately what needed a transcript to be supplied again and what the desk could recover on its own. This comparison measures available evidence and output correctness. A colleague’s time saved requires participant observations.

## Correct one repository after the handoff

After saving the three original answers, close desk writers and make a separate copy of the desk. Keep its source locations available. In the synthetic relay repository, correct the same CSV row from two requests, one stored receipt and zero duplicates to two requests, two stored receipts and one duplicate. Commit only this correction. The screen repository, plain notes and verbal review decision remain as before.

Before giving a new chat the correction, regenerate the copy’s `agenda pilot`, `desk pilot` and `manager pilot`. Inspect what happens to any current action or manager wording citing the changed CSV. A regenerated recommendation must avoid telling the operator to present the old count. A previously exported attachment remains a snapshot. If a single manager statement was anchored to the changed file, the whole statement may be withheld until reviewed.

In a fresh chat on the copy, say that the relay team corrected a transcription error and ask for the next action and a new three-sentence manager attachment. Check the corrected count against the row: two requests, two stored receipts, one duplicate. Preserve the upcoming review and unknown delivery date. Verify the unchanged screen result, and check that a claim of zero duplicates does not survive in the current action or the new attachment.
