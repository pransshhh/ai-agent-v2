import { END, START, StateGraph } from "@langchain/langgraph";
import { securityNode } from "./nodes/security.node";
import { SecurityState } from "./state";

const graph = new StateGraph(SecurityState)
  .addNode("security_node", securityNode)
  .addEdge(START, "security_node")
  .addEdge("security_node", END);

export const securityGraph = graph.compile();
