import { END, START, StateGraph } from "@langchain/langgraph";
import { codingNode } from "./nodes/coding.node";
import type { CodingStateType } from "./state";
import { CodingState } from "./state";

/**
 * Decides whether to keep coding (more tickets remain) or end.
 * This is what makes the coding graph cyclical —
 * it loops back to coding_node until all tickets are done or it fails.
 */
function shouldContinue(state: CodingStateType): "coding_node" | typeof END {
  if (state.status === "done" || state.status === "failed") {
    return END;
  }
  return "coding_node";
}

/**
 * Coding graph — runs once per "Start Coding" trigger.
 *
 * Flow:
 *   START → coding_node → shouldContinue → coding_node (loop)
 *                                        → END (when all tickets done)
 */
const graph = new StateGraph(CodingState)
  .addNode("coding_node", codingNode)
  .addEdge(START, "coding_node")
  .addConditionalEdges("coding_node", shouldContinue);

export const codingGraph = graph.compile();
