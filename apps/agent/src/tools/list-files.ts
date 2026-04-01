import fs from "node:fs/promises";
import { z } from "zod";
import { resolveSafePath } from "./utils";

export function createListFilesTool(workDir: string) {
  return {
    description: "List files in a directory",
    inputSchema: z.object({
      dir: z.string().optional()
    }),
    execute: async ({ dir = "." }: { dir?: string }) => {
      const target = resolveSafePath(workDir, dir);

      const entries = await fs.readdir(target, { withFileTypes: true });

      return entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file"
      }));
    }
  };
}
