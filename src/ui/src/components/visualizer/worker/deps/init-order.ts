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
export function initOrder(g: Graph) {
  let visited: Record<string, boolean> = {};
  let simpleNodes = g.nodes().filter((v) => !g.children(v).length);

  // The following code would throw "maximum call stack size exceeded" error
  // when handling large graphs. Change it to using loop.
  //
  // let maxRank = Math.max(...simpleNodes.map(v => g.node(v).rank));

  let maxRank = -Infinity;
  for (let i = 0; i < simpleNodes.length; i++) {
    const rank = g.node(simpleNodes[i]).rank;
    if (rank > maxRank) {
      maxRank = rank;
    }
  }

  let layers = range(maxRank + 1).map(() => []) as string[][];

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
      const v = queue.shift() ?? '';

      if (visited[v]) { continue; }

      visited[v] = true;
      const node = g.node(v);
      layers[node.rank].push(v);

      g.successors(v)?.forEach((neighbor) => queue.push(neighbor));
    }
  }

  let orderedVs = simpleNodes.sort((a, b) => g.node(a).rank - g.node(b).rank);
  orderedVs.forEach(bfs);

  return layers;
}
