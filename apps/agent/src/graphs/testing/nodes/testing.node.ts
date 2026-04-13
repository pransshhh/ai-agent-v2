import { createModel, stepCountIs, ToolLoopAgent } from "@repo/ai";
import { createGithubServices } from "@repo/github";
import { logger } from "../../../lib/logger";
import { createGithubListFilesTool } from "../../../tools/github-list-files";
import { createGithubReadFileTool } from "../../../tools/github-read-file";
import { createGithubWriteFileTool } from "../../../tools/github-write-file";
import type { TestingStateType } from "../state";

export async function testingNode(
  state: TestingStateType
): Promise<Partial<TestingStateType>> {
  logger.info({ runId: state.runId }, "Testing node started");

  const github = createGithubServices({ pat: state.githubPat });
  const owner = state.githubOwner;
  const repo = state.githubRepo;
  const branch = state.featureBranch;

  const tools = {
    readFile: createGithubReadFileTool(github, owner, repo, branch),
    writeFile: createGithubWriteFileTool(github, owner, repo, branch),
    listFiles: createGithubListFilesTool(github, owner, repo, branch)
  };

  const model = createModel({
    provider: state.aiProvider,
    apiKey: state.aiApiKey,
    model: "gemini-2.5-flash"
  });

  const repoContextSection = state.repoContext
    ? `\n## Repository Context\n${state.repoContext}\n`
    : "";

  const ticketList = state.tickets
    .map(
      (t) =>
        `- ${t.key}: ${t.summary}${t.description ? `\n  ${t.description}` : ""}`
    )
    .join("\n");

  const instructions = `You are a testing agent. For each ticket provided, read the implemented source files and write focused unit tests.
${repoContextSection}
Rules:
- Detect the test framework from package.json — use it if present, otherwise write plain assertions with no framework
- Test file naming: {filename}.test.{ext} co-located with source
- Do not modify any source files
- Do not add new dependencies
- Do not create jest.config, vitest.config or any test setup files
- Write minimal tests that cover the main logic only
- No integration tests, no mocks of external services`;

  const writtenFiles: string[] = [];

  try {
    const agent = new ToolLoopAgent({
      model,
      tools,
      instructions,
      stopWhen: stepCountIs(60)
    });

    await agent.generate({
      prompt: `Write unit tests for the following sprint tickets:\n\n${ticketList}\n\nStart by exploring the project with listFiles, then read the implemented source files, and write test files co-located with the source.`,
      onStepFinish: ({ stepNumber, toolCalls }) => {
        if (toolCalls) {
          for (const call of toolCalls) {
            if (call.toolName === "writeFile" && "input" in call) {
              const input = call.input as { path?: string };
              if (
                typeof input.path === "string" &&
                input.path.includes(".test.")
              ) {
                writtenFiles.push(input.path);
              }
            }
          }
        }
        logger.info(
          {
            runId: state.runId,
            step: stepNumber,
            toolsUsed: toolCalls?.map((t) => t.toolName)
          },
          "Testing step completed"
        );
      }
    });

    const ticketKeys = state.tickets.map((t) => t.key).join(", ");
    const testSummary =
      writtenFiles.length > 0
        ? `Tests written for tickets: ${ticketKeys}.\n\nTest files:\n${writtenFiles.map((f) => `- \`${f}\``).join("\n")}`
        : `Testing agent ran but no test files were written for tickets: ${ticketKeys}.`;

    logger.info(
      { runId: state.runId, testFilePaths: writtenFiles },
      "Testing node completed"
    );

    return {
      status: "done",
      testFilePaths: writtenFiles,
      testSummary
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ runId: state.runId, err }, "Testing node failed");
    return { status: "failed", error: message };
  }
}
