# Start from an existing notes folder

Can a cold reader answer the morning's questions from mixed notes? This optional trial compares reading the six originals directly with keeping a private work desk across two sessions. Use the [case data](case.json) in two new private folders. It contains three fictional projects, ordinary Japanese notes, and the next day's two changes. No model or external service runs in CI.

## Prepare the two arms

From the checkout, load the case in PowerShell. Choose a new scratch location outside Git. Keep the case definition, answer key, run notes and other arm out of each agent's context.

```powershell
$c = Get-Content -LiteralPath trials/existing-notes/case.json -Raw -Encoding utf8 | ConvertFrom-Json
$trial = Join-Path $env:TEMP 'existing-notes-trial'
if (Test-Path $trial) { throw 'Choose a new trial folder.' }
foreach ($arm in 'baseline', 'assisted') {
  foreach ($entry in $c.originals.PSObject.Properties) {
    $path = Join-Path (Join-Path $trial $arm) $entry.Name
    New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
    [IO.File]::WriteAllText($path, $entry.Value + "`n")
  }
}
$desk = Join-Path $trial 'desk'
node workspace/cli.mjs $desk init
foreach ($project in $c.projects.PSObject.Properties) {
  node workspace/cli.mjs $desk register $project.Name $project.Value
}
node workspace/cli.mjs $desk shared (Join-Path $trial 'assisted')
```

Open the desk in a fresh chat. Give it this November 30 request, and save its response outside both arms.

> 架空の2026年11月30日です。登録済みの共通メモフォルダにある既存のメモを読んで、3案件の作業・期限・確認事項を作業デスクに整理して。重複はまとめ、分からないものは分からないまま残し、上司向け進捗も用意して。原本は触らず、送信は不要。

Run `scan` on the assisted notes folder and save the first inventory. Change both folders in the same way. Move the training decision without editing its contents. Replace the purchasing memo at its original path.

```powershell
foreach ($arm in 'baseline', 'assisted') {
  $notes = Join-Path $trial $arm
  Move-Item -LiteralPath (Join-Path $notes $c.nextMorning.moveFrom) -Destination (Join-Path $notes $c.nextMorning.moveTo)
  [IO.File]::WriteAllText((Join-Path $notes $c.nextMorning.replace), $c.nextMorning.text + "`n")
}
```

## Ask the same morning question

Use two new sessions with no earlier transcript. Open the baseline notes read-only for the first. Open the private desk for the second and ask it to reconcile its records before answering. Both receive the same question.

> 架空の2026年12月1日の朝です。資料の整理でファイルの置き場所が変わり、訂正も入っています。今の資料で、①私が最初にすることとその期限、②その間にも進められる別案件の仕事、③返事待ち・案件不明の事項、④確定した予定と未定に戻ったことを教えて。最後に、3案件について上司にそのまま渡せる日本語3文以内の進捗を別に書いて。上司は開発ツールを見ません。原本は編集せず送信不要。

## Read the results

Record each answer before a repair. Inspect the desk's `agenda`, item histories, `manager` draft and another `scan` after reconciliation. For each surface record whether the requested facts are correct, absent or contradicted.

- Print 18 training handouts by the morning of December 2. This is the stated first action. Eighteen copies do not establish participant count.
- The operator can draft the reception guide. The procurement reply does not block it.
- The vendor quote is outstanding. The key question has no known project or contact.
- December 4 at 14:00 JST is a quote discussion. The delivery date is unknown.
- The separate three-sentence manager handoff covers all three projects and omits the personal marker and unattributed question.
- For the persistent desk, verify one active printing task, an updated citation to the relocated note and retention of the earlier path in history. Check what the next scan asks the operator to review again.

Count unplanned prompts and record any manual repairs separately. A source-only reader can answer correctly on these inputs. Compare what is retained and what has to be rediscovered. Treat any performance difference as specific to this case and these sessions.

For a historical follow-up, open another fresh read-only chat in each arm. Ask whether December 4 was confirmed on November 30, with the evidence for each dated state. The ordinary folder has the November 27 proposal and the December 1 correction. The desk also had an opportunity to record the intervening November 30 confirmation before the file was overwritten. A versioned source folder with that revision available would be a different baseline.

If a reconciled desk still lists the old training path as missing, keep that first scan as evidence. On a closed copy, tell a fresh operator which note you moved and ask it to clear the old reminder. Verify the next scan, the original history and the report again.
