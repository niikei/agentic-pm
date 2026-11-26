# Planning and reporting experiments

Baseline: combined candidate `32e2ccb`. The live reads below were made on 2026-11-27 JST. The workshop and library are fictitious. Only the research outcome and its review use the live Project. [Adoption decisions and roadmap](planning-and-reporting.md)

## Workshop planning and an interrupted handoff

**Repeat the planning task.** Give a fresh planner this brief: “A PM needs a public workshop schedule and a volunteer check-in guide. Both need the final accessibility contact route, which awaits a sponsor decision. Draft the smallest actionable issue plan. Give acceptance criteria, dependencies and work that can proceed. Now the morning room is unavailable, an afternoon room is confirmed, and only the sponsor may change the advertised time. What can advance, what needs asking, and how should a replacement resume?” In a separate run, assign one planner to each document with the same facts. Keep the drafts offline and prevent workers from contacting each other. Score observable outcomes, the sponsor boundary and duplicated questions.

| Observed in one run per arrangement | Single planner                                                                                                     | Two parallel workstream planners                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Proposed tracking                   | Three issues: decision, schedule and guide                                                                         | One deliverable issue per planner. Both referred to a shared decision record.                                               |
| Acceptance                          | Checked approved room/time/route against both documents; included an ordinary arrival and an accessibility inquiry | Schedule owner checked slot/room/route. Guide owner proposed both volunteer walkthroughs and cross-checking the schedule.   |
| Response to lost room               | Prepare afternoon draft, consider a replacement morning room, publish after sponsor decision                       | Both advanced a draft and retained the sponsor gate. Both proposed the same two sponsor questions.                          |
| Observable coordination             | One assignment and one plan returned                                                                               | Two assignments and two plans returned. Zero direct peer exchanges. The coordinator had to reconcile the duplicate request. |

These are real agent outputs on synthetic inputs. Worker count, prompts and context differed: the parallel workers also had repository-session context. There were no real sponsor contacts, GitHub issue creations or model-time measurements in either arm. One shared question would cover two distinct approvals. Faster delivery, better estimates and fewer human decisions cannot be inferred from the number of assignments.

**Compare issue size.** For a deterministic pencil-and-paper replay, give each of two documents three steps: outline, draft, verify. Count one creation, one manual move to In Progress and one closure per issue. Assume board membership and Done automation already work. Keep the same six steps and the sponsor decision in every policy.

| Simulated policy          | Issues | Lifecycle actions | Inter-issue ordering links to express both three-step chains | What a PM loses or gains                                                                                             |
| ------------------------- | -----: | ----------------: | -----------------------------------------------------------: | -------------------------------------------------------------------------------------------------------------------- |
| One issue, six checkboxes |      1 |                 3 |                                                            0 | One review surface. Board status cannot distinguish a finished guide from a waiting schedule.                        |
| One issue per deliverable |      2 |                 6 |                                                            0 | Separate owners and acceptance. Local steps stay in their document's issue.                                          |
| One issue per step        |      6 |                18 |                                                            4 | Each handoff is visible. Four edges and six statuses need maintenance even when the same two people do all the work. |

The counts exclude checkbox edits, work itself, publication, sponsor discussion and review time. They estimate admin operations under a declared policy. Six issues could be appropriate if all six steps had distinct handoffs. For this workshop, the two-output arrangement saves twelve modeled lifecycle actions against the six-issue policy and keeps the independent handoff visible.

**Repeat the interruption.** Use a disposable directory with a pending decision in `decision.md`. Give one writer `schedule.md` and the other `guide.md`. Tell both to mark the drafts for internal review and leave unapproved details pending. Require session order in the schedule and ordinary check-in plus accessibility handling in the guide. After both writers stop, append the simulated sponsor reply: “Approved slot: 14:00–15:00 UTC. Confirmed room: Cedar. Approved public accessibility route: Welcome desk. Internal rehearsal only.” Start a fresh worker with just those three files. Ask it to reconcile the drafts and retain both walkthroughs and the session order. To replay the final field check from that directory:

```sh
for file in schedule.md guide.md; do
  for detail in '14:00–15:00 UTC' 'Cedar' 'Welcome desk'; do
    grep -Fq "$detail" "$file" || exit 1
  done
done
```

Observed: the two writers produced separate drafts with pending fields. The replacement worker received no chat history from them, read the decision, updated both documents and retained their internal-rehearsal scope. An independent substring check found the three agreed values and the rehearsal marker in both files. The worker also checked the session order and volunteer paths. One scripted decision entry unblocked two outputs; no agent changed the advertised time on its own. A board status of In Progress would contain none of the three approved values. This was a file-based simulation of an issue handoff, with no competing edits or real sponsor wait.

## Library pickup pilot

Run the offline fixture from the research branch:

```sh
mise exec -- node docs/research/library-pickup.mjs
```

The fixture has four milestone issues: a parent, its two open children and a poster task closed as not planned. An open PR also belongs to the milestone. Confirmation of staffed hours is missing from the board and blocks publication. The [fixture](library-pickup.mjs) models board membership and mixed-item totals, then executes the candidate's actual renderer with the same issue records.

| Question                                | Result                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which issues appear on the board?       | Three titles, including the closed poster task. The off-board confirmation is missing.                                                               |
| How much is open on the milestone?      | Four items: three issues and one PR.                                                                                                                 |
| What does the detailed report preserve? | Three open issues, one closed, one with open blockers, the off-board confirmation, zero of two child issues completed and the poster closure reason. |
| What does any count omit?               | Why staffed hours await confirmation, who can decide, and whether the preparatory work can continue. Record these in the issue.                      |

The fixture makes no API calls. The renderer's existing tests also cover truncated Project memberships, multi-page completeness and refusal of private inputs. Run `mise exec -- node --test test/milestone-report.test.mjs`. No simulated result establishes the permissions or the throughput of a hosted integration.

## Live reporting and latency

With GitHub CLI 2.97.0, an authenticated reader and the pinned toolchain, run these from the candidate or research branch. Scope the board to issues in this repository and milestone. Review exports locally; other deployments can have multiple Project memberships.

```sh
gh api repos/niikei/agentic-pm/milestones/2 --jq '[.open_issues,.closed_issues]'
gh project item-list 1 --owner niikei --limit 100 \
  --query 'repo:niikei/agentic-pm is:issue milestone:"v0.1 reference implementation"' \
  --format json --jq '.items[]|[.content.number,.status]'
gh issue list -R niikei/agentic-pm --state all --limit 100 \
  --milestone 'v0.1 reference implementation' \
  --json number,blockedBy,subIssuesSummary,projectItems
mise exec -- node scripts/milestone-report.mjs niikei/agentic-pm 1 2
```

Each timing covers one whole successful command including local startup and network. Ran each five times serially, rotating the first command each round, discarding stdout for timing and using a monotonic clock. Times in milliseconds, in execution order within each row:

| Read                  | Five observations            | Median | Scope checked in a separate untimed read                                                                                        |
| --------------------- | ---------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------- |
| Native milestone API  | 452, 505, 544, 375, 585      |    505 | Seven open, zero closed. The two PRs count.                                                                                     |
| Native filtered board | 1181, 1428, 1495, 1108, 1380 |   1380 | Five issue rows, all In Progress. The returned fields did not give the open blocker count.                                      |
| Native issue list     | 768, 1004, 774, 830, 832     |    830 | Same five issues. #7 listed open #3 and #6. #5 had three children, #6 one. Membership export included Project title and status. |
| Candidate report      | 621, 722, 629, 905, 687      |    687 | Five open, zero closed, one with open prerequisites. #7 had two. #3 had zero even though Copilot access was still pending.      |

The milestone flag takes the full title here. Trying the shorthand `v0.1` returned an empty issue list. The board's default limit is 30 and this CLI comparison explicitly capped both lists at 100. The candidate paginates milestone issues, checks repository/Project visibility on every page, verifies count and unique issue numbers, and identifies the Project by ID. It reports unknown membership when its membership page is truncated. It cannot guarantee a transactional snapshot if state changes between reads. A single CLI export matched the small live dataset, but replacing the publication path would require preserving those conditions and the closed-as-not-planned distinction. [Candidate source](https://raw.githubusercontent.com/niikei/agentic-pm/32e2ccbcd5de33da8708992b458cd5c0385d7517/scripts/milestone-report.mjs)

That last row exposed a presentation problem in a standalone snapshot. The PM guide PR adds a sentence explaining that blocker counts cover linked issues and that access or decisions can be pending. We ran the candidate and revised reporter against the live milestone in succession. Removing that one sentence and its blank line made the outputs byte-identical. [Report revision](https://github.com/niikei/agentic-pm/commit/21ad306)

The earlier hosted digest run took ten seconds from run creation to last update and seven seconds from job start to completion. Its report step took four seconds. This is one observed event, with no measured event-to-run queue delay. A PM interested only in the current total can open the milestone directly. Network samples and Actions job duration do not measure the time it takes a person to understand a decision. [Run](https://github.com/niikei/agentic-pm/actions/runs/45870332516)

## First visit and return after an interruption

Give two fresh readers one entry point each, the [baseline README](https://raw.githubusercontent.com/niikei/agentic-pm/32e2ccbcd5de33da8708992b458cd5c0385d7517/README.md) or the [guide revision](https://raw.githubusercontent.com/niikei/agentic-pm/cff8851cf09ae4d35b8a770955ec225e49da3c2c/README.md). Permit links reachable from the text, cap the search at eight page opens, and forbid installations. Ask for the work that can proceed during the intake block, proof that the combined candidate passed, and the merge/release decision owner. Require a link supporting each answer.

| Observed route                                           | Distinct pages opened | Answers supported | PM shell setup commands |
| -------------------------------------------------------- | --------------------: | ----------------: | ----------------------: |
| README → Issues index → #5 → #7 → hosted check           |                     5 |               3/3 |                       0 |
| README → decision in #5 and handoff in #7 → hosted check |                     4 |               3/3 |                       0 |

Both recovered #6 as independent work, the successful comprehensive check at `32e2ccb`, and the maintainer as decision owner. Both reached the evidence within the cap. The readers used read-only proxies for browser pages. The baseline reader recovered from a local parser failure using the GitHub CLI. We separately fetched the public Project page without credentials and found the intake title and In Progress in its HTML. A human browser task, screen-reader experience, click latency, first-time sign-in and live issue submission remain unmeasured.

The four commands in the candidate's setup block serve contributors. The browser guide makes the existing zero-install PM path easier to find. For a separate developer setup check, the six pinned tools were already installed. We measured two frozen installs in fresh directories on macOS arm64. With an empty pnpm store, pnpm downloaded all 90 packages in 2.18 seconds wall time. The second install reused 90 packages and finished in 0.11 seconds. Each result is one observation. Tool downloads, account setup and a new machine's first installation remain unmeasured.

To repeat from the checkout, use one new temporary directory for both installs. Measure each pnpm invocation including process startup.

```sh
trial=$(mktemp -d)
for pass in first second; do
  mkdir "$trial/$pass"
  git show 32e2ccb:package.json > "$trial/$pass/package.json"
  git show 32e2ccb:pnpm-lock.yaml > "$trial/$pass/pnpm-lock.yaml"
  time mise exec -- pnpm --dir "$trial/$pass" install --frozen-lockfile --store-dir "$trial/packages"
done
```
