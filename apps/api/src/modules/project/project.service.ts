import { db } from "@repo/db";
import type {
  ConnectGithubRequest,
  CreateProjectRequest,
  LinkJiraRequest,
  UpdateProjectRequest
} from "@repo/zod/project";
import { env } from "../../config/env";
import { encrypt } from "../../lib/crypto";
import { createDiscoveryJira } from "../../lib/jira";
import { AppError } from "../../middleware/error";

type ProjectRow = Awaited<ReturnType<typeof db.project.findUniqueOrThrow>>;

function toPublic(project: ProjectRow) {
  const { githubPat: _, ...rest } = project;
  return rest;
}

export const projectService = {
  async listProjects(userId: string) {
    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    return projects.map(toPublic);
  },

  async getProject(id: string, userId: string) {
    const project = await db.project.findUnique({ where: { id } });

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }
    if (project.userId !== userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return project;
  },

  async getProjectPublic(id: string, userId: string) {
    return toPublic(await projectService.getProject(id, userId));
  },

  async createProject(userId: string, input: CreateProjectRequest) {
    const project = await db.project.create({
      data: {
        name: input.name,
        description: input.description,
        userId
      }
    });
    return toPublic(project);
  },

  async updateProject(id: string, userId: string, input: UpdateProjectRequest) {
    await projectService.getProject(id, userId);

    const project = await db.project.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {})
      }
    });
    return toPublic(project);
  },

  async deleteProject(id: string, userId: string) {
    await projectService.getProject(id, userId);
    await db.project.delete({ where: { id } });
    return { message: "Project deleted" };
  },

  async linkJira(id: string, userId: string, input: LinkJiraRequest) {
    await projectService.getProject(id, userId);

    // Fetch boards that belong to this Jira project key
    const boards = await createDiscoveryJira().boards.listBoardsForProject(
      input.projectKey
    );
    // Prefer a scrum board; fall back to the first board found
    const board = boards.find((b) => b.type === "scrum") ?? boards[0];

    if (!board) {
      throw new AppError(
        `No board found for Jira project "${input.projectKey}". ` +
          "Make sure the project key is correct and a scrum board exists.",
        404,
        "JIRA_BOARD_NOT_FOUND"
      );
    }

    const project = await db.project.update({
      where: { id },
      data: {
        jiraProjectKey: input.projectKey,
        jiraBoardId: board.id
      }
    });
    return toPublic(project);
  },

  async unlinkJira(id: string, userId: string) {
    await projectService.getProject(id, userId);

    const project = await db.project.update({
      where: { id },
      data: {
        jiraProjectKey: null,
        jiraBoardId: null,
        jiraSprintId: null
      }
    });
    return toPublic(project);
  },

  async connectGithub(id: string, userId: string, input: ConnectGithubRequest) {
    await projectService.getProject(id, userId);

    const encryptedPat = encrypt(input.pat, env.GITHUB_PAT_SECRET);

    const project = await db.project.update({
      where: { id },
      data: {
        githubRepoUrl: input.repoUrl,
        githubPat: encryptedPat,
        githubBaseBranch: input.baseBranch
      }
    });
    return toPublic(project);
  },

  async disconnectGithub(id: string, userId: string) {
    await projectService.getProject(id, userId);

    const project = await db.project.update({
      where: { id },
      data: {
        githubRepoUrl: null,
        githubPat: null,
        githubBaseBranch: null,
        githubPrUrl: null
      }
    });
    return toPublic(project);
  }
};
