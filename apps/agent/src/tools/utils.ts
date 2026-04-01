import path from "node:path";

export function resolveSafePath(workDir: string, inputPath: string): string {
  const resolved = path.resolve(workDir, inputPath);
  if (!resolved.startsWith(workDir)) {
    throw new Error("Access denied: path traversal detected");
  }
  return resolved;
}
