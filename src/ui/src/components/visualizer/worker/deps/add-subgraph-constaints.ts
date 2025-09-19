import type { Graph } from '@dagrejs/graphlib';

export function addSubgraphConstraints(graph: Graph, childGraph: any, nodes: string[]) {
  const prev: Record<string, string> = {};
  let rootPrev: string;

  nodes.forEach((node) => {
    let child = graph.parent(node);
    let parentNode;
    let prevChild;

    while (child) {
      parentNode = graph.parent(child);

      if (parentNode) {
        prevChild = prev[parentNode];
        prev[parentNode] = child;
      } else {
        prevChild = rootPrev;
        rootPrev = child;
      }

      if (prevChild && prevChild !== child) {
        childGraph.setEdge(prevChild, child);
        return;
      }

      child = parentNode;
    }
  });
}
