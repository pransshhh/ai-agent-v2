import { Octokit } from "@octokit/rest";

export interface GithubConfig {
  pat: string;
}

export function createGithubClient(config: GithubConfig): Octokit {
  return new Octokit({ auth: config.pat });
}
