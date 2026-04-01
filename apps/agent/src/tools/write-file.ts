import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { resolveSafePath } from "./utils";

export function createWriteFileTool(workDir: string) {
  return {
    description: "Write or overwrite a file",
    inputSchema: z.object({
      path: z.string(),
      content: z.string()
    }),
    execute: async ({
      path: filePath,
      content
    }: {
      path: string;
      content: string;
    }) => {
      const fullPath = resolveSafePath(workDir, filePath);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");

      return { success: true };
    }
  };
}
