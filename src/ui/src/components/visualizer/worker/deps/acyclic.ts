import type { Edge, Graph } from '@dagrejs/graphlib';
import { greedyFAS } from './greedyFAS.js';
import { uniqueId } from './util.js';

function dfsFAS(graph: Graph) {
  const fas: Edge[] = [];
  const stack: Record<string, boolean> = {};
  const visited: Record<string, boolean> = {};

  const dfs = (node: string) => {
    if (visited[node]) {
      return;
    }

    visited[node] = true;
    stack[node] = true;

    graph.outEdges(node)?.forEach((edge) => {
      if (stack[edge.w]) {
        fas.push(edge);
      } else {
        dfs(edge.w);
      }
    });

    delete stack[node];
  };

  graph.nodes().forEach(dfs);

  return fas;
}

function weightFn(graph: Graph) {
  return (edge: Edge) => graph.edge(edge).weight;
}

export function run(graph: Graph) {
  const fas = graph.graph().acyclicer === 'greedy'
    ? greedyFAS(graph, weightFn(graph))
    : dfsFAS(graph);
  fas.forEach((edge) => {
    const label = graph.edge(edge);
    graph.removeEdge(edge);
    label.forwardName = edge.name;
    label.reversed = true;
    graph.setEdge(edge.w, edge.v, label, uniqueId('rev'));
  });
}
export function undo(graph: Graph) {
  graph.edges().forEach((edge) => {
    const label = graph.edge(edge);
    if (label.reversed) {
      graph.removeEdge(edge);

      const { forwardName } = label;
      delete label.reversed;
      delete label.forwardName;
      graph.setEdge(edge.w, edge.v, label, forwardName);
    }
  });
}
