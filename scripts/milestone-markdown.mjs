// Keep user-authored text literal inside a Markdown table cell or link label.
export function markdownText(value) {
  return value.replace(
    /[^\p{L}\p{N} -]/gu,
    (char) => `&#${char.codePointAt(0)};`,
  );
}

export function issueLink(issue) {
  const title = issue.title ? ` ${markdownText(issue.title)}` : "";
  return `[#${issue.number}${title}](${issue.url})`;
}

export function projectItem(issue, projectId) {
  return issue.projectItems.nodes.find((item) => item.project.id === projectId);
}

export function openPullRequests(issue, repositoryId) {
  return issue.closedByPullRequestsReferences.nodes.filter(
    (pr) => pr.state === "OPEN" && pr.repository.id === repositoryId,
  );
}

export function headCheckState(pr) {
  const commit = pr.commits?.nodes[0]?.commit;
  return commit?.oid && commit.oid === pr.headRefOid
    ? commit.statusCheckRollup?.state
    : undefined;
}

export function pullRequestLinks(issue, openPRs, { evidence = false } = {}) {
  const { pageInfo } = issue.closedByPullRequestsReferences;
  const links = openPRs.map((pr) => {
    const link = `[#${pr.number}](${pr.url})${pr.isDraft ? " (draft)" : ""}`;
    if (!evidence) return link;
    const checks = headCheckState(pr)?.toLowerCase() ?? "unreported";
    const review =
      pr.reviewDecision?.toLowerCase().replaceAll("_", " ") ?? "unreported";
    return `${link} (checks: ${checks}, review: ${review})`;
  });
  if (pageInfo.hasNextPage) links.push(`[See issue](${issue.url})`);
  return links.join(", ") || "—";
}
