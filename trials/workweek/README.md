# A workplace week across two repositories

Can a new chat give the operator the right next action and a manager a usable update after a deadline changes? The first three days test intake and handoff. The full week adds fresh test evidence, a reassigned question, a limited approval and recovery on the following Monday. This case uses two local Git repositories, shared Japanese notes and a private desk. It needs no GitHub project, company files or external benchmark services. Agent inference uses the operator's approved client.

## Run the case

Use the installed repository, Node.js 26 and Git. In PowerShell, choose a **new** folder outside Git. The operator runs these commands from the agentic-pm checkout.

```powershell
$trial = Join-Path $env:TEMP 'agentic-pm-workweek-codex'
node trials/workweek/run.mjs setup $trial
node trials/workweek/run.mjs brief $trial monday
```

Open the printed **desk** directory in the client. Give it only the printed Monday request. The agent can read its guide, the installed workspace CLI and the registered sources. Keep the trial runner, answer key, future prompts and earlier chat transcripts out of its context. Use normal approval settings. Scope writes to the desk. The fixture repositories have no remotes.

Once the agent finishes, record its answer outside the desk and run the checkpoint. Continue in a fresh chat each day.

```powershell
node trials/workweek/run.mjs score $trial monday
node trials/workweek/run.mjs brief $trial tuesday
# After the Tuesday session:
node trials/workweek/run.mjs score $trial tuesday
node trials/workweek/run.mjs brief $trial wednesday
# After the Wednesday session:
node trials/workweek/run.mjs score $trial wednesday
```

Setup defaults to the fictional week starting 2026-11-30. An optional ISO Monday after the directory selects another week. Use the same date and a fresh folder for each client. Prompts establish fictional observation dates. The workspace's generated-at clock still shows actual time.

## Finish the week

From the operator checkout, reveal the Thursday inputs. This adds a synthetic retry-test CSV in a real local Git commit and a purchasing clarification in the notes folder. Only the scheduled source files are introduced. The next fresh chat receives the Thursday brief. This is the first time the operator supplies a recurring audience preference.

```powershell
node trials/workweek/run.mjs reveal $trial thursday
node trials/workweek/run.mjs brief $trial thursday
# After the session:
node trials/workweek/run.mjs score $trial thursday
node trials/workweek/run.mjs reveal $trial friday
node trials/workweek/run.mjs brief $trial friday
# After the session:
node trials/workweek/run.mjs score $trial friday
```

The operator plays the part of the two teams publishing evidence. Reveal can be retried with the same inputs. It refuses conflicting file contents or an unexpected repository revision. Do not reveal Friday until the Thursday checkpoint is recorded. The CSV simulates a device result; the local Git commit is real.

For the following Monday, close desk writers and copy the whole desk to a **new** private folder outside Git. Leave the source repositories and notes where they are. In PowerShell:

```powershell
$restored = Join-Path $trial 'resumed-desk'
if (Test-Path $restored) { throw 'Choose a new restore folder.' }
Copy-Item -LiteralPath (Join-Path $trial 'desk') -Destination $restored -Recurse
node trials/workweek/run.mjs brief $trial next-monday
# Open only $restored in a fresh chat. After its reply:
node trials/workweek/run.mjs score $trial next-monday $restored
```

On macOS or Linux, use an equivalent recursive copy into a new directory. A directory such as `old-desk/AGENTS.md` in a reply is a reason to verify which copy the client actually opened. Keep approval prompts and operator repairs in the separate run notes.

## Read the result

The scorer returns one Boolean per objective check and exits with status 1 if any check fails. It checks original source content and Git state, citations to both delivery records, unresolved inbox intake, the originally recorded deadline, its withdrawal, the offset-aware meeting time and the saved handoff's basic audience boundaries. It does not assign an overall language-quality grade. Run and keep each checkpoint before advancing the case.

Read the Wednesday file and chat reply. Record **pass**, **fail**, or **unobserved** for each judgment.

| Judgment                  | Passing evidence                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Meaning of the correction | Friday is an acceptance review, the delivery date is unknown, and the old delivery commitment does not survive in the brief or the project OKF.                                                  |
| Engineering progress      | The screen shows the receipt number in the internal environment. Integration of the retry change is distinguished from an actual disconnect-and-retry test. Production release is unverified.    |
| Next action               | The operator can reproduce the pending retry test and check for double registration. The two mentions of this work did not create competing tasks.                                               |
| Audience and uncertainty  | The handoff is at most three Japanese sentences, understandable without GitHub, and keeps the private reminder and the unidentified quotation out. The latter remains available to the operator. |

For the remaining phases also check the following outcomes by reading the source, the private desk and the audience-specific file.

| Judgment                  | Passing evidence                                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thursday test and routing | The recorded device case made two requests, stored one receipt and produced zero duplicates. Scope the finding to that case. The battery quote has one active home in supplies; the retired inbox entry still explains its history.                   |
| Friday decision           | The review took place. Up to 25 people may join the limited trial. Broad deployment and the delivery date remain undecided. Preparing the one-page operator instructions is the next action.                                                          |
| Recurring reader          | The complete file can be forwarded as written. It fits three plain-language sentences, covers both teams and leaves the operator’s personal next action in chat. Friday’s brief deliberately does not repeat Thursday’s prohibited engineering terms. |
| Restored handoff          | The new operator can draft the instructions while waiting for the reviewer assignment. The quote is waiting on the supplier separately. Preserve Friday’s decisions and avoid reopening the completed retry test.                                     |

The extended machine checks verify the staged Git change, citations to the CSV and review minutes, the intake routing, saved report files, explicit terminology and restoration of the original event histories. For Friday the scorer also flags more than three explicit Japanese sentence endings and known personal-appendix labels. Read the entire saved file for unlabeled asides or fragments. Check the scope of every approval against the source minutes.

Record client/surface, commit, scenario Monday, automated checks, reading judgments, number of **unplanned** operator prompts and a brief reason for each. Count a clarification, correction or manual repair separately from a routine tool approval. Record first-pass results before any repair. A cold handoff uses no Monday or Tuesday transcript. Local setup time, model time and human effort are separate observations. A solo synthetic trial cannot establish time saved in a managed workplace.

The original scenario borrows two evaluation ideas: completing a cross-tool handoff and testing uncertainty with mixed sources. The public examples are [TheAgentCompany's engineering report task](https://github.com/TheAgentCompany/TheAgentCompany/tree/main/workspaces/tasks/pm-present-gitlab-info-as-ppt) and [Salesforce's HERB paper](https://aclanthology.org/2025.emnlp-industry.34/). Their corpora, graders and model services are not required.

## Test a delayed restart

To test recovery across actual elapsed time, start a separate scratch desk with one cited note, one manager statement and one personal paragraph appended to its generated OKF page. Record the start time. Close the CLI between observations. Keep the synthetic source and the desk on a private filesystem.

| Elapsed minutes | Change to make                                 | What to verify in a new process                                                                    |
| --------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0               | Capture the original decision.                 | The current statement is eligible for the manager report.                                          |
| 45, 90          | Move the source aside, then restore it at 90.  | The statement disappears, then returns.                                                            |
| 135, 155        | Edit the decision, then review it at 155.      | The old wording disappears. The new wording needs a dated correction and a current source receipt. |
| 180             | Reopen the desk and restore a whole-desk copy. | The corrected statement and the hand-written paragraph survive.                                    |

At each checkpoint, retry the original event with its original ID, inspect the revision count and reopen a closed copy. A retry should preserve the latest decision. Record actual timestamps and any missed observations separately from the fictional case dates. The [backup procedure](../../docs/private-workspace.md#resume-from-a-backup) covers separately linked vaults.
