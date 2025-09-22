import type { Graph } from '@dagrejs/graphlib';
import { range } from './util.js';

/*
 * Assigns an initial order value for each node by performing a DFS search
 * starting from nodes in the first rank. Nodes are assigned an order in their
 * rank as they are first visited.
 *
 * This approach comes from Gansner, et al., "A Technique for Drawing Directed
 * Graphs."
 *
 * Returns a layering matrix with an array per layer and each layer sorted by
 * the order of its nodes.
 */
export function initOrder(graph: Graph) {
  const visited: Record<string, boolean> = {};
  const simpleNodes = graph.nodes().filter((nodeName) => !graph.children(nodeName).length);

  // The following code would throw "maximum call stack size exceeded" error
  // when handling large graphs. Change it to using loop.
  //
  // let maxRank = Math.max(...simpleNodes.map(v => g.node(v).rank));

  let maxRank = -Infinity;

  for (const node of simpleNodes) {
    const { rank } = graph.node(node);

    if (rank > maxRank) {
      maxRank = rank;
    }
  }

  const layers = range(maxRank + 1).map(() => []) as string[][];

  /*
   * The following code uses dfs to iterate nodes which will case
   * "maximum call stack size exceeded" error when handling large graphs.
   * Change it to using bfs instead.
   *
   * function dfs(v) {
   *   if (visited[v]) return;
   *   visited[v] = true;
   *   let node = g.node(v);
   *   layers[node.rank].push(v);
   *   g.successors(v).forEach(dfs);
   * }
   *
   * let orderedVs = simpleNodes.sort((a, b) => g.node(a).rank - g.node(b).rank);
   * orderedVs.forEach(dfs);
   */

  function bfs(startV: string) {
    const queue = [startV];

    while (queue.length > 0) {
      const nodeName = queue.shift() ?? '';

      if (visited[nodeName]) { continue; }

      visited[nodeName] = true;
      const node = graph.node(nodeName);
      layers[node.rank]?.push(nodeName);

      graph.successors(nodeName)?.forEach((neighbor) => queue.push(neighbor));
    }
  }

  const orderedVs = simpleNodes.sort((nodeA, nodeB) => graph.node(nodeA).rank - graph.node(nodeB).rank);
  orderedVs.forEach(bfs);

  return layers;
}
