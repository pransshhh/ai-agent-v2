import { END, START, StateGraph } from "@langchain/langgraph";
import { jiraNode } from "./nodes/jira.node";
import { PlanningState } from "./state";

/**
 * Planning graph — runs when user submits a project prompt.
 *
 * Flow:
 *   START → jira_node → END
 *
 * Simple linear graph for now. If we add a "review" step later
 * (e.g. AI reviews its own tickets before finalising), we add a node here.
 */
const graph = new StateGraph(PlanningState)
  .addNode("jira_node", jiraNode)
  .addEdge(START, "jira_node")
  .addEdge("jira_node", END);

export const planningGraph = graph.compile();
