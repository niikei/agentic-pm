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

export function pullRequestLinks(issue, openPRs) {
  const { pageInfo } = issue.closedByPullRequestsReferences;
  const links = openPRs.map(
    (pr) => `[#${pr.number}](${pr.url})${pr.isDraft ? " (draft)" : ""}`,
  );
  if (pageInfo.hasNextPage) links.push(`[See issue](${issue.url})`);
  return links.join(", ") || "—";
}
