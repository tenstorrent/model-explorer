import type { Graph } from '@dagrejs/graphlib';

export function barycenter(graph: Graph, movable: string[] = []) {
  return movable.map((vertex) => {
    const inV = graph.inEdges(vertex);

    if (!inV?.length) {
      return { v: vertex };
    }

    const result = inV.reduce((acc, currentEdge) => {
      const edge = graph.edge(currentEdge);
      const nodeU = graph.node(currentEdge.v);

      return {
        sum: acc.sum + (edge.weight * nodeU.order),
        weight: acc.weight + edge.weight
      };
    }, { sum: 0, weight: 0 });

    return {
      v: vertex,
      barycenter: result.sum / result.weight,
      weight: result.weight
    };
  });
}
