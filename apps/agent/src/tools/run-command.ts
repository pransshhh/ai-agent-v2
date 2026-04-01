import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execAsync = promisify(exec);

export function createRunCommandTool(workDir: string) {
  return {
    description: "Run a shell command in the project directory",
    inputSchema: z.object({
      command: z.string()
    }),
    execute: async ({ command }: { command: string }) => {
      const BLOCKED = [
        "rm -rf /",
        ":(){ :|:& };:",
        "mkfs",
        "dd if=",
        "> /dev/"
      ];
      if (BLOCKED.some((pattern) => command.includes(pattern))) {
        throw new Error(`Blocked dangerous command: ${command}`);
      }

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: workDir,
          timeout: 30_000
        });

        return { success: true, stdout, stderr };
      } catch (error: unknown) {
        if (error instanceof Error) {
          return {
            success: false,
            stdout: "",
            stderr: error.message
          };
        }
        return {
          success: false,
          stdout: "",
          stderr: "Unknown error"
        };
      }
    }
  };
}
