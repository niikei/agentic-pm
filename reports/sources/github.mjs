import { execFileSync } from "node:child_process";

const decisionLabel = "needs decision";
const requestLimit = 200;

function readGitHub(path) {
  let output;
  try {
    output = execFileSync(
      "gh",
      ["api", "--hostname", "github.com", "--method", "GET", "--include", path],
      {
        encoding: "utf8",
        timeout: 30_000,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    throw new Error(
      "GitHub read failed. Check gh access, rate limits and the 30-second / 16 MiB per-request limits.",
    );
  }
  const separator = /\r?\n\r?\n/.exec(output);
  if (!separator) throw new Error("GitHub returned no response headers.");
  const headers = output.slice(0, separator.index);
  const link = headers.match(/^link:\s*(.*)$/im)?.[1] ?? "";
  const next = link.match(/<([^>]+)>;\s*rel="next"/i)?.[1];
  let nextPath = null;
  if (next) {
    const url = new URL(next);
    if (url.origin !== "https://api.github.com")
      throw new Error("Unexpected GitHub pagination host.");
    nextPath = url.pathname.slice(1) + url.search;
  }
  return {
    data: JSON.parse(output.slice(separator.index + separator[0].length)),
    next: nextPath,
  };
}

function identity(repo, row) {
  if (
    !Number.isSafeInteger(row.number) ||
    row.number < 1 ||
    typeof row.title !== "string"
  )
    throw new Error("GitHub returned an incomplete issue or pull request.");
  return {
    id: `#${row.number}`,
    title: row.title,
    url: `https://github.com/${repo}/${row.pull_request ? "pull" : "issues"}/${row.number}`,
  };
}

function timestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new Error("GitHub returned a missing or invalid timestamp.");
  return new Date(value).toISOString();
}

export function captureGitHub(
  repo,
  days,
  { read = readGitHub, now = Date.now } = {},
) {
  if (
    typeof repo !== "string" ||
    !/^[a-z\d][a-z\d-]*\/[\w.-]+$/i.test(repo) ||
    [".", ".."].includes(repo.split("/")[1])
  )
    throw new Error("Expected a github.com OWNER/REPO slug.");
  if (!Number.isSafeInteger(days) || days < 1)
    throw new Error("Expected a positive number of lookback days.");
  const base = `repos/${repo}`;
  let requests = 0;
  function request(path) {
    if (++requests > requestLimit)
      throw new Error(
        `GitHub capture exceeded the ${requestLimit}-request limit.`,
      );
    return read(path);
  }
  function* rows(endpoint) {
    let path = endpoint;
    while (path) {
      const { data, next } = request(path);
      if (!Array.isArray(data))
        throw new Error("GitHub returned an incomplete collection.");
      yield* data;
      path = next;
    }
  }

  const metadata = request(base).data;
  if (
    metadata?.visibility !== "public" ||
    metadata.full_name.toLowerCase() !== repo.toLowerCase()
  )
    throw new Error(
      "A visible public repository at the specified OWNER/REPO is required.",
    );
  const project = metadata.full_name;
  const asOf = new Date(now()).toISOString();
  const coverageStart = new Date(
    Math.max(
      Date.parse(timestamp(metadata.created_at)),
      Date.parse(asOf) - days * 86_400_000,
    ),
  ).toISOString();
  // The 'since' filter is exclusive and GitHub timestamps have second precision.
  const since = new Date(
    Math.floor(Date.parse(coverageStart) / 1000) * 1000 - 1000,
  ).toISOString();

  function decisionStart(number) {
    let lastAt = null;
    let lastEvent = null;
    for (const record of rows(
      `${base}/issues/${number}/timeline?per_page=100`,
    )) {
      if (
        record.label?.name?.toLowerCase() !== decisionLabel ||
        !["labeled", "unlabeled"].includes(record.event)
      )
        continue;
      const at = timestamp(record.created_at);
      if (at > asOf)
        throw new Error(
          "A decision label changed during capture. Run the report again.",
        );
      if (lastAt === null || at >= lastAt) {
        lastAt = at;
        lastEvent = record.event;
      }
    }
    return lastEvent === "labeled" ? lastAt : null;
  }

  const items = [];
  const deliveries = [];
  const seen = new Set();
  for (const row of rows(`${base}/issues?state=open&per_page=100`)) {
    const item = identity(project, row);
    const change = Boolean(row.pull_request);
    if (change && typeof row.draft !== "boolean")
      throw new Error(`GitHub did not return draft status for ${item.id}.`);
    const updatedAt = timestamp(row.updated_at);
    if (updatedAt > asOf || seen.has(item.id))
      throw new Error(
        "The open issue list changed during capture. Run the report again.",
      );
    seen.add(item.id);
    const needsDecision = row.labels.some(
      (label) => label.name.toLowerCase() === decisionLabel,
    );
    items.push({
      ...item,
      kind: change ? "change" : "work",
      updatedAt,
      needsDecision,
      draft: change && row.draft,
      decisionSince: needsDecision ? decisionStart(row.number) : null,
      owners: row.assignees.map((assignee) => assignee.login),
    });
  }
  for (const row of rows(
    `${base}/issues?state=closed&since=${since}&per_page=100`,
  )) {
    if (!row.pull_request || row.pull_request.merged_at === null) continue;
    const at = timestamp(row.pull_request.merged_at);
    if (at < coverageStart || at > asOf) continue;
    const delivery = identity(project, row);
    if (seen.has(delivery.id))
      throw new Error(
        "The pull request list changed during capture. Run the report again.",
      );
    seen.add(delivery.id);
    deliveries.push({ ...delivery, at });
  }
  return { project, asOf, coverageStart, items, deliveries };
}
