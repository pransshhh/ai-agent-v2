import type { GithubServices } from "@repo/github";
import { z } from "zod";

export function createGithubWriteFileTool(
  github: GithubServices,
  owner: string,
  repo: string,
  branch: string
) {
  return {
    description: "Write or overwrite a file in the GitHub repository",
    inputSchema: z.object({
      path: z.string().describe("File path relative to repo root"),
      content: z.string().describe("Full file content to write"),
      message: z
        .string()
        .optional()
        .describe("Commit message (defaults to 'chore: update <path>')")
    }),
    execute: async ({
      path,
      content,
      message
    }: {
      path: string;
      content: string;
      message?: string;
    }) => {
      try {
        await github.repo.writeFile(
          owner,
          repo,
          path,
          content,
          message ?? `chore: update ${path}`,
          branch
          // sha is omitted — writeFile in packages/github auto-fetches it when needed
        );
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to write ${path}: ${msg}` };
      }
    }
  };
}
