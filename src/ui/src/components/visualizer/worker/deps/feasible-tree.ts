import { type Edge, Graph } from '@dagrejs/graphlib';
import { slack } from './rank-util.js';

/*
 * Finds a maximal tree of tight edges and returns the number of nodes in the
 * tree.
 */
function tightTree(t: Graph, graph: Graph) {
  function dfs(edgeName: string) {
    graph.nodeEdges(edgeName)?.forEach((edge) => {
      const edgeV = edge.v;
      const w = (edgeName === edgeV) ? edge.w : edgeV;
      if (!t.hasNode(w) && !slack(graph, edge)) {
        t.setNode(w, {});
        t.setEdge(edgeName, w, {});
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
function findMinSlackEdge(tree: Graph, graph: Graph) {
  const edges = graph.edges();

  return edges.reduce<{ slack: number, edge: Edge | null }>((acc, curEdge) => {
    let edgeSlack = Number.POSITIVE_INFINITY;
    if (tree.hasNode(curEdge.v) !== tree.hasNode(curEdge.w)) {
      edgeSlack = slack(graph, curEdge);
    }

    if (edgeSlack < acc.slack) {
      return { slack: edgeSlack, edge: curEdge };
    }

    return acc;
  }, { slack: Number.POSITIVE_INFINITY, edge: null }).edge;
}

function shiftRanks(tree: Graph, graph: Graph, delta: number) {
  tree.nodes().forEach((node) => {
    graph.node(node).rank += delta;
  });
}

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
  const [start] = graph.nodes();

  if (!start) {
    return;
  }

  const size = graph.nodeCount();
  t.setNode(start, {});

  let delta;
  let edge: Edge | null;
  while (tightTree(t, graph) < size) {
    edge = findMinSlackEdge(t, graph);
    if (edge) {
      delta = t.hasNode(edge.v) ? slack(graph, edge) : -slack(graph, edge);
      shiftRanks(t, graph, delta);
    }
  }

  return t;
}
