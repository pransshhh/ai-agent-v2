import { END, START, StateGraph } from "@langchain/langgraph";
import { testingNode } from "./nodes/testing.node";
import { TestingState } from "./state";

const graph = new StateGraph(TestingState)
  .addNode("testing_node", testingNode)
  .addEdge(START, "testing_node")
  .addEdge("testing_node", END);

export const testingGraph = graph.compile();
