import type { Graph } from '@dagrejs/graphlib';
import { zipObject } from './util.js';

function twoLayerCrossCount(graph: Graph, northLayer: string[], southLayer: string[]) {
  // Sort all of the edges between the north and south layers by their position
  // in the north layer and then the south. Map these edges to the position of
  // their head in the south layer.
  const southPos = zipObject(southLayer, southLayer.map((_, i) => i));
  const southEntries = northLayer.flatMap((edgeName) =>
    graph
      .outEdges(edgeName)
      ?.map((edge) => ({
        pos: southPos[edge.w] ?? 0,
        weight: graph.edge(edge).weight
      }))
      .sort((edgeA, edgeB) => edgeA.pos - edgeB.pos)
  );

  // Build the accumulator tree
  let firstIndex = 1;
  while (firstIndex < southLayer.length) { firstIndex <<= 1; }
  const treeSize = 2 * firstIndex - 1;
  firstIndex -= 1;
  const tree = new Array(treeSize).fill(0);

  // Calculate the weighted crossings
  let weightedCrossCount = 0;
  southEntries.forEach((entry) => {
    let index = (entry?.pos ?? 0) + firstIndex;
    tree[index] += entry?.weight ?? 0;
    let weightSum = 0;
    while (index > 0) {
      if (index % 2) {
        weightSum += tree[index + 1];
      }
      index = (index - 1) >> 1;
      tree[index] += entry?.weight ?? 0;
    }
    weightedCrossCount += (entry?.weight ?? 0) * weightSum;
  });

  return weightedCrossCount;
}

/*
 * A function that takes a layering (an array of layers, each with an array of
 * ordererd nodes) and a graph and returns a weighted crossing count.
 *
 * Pre-conditions:
 *
 *    1. Input graph must be simple (not a multigraph), directed, and include
 *       only simple edges.
 *    2. Edges in the input graph must have assigned weights.
 *
 * Post-conditions:
 *
 *    1. The graph and layering matrix are left unchanged.
 *
 * This algorithm is derived from Barth, et al., "Bilayer Cross Counting."
 */
export function crossCount(graph: Graph, layering: string[][]) {
  let crossCountNumber = 0;

  for (let i = 1; i < layering.length; ++i) {
    crossCountNumber += twoLayerCrossCount(graph, layering[i - 1] ?? [], layering[i] ?? []);
  }
  return crossCountNumber;
}
