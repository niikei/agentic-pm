import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { history, items, openWorkspace } from "../../workspace/store.mjs";
import { workDesk } from "../../workspace/views.mjs";
import { materials, newMaterials } from "./case.mjs";
import { repositoryMatches } from "./fixture.mjs";

export function score(root, meta, days, phase, desk = join(root, "desk")) {
  const late = ["thursday", "friday", "next-monday"].includes(phase);
  const afterReview = ["friday", "next-monday"].includes(phase);
  const expected = {
    ...materials(days),
    ...(late ? newMaterials(days, "thursday") : {}),
    ...(afterReview ? newMaterials(days, "friday") : {}),
  };
  const db = openWorkspace(desk);
  try {
    const rows = items(db),
      pilot = rows.filter((row) => row.project === "pilot");
    const deadlineItems = pilot.filter((row) =>
      history(db, row.project, row.item).some(
        (event) => event.changes.dueDate === days.friday,
      ),
    );
    const cited = new Set(
      rows.flatMap((row) =>
        history(db, row.project, row.item).flatMap((event) =>
          event.file ? [event.file.path] : [],
        ),
      ),
    );
    const checks = {
      originals: Object.entries(expected).every(
        ([file, body]) =>
          existsSync(join(root, file)) &&
          readFileSync(join(root, file), "utf8") === body,
      ),
      bothRepositoriesCited: ["portal", "relay"].every(
        (folder) =>
          existsSync(join(root, folder, "Delivery.md")) &&
          cited.has(realpathSync(join(root, folder, "Delivery.md"))),
      ),
      repositories: ["portal", "relay"].every((folder) =>
        repositoryMatches(
          root,
          folder,
          meta.heads[folder],
          late && folder === "relay",
          days,
        ),
      ),
      mondayDeadlineRecorded: deadlineItems.length === 1,
    };
    const openInbox = rows.filter(
      (row) =>
        row.project === "inbox" && !["done", "reference"].includes(row.status),
    );
    if (!late) checks.ambiguousIntake = openInbox.length > 0;
    else {
      checks.quotationAssigned =
        openInbox.length === 0 &&
        rows.some(
          (row) =>
            row.project === "supplies" &&
            !["done", "reference"].includes(row.status),
        );
      const csv = join(root, "relay", "Retry-check.csv");
      checks.testEvidenceCited =
        existsSync(csv) && cited.has(realpathSync(csv));
    }
    if (phase === "monday")
      checks.activeDeadline =
        deadlineItems.length === 1 && deadlineItems[0].dueDate === days.friday;
    else {
      checks.deadlineWithdrawn =
        deadlineItems.length === 1 &&
        !deadlineItems[0].dueDate &&
        !pilot.some((row) => row.status !== "done" && row.dueDate);
      checks.reviewTime = pilot.some((record) =>
        (afterReview
          ? history(db, record.project, record.item).map(
              (event) => event.changes,
            )
          : [record]
        ).some(
          (row) =>
            Date.parse(row.meeting?.start) ===
              Date.parse(`${days.friday}T15:00:00+09:00`) &&
            Date.parse(row.meeting?.end) ===
              Date.parse(`${days.friday}T15:30:00+09:00`),
        ),
      );
    }
    if (phase === "wednesday" || phase === "friday") {
      const target = join(
        desk,
        phase === "friday" ? "friday-report.md" : "manager-handoff.md",
      );
      const body = existsSync(target)
        ? readFileSync(target, "utf8").trim()
        : "";
      checks.handoffSaved = body.length > 0;
      checks.handoffAudience =
        Boolean(body) &&
        !(
          /AMBER-LOCKER|https?:\/\/|file:\/\/|[A-Za-z]:\\/.test(body) ||
          body.includes(root)
        );
    }
    if (afterReview) {
      const minutes = join(root, "notes", "受入結果.md");
      checks.reviewOutcomeCited =
        existsSync(minutes) && cited.has(realpathSync(minutes));
    }
    if (phase === "friday") {
      const report = join(desk, "friday-report.md");
      const text = existsSync(report)
        ? readFileSync(report, "utf8").trim()
        : "";
      checks.readerPreference =
        Boolean(text) && !/\b(?:main|API)\b|コミット/i.test(text);
      // Count explicit Japanese sentence endings; the read-through also catches fragments.
      checks.reportLength =
        Boolean(text) && (text.match(/[。！？]+/gu)?.length ?? 0) <= 3;
      checks.personalAppendixOmitted =
        Boolean(text) && !/自分(?:用|向け|の次の一手)/u.test(text);
    }
    if (phase === "next-monday") {
      const original = openWorkspace(join(root, "desk"));
      try {
        const hasNewObservation = (database) =>
          items(database).some((row) =>
            history(database, row.project, row.item).some(
              (e) => e.observed === days.nextMonday,
            ),
          );
        checks.recoveryIsolated =
          realpathSync(desk) !== realpathSync(join(root, "desk")) &&
          hasNewObservation(db) &&
          !hasNewObservation(original);
        checks.originalHistoryRetained = items(original).every((row) => {
          const before = history(original, row.project, row.item),
            after = history(db, row.project, row.item);
          return before.every(
            (event, i) => JSON.stringify(event) === JSON.stringify(after[i]),
          );
        });
      } finally {
        original.close();
      }
      checks.pilotActionOnDesk = Boolean(
        workDesk(db, "pilot", `${days.nextMonday}T09:00:00+09:00`).next,
      );
      const handover = join(desk, "handover-next.md");
      checks.operatorHandoff =
        existsSync(handover) && Boolean(readFileSync(handover, "utf8").trim());
    }
    return checks;
  } finally {
    db.close();
  }
}
