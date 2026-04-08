import type { GithubServices } from "@repo/github";
import { z } from "zod";

export function createGithubReadFileTool(
  github: GithubServices,
  owner: string,
  repo: string,
  branch: string
) {
  return {
    description: "Read a file from the GitHub repository",
    inputSchema: z.object({
      path: z.string().describe("File path relative to repo root")
    }),
    execute: async ({ path }: { path: string }) => {
      try {
        const { content } = await github.repo.getFileContent(
          owner,
          repo,
          path,
          branch
        );
        return { content };
      } catch {
        return { error: `File not found: ${path}` };
      }
    }
  };
}
