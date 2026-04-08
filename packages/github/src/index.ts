import type { GithubConfig } from "./client";
import { createGithubClient } from "./client";
import { createPullRequest } from "./pr";
import { createBranch, getFileContent, getRepoTree, writeFile } from "./repo";

export * from "./client";
export * from "./pr";
export * from "./repo";

/**
 * Creates all GitHub helpers with the provided config.
 * Call this once with the project's decrypted PAT.
 *
 * @example
 * // apps/agent/src/lib/github.ts
 * import { createGithubServices } from '@repo/github'
 *
 * export const github = createGithubServices({ pat: decryptedPat })
 *
 * // Then anywhere:
 * const tree = await github.repo.getRepoTree(owner, repo, branch)
 * await github.repo.writeFile(owner, repo, path, content, message, branch)
 * const prUrl = await github.pr.createPullRequest(owner, repo, head, base, title, body)
 */
export function createGithubServices(config: GithubConfig) {
  const octokit = createGithubClient(config);

  return {
    repo: {
      getRepoTree: (owner: string, repo: string, branch: string) =>
        getRepoTree(octokit, owner, repo, branch),
      getFileContent: (
        owner: string,
        repo: string,
        path: string,
        branch: string
      ) => getFileContent(octokit, owner, repo, path, branch),
      createBranch: (
        owner: string,
        repo: string,
        branchName: string,
        fromBranch: string
      ) => createBranch(octokit, owner, repo, branchName, fromBranch),
      writeFile: (
        owner: string,
        repo: string,
        path: string,
        content: string,
        message: string,
        branch: string,
        sha?: string
      ) => writeFile(octokit, owner, repo, path, content, message, branch, sha)
    },
    pr: {
      createPullRequest: (
        owner: string,
        repo: string,
        head: string,
        base: string,
        title: string,
        body: string
      ) => createPullRequest(octokit, owner, repo, head, base, title, body)
    }
  };
}

export type GithubServices = ReturnType<typeof createGithubServices>;
export type { GithubConfig };
