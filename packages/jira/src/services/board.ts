import type { AgileClient, AgileModels } from "jira.js";
import type { JiraBoard } from "../types";

export function createBoardService(agile: AgileClient) {
  return {
    /**
     * Lists all boards visible to the authenticated user.
     */
    async listBoards(): Promise<JiraBoard[]> {
      const res = await agile.board.getAllBoards<AgileModels.GetAllBoards>();
      return (res.values ?? []).flatMap((b) => {
        if (b.id === undefined || !b.name || !b.type) return [];
        return [{ id: b.id, name: b.name, type: b.type }];
      });
    },

    /**
     * Returns boards that belong to the given Jira project key.
     * Uses the projectKeyOrId filter so only relevant boards are returned.
     */
    async listBoardsForProject(projectKey: string): Promise<JiraBoard[]> {
      const res = await agile.board.getAllBoards<AgileModels.GetAllBoards>({
        projectKeyOrId: projectKey
      });
      return (res.values ?? []).flatMap((b) => {
        if (b.id === undefined || !b.name || !b.type) return [];
        return [{ id: b.id, name: b.name, type: b.type }];
      });
    }
  };
}
