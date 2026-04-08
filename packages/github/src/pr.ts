import type { Octokit } from "@octokit/rest";

export async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string
): Promise<string> {
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body
  });

  return data.html_url;
}
