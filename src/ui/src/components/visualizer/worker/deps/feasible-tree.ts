import { type Edge, Graph } from '@dagrejs/graphlib';
import { slack } from './rank-util.js';

/*
 * Constructs a spanning tree with tight edges and adjusted the input node's
 * ranks to achieve this. A tight edge is one that is has a length that matches
 * its "minlen" attribute.
 *
 * The basic structure for this function is derived from Gansner, et al., "A
 * Technique for Drawing Directed Graphs."
 *
 * Pre-conditions:
 *
 *    1. Graph must be a DAG.
 *    2. Graph must be connected.
 *    3. Graph must have at least one node.
 *    5. Graph nodes must have been previously assigned a "rank" property that
 *       respects the "minlen" property of incident edges.
 *    6. Graph edges must have a "minlen" property.
 *
 * Post-conditions:
 *
 *    - Graph nodes will have their rank adjusted to ensure that all edges are
 *      tight.
 *
 * Returns a tree (undirected graph) that is constructed using only "tight"
 * edges.
 */
export function feasibleTree(graph: Graph) {
  const t = new Graph({ directed: false });

  // Choose arbitrary node from which to start our tree
  const start = graph.nodes()[0];
  const size = graph.nodeCount();
  t.setNode(start, {});

  let delta;
  let edge;
  while (tightTree(t, graph) < size) {
    edge = findMinSlackEdge(t, graph);
    if (edge) {
      delta = t.hasNode(edge.v) ? slack(graph, edge) : -slack(graph, edge);
      shiftRanks(t, graph, delta);
    }
  }

  return t;
}

/*
 * Finds a maximal tree of tight edges and returns the number of nodes in the
 * tree.
 */
function tightTree(t: Graph, graph: Graph) {
  function dfs(v: string) {
    graph.nodeEdges(v)?.forEach((e) => {
      const edgeV = e.v;
      const w = (v === edgeV) ? e.w : edgeV;
      if (!t.hasNode(w) && !slack(graph, e)) {
        t.setNode(w, {});
        t.setEdge(v, w, {});
        dfs(w);
      }
    });
  }

  t.nodes().forEach(dfs);
  return t.nodeCount();
}

/*
 * Finds the edge with the smallest slack that is incident on tree and returns
 * it.
 */
function findMinSlackEdge(t: Graph, g: Graph) {
  const edges = g.edges();

  return edges.reduce((acc, curEdge) => {
    let edgeSlack = Number.POSITIVE_INFINITY;
    if (t.hasNode(curEdge.v) !== t.hasNode(curEdge.w)) {
      edgeSlack = slack(g, curEdge);
    }

    if (edgeSlack < acc.slack) {
      return { slack: edgeSlack, edge: curEdge };
    }

    return acc;
  }, { slack: Number.POSITIVE_INFINITY, edge: null } as { slack: number, edge: Edge | null }).edge;
}

function shiftRanks(t: Graph, g: Graph, delta: number) {
  t.nodes().forEach((v) => g.node(v).rank += delta);
}
