import { createModel, stepCountIs, ToolLoopAgent } from "@repo/ai";
import { createGithubServices } from "@repo/github";
import { ZSecurityReport } from "@repo/zod/agent";
import { logger } from "../../../lib/logger";
import { createGithubListFilesTool } from "../../../tools/github-list-files";
import { createGithubReadFileTool } from "../../../tools/github-read-file";
import type { SecurityStateType } from "../state";

/** Extract the first JSON object from a string that may contain surrounding text. */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

export async function securityNode(
  state: SecurityStateType
): Promise<Partial<SecurityStateType>> {
  logger.info({ runId: state.runId }, "Security node started");

  const github = createGithubServices({ pat: state.githubPat });
  const owner = state.githubOwner;
  const repo = state.githubRepo;
  const branch = state.featureBranch;

  // Read-only tools — no write tool for security agent
  const tools = {
    readFile: createGithubReadFileTool(github, owner, repo, branch),
    listFiles: createGithubListFilesTool(github, owner, repo, branch)
  };

  const model = createModel({
    provider: state.aiProvider,
    apiKey: state.aiApiKey,
    model: "gemini-2.5-flash"
  });

  const instructions = `You are a security review agent. Read the changed files on the feature branch and identify security issues.
Scan for:
- Hardcoded secrets, tokens, API keys, passwords
- SQL/NoSQL injection vulnerabilities
- Missing input validation on API endpoints
- Unprotected routes missing auth middleware
- Sensitive data exposed in API responses
- Use of dangerous functions (eval, exec without sanitization)

Return a JSON object with exactly this shape:
{ "critical": string[], "warnings": string[], "info": string[] }

Each item is a one-line description with the file path and line context. Be precise — avoid false positives. If nothing found in a category, return an empty array.

IMPORTANT: Your final response must be ONLY the JSON object. No markdown, no explanation.`;

  try {
    const agent = new ToolLoopAgent({
      model,
      tools,
      instructions,
      stopWhen: stepCountIs(40)
    });

    const result = await agent.generate({
      prompt: `Review the code on feature branch "${state.featureBranch}" (base: "${state.baseBranch}") for security issues.

Start with listFiles to see all files on this branch, then read any files that could contain security-sensitive code (API routes, auth, DB queries, config, env handling). After reading the relevant files, output ONLY the JSON security report.`,
      onStepFinish: ({ stepNumber, toolCalls }) => {
        logger.info(
          {
            runId: state.runId,
            step: stepNumber,
            toolsUsed: toolCalls?.map((t) => t.toolName)
          },
          "Security step completed"
        );
      }
    });

    const rawText = result.text ?? "";
    const jsonText = extractJson(rawText);

    const parsed = ZSecurityReport.safeParse(JSON.parse(jsonText));

    if (!parsed.success) {
      logger.warn(
        { runId: state.runId, rawText },
        "Security report JSON parse failed — using empty report"
      );
      return {
        status: "done",
        securityReport: { critical: [], warnings: [], info: [] }
      };
    }

    logger.info(
      {
        runId: state.runId,
        critical: parsed.data.critical.length,
        warnings: parsed.data.warnings.length,
        info: parsed.data.info.length
      },
      "Security node completed"
    );

    return { status: "done", securityReport: parsed.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ runId: state.runId, err }, "Security node failed");
    return { status: "failed", error: message };
  }
}
