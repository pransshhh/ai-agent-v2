import type { AgileClient, AgileModels } from "jira.js";
import type {
  CreateSprintInput,
  JiraConfig,
  JiraSprint,
  SprintState,
  UpdateSprintInput
} from "../types";

export function createSprintService(agile: AgileClient, config: JiraConfig) {
  return {
    /**
     * Lists all sprints for the configured board.
     * Optionally filter by state: 'active' | 'closed' | 'future'
     */
    async listSprints(state?: SprintState): Promise<JiraSprint[]> {
      const res = await agile.board.getAllSprints({
        boardId: config.boardId,
        ...(state ? { state } : {})
      });
      return (res.values ?? []).map(mapSprint);
    },

    /**
     * Gets the currently active sprint for the configured board.
     * Returns null if no active sprint exists.
     */
    async getActiveSprint(): Promise<JiraSprint | null> {
      const res = await agile.board.getAllSprints({
        boardId: config.boardId,
        state: "active"
      });
      const sprint = res.values?.[0];
      return sprint ? mapSprint(sprint) : null;
    },

    /**
     * Creates a new sprint under the configured board.
     */
    async createSprint(input: CreateSprintInput): Promise<JiraSprint> {
      const res = await agile.sprint.createSprint({
        name: input.name,
        originBoardId: config.boardId,
        ...(input.startDate ? { startDate: input.startDate } : {}),
        ...(input.endDate ? { endDate: input.endDate } : {}),
        ...(input.goal ? { goal: input.goal } : {})
      });
      return mapSprint(res);
    },

    /**
     * Updates an existing sprint (name, dates, goal, or state).
     * To start a sprint: set state to 'active'.
     * To close a sprint: set state to 'closed'.
     */
    async updateSprint(
      sprintId: number,
      input: UpdateSprintInput
    ): Promise<JiraSprint> {
      const res = await agile.sprint.partiallyUpdateSprint({
        sprintId,
        name: input.name,
        state: input.state,
        startDate: input.startDate,
        endDate: input.endDate,
        goal: input.goal
      });
      return mapSprint(res);
    },

    /**
     * Moves issues into a sprint by their keys (e.g. ["SCRUM-1", "SCRUM-2"]).
     */
    async moveIssuesToSprint(
      sprintId: number,
      issueKeys: string[]
    ): Promise<void> {
      await agile.sprint.moveIssuesToSprintAndRank({
        sprintId,
        issues: issueKeys
      });
    }
  };
}

function mapSprint(raw: AgileModels.Sprint): JiraSprint {
  return {
    id: raw.id,
    name: raw.name,
    state: raw.state as SprintState,
    startDate: raw.startDate,
    endDate: raw.endDate,
    goal: raw.goal
  };
}
