import type { GithubServices } from "@repo/github";
import { z } from "zod";

export function createGithubListFilesTool(
  github: GithubServices,
  owner: string,
  repo: string,
  branch: string
) {
  return {
    description:
      "List all files in the GitHub repository (recursive tree). Use this to explore the codebase structure.",
    inputSchema: z.object({
      filter: z
        .string()
        .optional()
        .describe(
          "Optional prefix to filter paths (e.g. 'src/' to only show src files)"
        )
    }),
    execute: async ({ filter }: { filter?: string }) => {
      try {
        const tree = await github.repo.getRepoTree(owner, repo, branch);
        const files = tree
          .filter((e) => e.type === "blob")
          .map((e) => e.path)
          .filter((p) => (filter ? p.startsWith(filter) : true));
        return { files };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to list files: ${msg}` };
      }
    }
  };
}
