import { db } from "@repo/db";
import type {
  CreateProjectRequest,
  LinkJiraRequest,
  UpdateProjectRequest
} from "@repo/zod/project";
import { jira } from "../../lib/jira";
import { AppError } from "../../middleware/error";

export const projectService = {
  async listProjects(userId: string) {
    return db.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
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

  async createProject(userId: string, input: CreateProjectRequest) {
    return db.project.create({
      data: {
        name: input.name,
        description: input.description,
        userId
      }
    });
  },

  async updateProject(id: string, userId: string, input: UpdateProjectRequest) {
    // verify ownership
    await projectService.getProject(id, userId);

    return db.project.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {})
      }
    });
  },

  async deleteProject(id: string, userId: string) {
    await projectService.getProject(id, userId);
    await db.project.delete({ where: { id } });
    return { message: "Project deleted" };
  },

  async linkJira(id: string, userId: string, input: LinkJiraRequest) {
    await projectService.getProject(id, userId);

    // Verify the Jira project key exists and fetch the boardId
    const boards = await jira.boards.listBoards();
    const board = boards.find((b) =>
      // Board names typically contain the project key
      b.name.toUpperCase().includes(input.projectKey.toUpperCase())
    );

    if (!board) {
      throw new AppError(
        `No Jira board found for project key "${input.projectKey}". ` +
          "Make sure the project key is correct and the board exists.",
        404,
        "JIRA_BOARD_NOT_FOUND"
      );
    }

    return db.project.update({
      where: { id },
      data: {
        jiraProjectKey: input.projectKey,
        jiraBoardId: board.id
      }
    });
  },

  async unlinkJira(id: string, userId: string) {
    await projectService.getProject(id, userId);

    return db.project.update({
      where: { id },
      data: {
        jiraProjectKey: null,
        jiraBoardId: null,
        jiraSprintId: null
      }
    });
  }
};
