import { execFileSync } from "node:child_process";

const owner = "niikei";
export const repository = "niikei/agentic-pm";
const board = "1";

function gh(args, input) {
  try {
    return JSON.parse(
      execFileSync("gh", args, {
        encoding: "utf8",
        env: { ...process.env, GH_HOST: "github.com" },
        input,
        timeout: 30_000,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
  } catch {
    throw new Error(
      "Could not read the public project. Check GitHub CLI access and retry the refresh.",
    );
  }
}

export function captureBoard() {
  const args = [board, "--owner", owner, "--format", "json"];
  const project = gh(["project", "view", ...args]);
  if (project.public !== true || project.title !== "agentic-pm")
    throw new Error("Expected the public agentic-pm Project.");
  const page = gh([
    "project",
    "item-list",
    ...args,
    "--limit",
    "1000",
    "--query",
    `repo:${repository} is:open`,
  ]);
  if (page.items.length !== page.totalCount)
    throw new Error("Project item list is incomplete.");
  return new Map(
    page.items
      .filter((item) => item.content.repository === repository)
      .map((item) => [item.content.url, item.status]),
  );
}

function readBatch(batch) {
  // Numbers originate in the validated capture. Cursors are GraphQL variables.
  const variables = {};
  const declarations = [];
  const fields = batch.map(({ number, cursor }, i) => {
    if (!Number.isSafeInteger(number) || number < 1)
      throw new Error("Invalid PR number.");
    declarations.push(`$c${i}:String`);
    variables[`c${i}`] = cursor;
    return `p${i}:pullRequest(number:${number}){number state updatedAt reviewDecision closingIssuesReferences(first:50,after:$c${i}){nodes{number title repository{nameWithOwner visibility}} pageInfo{hasNextPage endCursor}}}`;
  });
  const query = `query(${declarations.join(",")}){repository(owner:"niikei",name:"agentic-pm"){visibility ${fields.join("\n")}}}`;
  const response = gh(
    ["api", "--hostname", "github.com", "graphql", "--input", "-"],
    JSON.stringify({ query, variables }),
  );
  if (response.errors || response.data?.repository?.visibility !== "PUBLIC")
    throw new Error("Could not verify public PR relationships.");
  return batch.map((_, i) => response.data.repository[`p${i}`]);
}

export function captureRelations(snapshot, read = readBatch) {
  if (snapshot.project !== repository)
    throw new Error("Unexpected source repository for the project desk.");
  const pulls = [
    ...snapshot.items.filter((item) => item.kind === "change"),
    ...snapshot.deliveries,
  ];
  const queue = pulls.map((pr) => ({
    number: Number(pr.id.slice(1)),
    cursor: null,
    pr,
  }));
  const relations = new Map();
  const cursors = new Set();
  for (let requests = 0; queue.length; requests++) {
    if (requests >= 200)
      throw new Error("PR relationship capture exceeded its request limit.");
    const batch = queue.splice(0, 12);
    const results = read(batch);
    batch.forEach(({ number, pr }, index) => {
      const node = results[index];
      if (
        node?.number !== number ||
        node.state !== (pr.at ? "MERGED" : "OPEN") ||
        !Number.isFinite(Date.parse(node.updatedAt)) ||
        Date.parse(node.updatedAt) > Date.parse(snapshot.asOf)
      )
        throw new Error("PR state changed during capture. Refresh again.");
      const relation = relations.get(pr.id) ?? {
        issues: [],
        review: node.reviewDecision,
      };
      const { nodes, pageInfo } = node.closingIssuesReferences;
      for (const issue of nodes) {
        if (
          issue.repository?.visibility !== "PUBLIC" ||
          issue.repository.nameWithOwner !== repository
        )
          continue;
        if (
          !Number.isSafeInteger(issue.number) ||
          typeof issue.title !== "string"
        )
          throw new Error("Incomplete linked issue.");
        if (relation.issues.some((row) => row.id === `#${issue.number}`))
          throw new Error("Issue links changed during capture. Refresh again.");
        relation.issues.push({
          id: `#${issue.number}`,
          title: issue.title,
          url: `https://github.com/${repository}/issues/${issue.number}`,
        });
      }
      relations.set(pr.id, relation);
      if (pageInfo.hasNextPage) {
        const key = `${number}:${pageInfo.endCursor}`;
        if (!pageInfo.endCursor || cursors.has(key))
          throw new Error("Invalid PR relationship cursor.");
        cursors.add(key);
        queue.push({ number, pr, cursor: pageInfo.endCursor });
      }
    });
  }
  return relations;
}
