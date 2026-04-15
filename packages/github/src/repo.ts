import type { Octokit } from "@octokit/rest";

export interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

export interface FileContent {
  content: string;
  sha: string;
  encoding: string;
}

export async function getRepoTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<TreeEntry[]> {
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`
  });
  const commitSha = refData.object.sha;

  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: "1"
  });

  return (treeData.tree ?? [])
    .filter((e) => e.path && e.type && e.sha)
    .map((e) => ({
      path: e.path as string,
      type: e.type as "blob" | "tree",
      sha: e.sha as string
    }));
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<FileContent> {
  // Interpolate path directly into the URL so Octokit does not encode
  // '/' as '%2F', which breaks nested paths like .github/workflows/ci.yml
  const { data } = (await octokit.request(
    `GET /repos/${owner}/${repo}/contents/${path}`,
    { ref: branch }
  )) as {
    data:
      | { type: string; content: string; sha: string; encoding: string }
      | Array<unknown>;
  };

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`Path "${path}" is not a file`);
  }

  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha: data.sha,
    encoding: data.encoding
  };
}

export async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string
): Promise<void> {
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`
  });

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: refData.object.sha
  });
}

export async function writeFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
): Promise<void> {
  const encodedContent = Buffer.from(content, "utf-8").toString("base64");

  // If no sha provided, try to get the existing file's sha
  let fileSha = sha;
  if (!fileSha) {
    try {
      const existing = await getFileContent(octokit, owner, repo, path, branch);
      fileSha = existing.sha;
    } catch {
      // File doesn't exist yet — create it
    }
  }

  // Interpolate path directly into the URL so Octokit does not encode
  // '/' as '%2F', which breaks nested paths like .github/workflows/ci.yml
  await octokit.request(`PUT /repos/${owner}/${repo}/contents/${path}`, {
    message,
    content: encodedContent,
    branch,
    ...(fileSha ? { sha: fileSha } : {})
  });
}
