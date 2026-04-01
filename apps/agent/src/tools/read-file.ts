import fs from "node:fs/promises";
import { z } from "zod";
import { resolveSafePath } from "./utils";

export function createReadFileTool(workDir: string) {
  return {
    description: "Read a file from the project",
    inputSchema: z.object({
      path: z.string()
    }),
    execute: async ({ path: filePath }: { path: string }) => {
      const fullPath = resolveSafePath(workDir, filePath);
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        return { content };
      } catch {
        return { error: `File not found: ${filePath}` };
      }
    }
  };
}
