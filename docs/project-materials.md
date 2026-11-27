# Project materials

Use a one-off request or a saved writing brief to turn project records into a deliverable. A team can use the same decision to update a manager's meeting note, a customer presentation and a site-by-site WBS. Each artifact can have its own reader, language, level of detail, format and destination.

## Install in a consumer checkout

Review the [skill, starter brief and comparison command at the pinned revision](https://github.com/niikei/agentic-pm/tree/5270f88bbae72a3ed048392815bbea4f7eb8cfe0/.agents/skills/project-materials). From your destination Git checkout, run:

```sh
revision=5270f88bbae72a3ed048392815bbea4f7eb8cfe0
gh skill preview niikei/agentic-pm "project-materials@$revision" --allow-hidden-dirs
gh skill install niikei/agentic-pm project-materials --pin "$revision" --allow-hidden-dirs --agent codex --scope project
```

For a recurring meeting, copy the starter to a team-owned location. Choose where your team can keep the brief and underlying sources. In a private project, use an authorized private destination.

```sh
mkdir -p briefs
cp -i .agents/skills/project-materials/assets/weekly-meeting.md briefs/manager.md
```

Then ask: “Use our manager brief and the last two meeting records. Draft this week's Markdown file in the meeting folder. This week only, write in Japanese and limit the changes to three bullets. Keep the chair's notes.” For a different audience, copy the brief and change what that reader can see and do. A one-off deliverable can start directly from the request.

## What changes when you edit

| Object                   | Example                                              | How an edit behaves                                                                                                                  |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Source evidence          | Approved minutes, proposal deck, effort sheet        | Read the dated item, slide or cell. New evidence can change a conclusion. Keep its original access boundary.                         |
| Project decision or work | Decision on two sites, training issue and assignee   | Update the authorized issue or Project when the decision or work changes. A different report grouping can refer to the same work ID. |
| Writing brief            | Manager meeting, site-by-site WBS or customer update | Create, clone or edit plain Markdown. A one-run instruction overrides the affected choice. A persistent edit changes future runs.    |
| Delivered artifact       | A dated report, an existing sheet or a slide         | Create a new file or identify the editable area of the existing one. Preserve manual edits and report any unresolved overlap.        |

For example, site and phase are two ways to group one training issue. A request to give training preparation and execution separate owners changes the work breakdown and can justify separate issues. A request for a one-line management summary changes the output.

The agent chooses the available file editor after it resolves the brief. The existing planner can supply GitHub evidence. A team can introduce a new format by supplying a brief, an optional native template and an editor that can write and reopen that format. The portable skill handles audience, evidence and update scope across formats. Node.js 26 is sufficient for the optional [field comparison command](../.agents/skills/project-materials/references/update-an-artifact.md#compare-editable-fields-with-nodejs). Native Office editing requires a suitable writer in the consumer environment.

## Rehearse two meetings

Use synthetic data for a public demo. All inputs below are invented. Supply the second week's records only after saving the first week's output.

| Record                                  | First meeting                                                                            | Second meeting                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Customer-shareable signed minutes       | D1 approves Harbor and Lighthouse for December. D2 leaves Hill pending.                  | D3 assigns Hill to January. The original December scope stands. |
| Internal effort sheet and staffing memo | E1 estimates three extra person-days if Hill joins in December. Staffing is unconfirmed. | C1 freezes the reserve. The old estimate had a December scope.  |
| Customer-shareable test log             | T1 records a pending rehearsal.                                                          | T2 records the signed rehearsal result.                         |

1. Generate a manager note and a customer update. Save the two briefs separately. Compare each claim with its source and check customer-visible citations and notes for internal-only details.
2. Add a human comment to the manager note. Put the two work IDs in a workbook with a formula and a comment on a protected cell. Refresh both artifacts for the second meeting. Resolve the old Hill question, preserve the human notes, and check the saved formula, comment and task IDs.
3. Change one generated workbook status by hand. Starting from the previous generated version, refresh against records that change the same status differently. Preserve the human value, identify the conflicting cell and apply independent changes. Repeat with unchanged inputs and check for duplicate work or further edits.
4. Generate an English customer slide from the same records. Choose its contents and language for this run. Check the native slide and speaker notes before sharing. Creating these drafts requires no scheduled job or recipient notification.

The [downstream trial](https://github.com/niikei/agentic-pm/issues/83) records actual writer behavior and verified formats. An extension is verified once a saved artifact has been checked with that writer and the relevant features of the team's template.
