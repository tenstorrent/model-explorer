import type { Graph } from '@dagrejs/graphlib';

export function barycenter(g: Graph, movable: string[] = []) {
  return movable.map((v) => {
    let inV = g.inEdges(v);
    if (!inV?.length) {
      return { v: v };
    } else {
      let result = inV.reduce((acc, e) => {
        let edge = g.edge(e),
          nodeU = g.node(e.v);
        return {
          sum: acc.sum + (edge.weight * nodeU.order),
          weight: acc.weight + edge.weight
        };
      }, { sum: 0, weight: 0 });

      return {
        v: v,
        barycenter: result.sum / result.weight,
        weight: result.weight
      };
    }
  });
}
