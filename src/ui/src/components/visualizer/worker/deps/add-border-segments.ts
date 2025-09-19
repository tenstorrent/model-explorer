import type { Graph } from '@dagrejs/graphlib';
import { addDummyNode } from './util.js';

function addBorderNode(graph: Graph, prop: string, prefix: string, segment: string, sgNode: any, rank: number) {
  const label = { width: 0, height: 0, rank, borderType: prop };
  const prev = sgNode[prop][rank - 1];
  const curr = addDummyNode(graph, 'border', label, prefix);
  sgNode[prop][rank] = curr;
  graph.setParent(curr, segment);
  if (prev) {
    graph.setEdge(prev, curr, { weight: 1 });
  }
}

export function addBorderSegments(graph: Graph) {
  const dfs = (visitedEdge: string) => {
    const children = graph.children(visitedEdge);
    const node = graph.node(visitedEdge);
    if (children.length) {
      children.forEach(dfs);
    }

    if (Object.hasOwn(node ?? {}, 'minRank')) {
      node.borderLeft = [];
      node.borderRight = [];

      const maxRank = node.maxRank + 1;
      for (let rank = node.minRank; rank < maxRank; ++rank) {
        addBorderNode(graph, 'borderLeft', '_bl', visitedEdge, node, rank);
        addBorderNode(graph, 'borderRight', '_br', visitedEdge, node, rank);
      }
    }
  };

  // @ts-expect-error
  graph.children().forEach(dfs);
}
