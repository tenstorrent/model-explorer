import { alg, type Edge, type Graph } from '@dagrejs/graphlib';
import { feasibleTree } from './feasible-tree.js';
import { longestPath, slack } from './rank-util.js';
import { simplify } from './util.js';

// Expose some internals for testing purposes
networkSimplex.initLowLimValues = initLowLimValues;
networkSimplex.initCutValues = initCutValues;
networkSimplex.calcCutValue = calcCutValue;
networkSimplex.leaveEdge = leaveEdge;
networkSimplex.enterEdge = enterEdge;
networkSimplex.exchangeEdges = exchangeEdges;

/*
 * The network simplex algorithm assigns ranks to each node in the input graph
 * and iteratively improves the ranking to reduce the length of edges.
 *
 * Preconditions:
 *
 *    1. The input graph must be a DAG.
 *    2. All nodes in the graph must have an object value.
 *    3. All edges in the graph must have "minlen" and "weight" attributes.
 *
 * Postconditions:
 *
 *    1. All nodes in the graph will have an assigned "rank" attribute that has
 *       been optimized by the network simplex algorithm. Ranks start at 0.
 *
 * A rough sketch of the algorithm is as follows:
 *
 *    1. Assign initial ranks to each node. We use the longest path algorithm,
 *       which assigns ranks to the lowest position possible. In general this
 *       leads to very wide bottom ranks and unnecessarily long edges.
 *    2. Construct a feasible tight tree. A tight tree is one such that all
 *       edges in the tree have no slack (difference between length of edge
 *       and minlen for the edge). This by itself greatly improves the assigned
 *       rankings by shorting edges.
 *    3. Iteratively find edges that have negative cut values. Generally a
 *       negative cut value indicates that the edge could be removed and a new
 *       tree edge could be added to produce a more compact graph.
 *
 * Much of the algorithms here are derived from Gansner, et al., "A Technique
 * for Drawing Directed Graphs." The structure of the file roughly follows the
 * structure of the overall algorithm.
 */
export function networkSimplex(g: Graph) {
  g = simplify(g);
  longestPath(g);
  var t = feasibleTree(g);
  initLowLimValues(t);
  initCutValues(t, g);

  var e, f;
  while ((e = leaveEdge(t))) {
    f = enterEdge(t, g, e);
    exchangeEdges(t, g, e, f);
  }
}

/*
 * Initializes cut values for all edges in the tree.
 */
function initCutValues(t: Graph, g: Graph) {
  var vs = alg.postorder(t, t.nodes());
  vs = vs.slice(0, vs.length - 1);
  vs.forEach((v) => assignCutValue(t, g, v));
}

function assignCutValue(t: Graph, g: Graph, child: string) {
  var childLab = t.node(child);
  var parent = childLab.parent;
  t.edge(child, parent).cutvalue = calcCutValue(t, g, child);
}

/*
 * Given the tight tree, its graph, and a child in the graph calculate and
 * return the cut value for the edge between the child and its parent.
 */
function calcCutValue(t: Graph, g: Graph, child: string) {
  var childLab = t.node(child);
  var parent = childLab.parent;
  // True if the child is on the tail end of the edge in the directed graph
  var childIsTail = true;
  // The graph's view of the tree edge we're inspecting
  var graphEdge = g.edge(child, parent);
  // The accumulated cut value for the edge between this node and its parent
  var cutValue = 0;

  if (!graphEdge) {
    childIsTail = false;
    graphEdge = g.edge(parent, child);
  }

  cutValue = graphEdge.weight;

  g.nodeEdges(child)?.forEach((e) => {
    var isOutEdge = e.v === child,
      other = isOutEdge ? e.w : e.v;

    if (other !== parent) {
      var pointsToHead = isOutEdge === childIsTail,
        otherWeight = g.edge(e).weight;

      cutValue += pointsToHead ? otherWeight : -otherWeight;
      if (isTreeEdge(t, child, other)) {
        var otherCutValue = t.edge(child, other).cutvalue;
        cutValue += pointsToHead ? -otherCutValue : otherCutValue;
      }
    }
  });

  return cutValue;
}

function initLowLimValues(tree: Graph, root?: string) {
  if (arguments.length < 2) {
    root = tree.nodes()[0];
  }
  // The following code would throw "maximum call stack size exceeded" error
  // when handling large graphs. Change it to using an iterative version.
  //
  // dfsAssignLowLim(tree, {}, 1, root);

  dfsAssignLowLimIterative(tree, {}, 1, root);
}

function dfsAssignLowLim(tree: Graph, visited: Record<string, boolean>, nextLim: number, v: string, parent: string) {
  var low = nextLim;
  var label = tree.node(v);

  visited[v] = true;
  tree.neighbors(v)?.forEach((w) => {
    if (!visited.hasOwnProperty(w)) {
      nextLim = dfsAssignLowLim(tree, visited, nextLim, w, v);
    }
  });

  label.low = low;
  label.lim = nextLim++;
  if (parent) {
    label.parent = parent;
  } else {
    // TODO should be able to remove this when we incrementally update low lim
    delete label.parent;
  }

  return nextLim;
}

function dfsAssignLowLimIterative(tree: Graph, visited: Record<string, boolean>, nextLim: number, startNode?: string, parent = null) {
  const stack = [];
  const lowLimStack = [];

  stack.push({ v: startNode, parent: parent, stage: 0 });

  while (stack.length > 0) {
    let { v, parent, stage }: Partial<{ v: string, parent: string | null, stage: number }> = stack.pop() ?? {};
    let label = tree.node(v ?? '');

    // Stage 0 means this node is being processed for the first time
    if (stage === 0) {
      visited[v ?? ''] = true;
      var low = nextLim;
      label.low = low;
      lowLimStack.push({ node: v, low });

      // Mark the node as in-process and push it back to the stack
      stack.push({ v, parent, stage: 1 });

      // Process its neighbors
      let neighbors: string[] = tree.neighbors(v ?? '') ?? [];
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const w = neighbors[i];
        if (!visited.hasOwnProperty(w)) {
          // Push neighbor node onto the stack
          stack.push({ v: w, parent: v, stage: 0 });
        }
      }
    } // Stage 1 means we are returning to the node after processing all its neighbors
    else if (stage === 1) {
      // Assign limits and update parent information
      let lim = nextLim++;
      label.lim = lim;

      if (parent) {
        label.parent = parent;
      } else {
        delete label.parent;
      }

      let lowLimNode = lowLimStack.pop();
      label.low = lowLimNode?.low;
    }
  }

  return nextLim;
}

function leaveEdge(tree: Graph) {
  return tree.edges().find((e) => tree.edge(e).cutvalue < 0);
}

function enterEdge(t: Graph, g: Graph, edge: Edge) {
  var v = edge.v;
  var w = edge.w;

  // For the rest of this function we assume that v is the tail and w is the
  // head, so if we don't have this edge in the graph we should flip it to
  // match the correct orientation.
  if (!g.hasEdge(v, w)) {
    v = edge.w;
    w = edge.v;
  }

  var vLabel = t.node(v);
  var wLabel = t.node(w);
  var tailLabel = vLabel;
  var flip = false;

  // If the root is in the tail of the edge then we need to flip the logic that
  // checks for the head and tail nodes in the candidates function below.
  if (vLabel.lim > wLabel.lim) {
    tailLabel = wLabel;
    flip = true;
  }

  var candidates = g.edges().filter((edge) => {
    return flip === isDescendant(t, t.node(edge.v), tailLabel) &&
      flip !== isDescendant(t, t.node(edge.w), tailLabel);
  });

  return candidates.reduce((acc, edge: Edge) => {
    if (slack(g, edge) < slack(g, acc)) {
      return edge;
    }

    return acc;
  });
}

function exchangeEdges(t: Graph, g: Graph, e: Edge, f: Edge) {
  var v = e.v;
  var w = e.w;
  t.removeEdge(v, w);
  t.setEdge(f.v, f.w, {});
  initLowLimValues(t);
  initCutValues(t, g);
  updateRanks(t, g);
}

function updateRanks(t: Graph, g: Graph) {
  var root = t.nodes().find((v) => !g.node(v).parent) ?? '';
  var vs = alg.preorder(t, [root]);
  vs = vs.slice(1);
  vs.forEach((v) => {
    var parent = t.node(v).parent,
      edge = g.edge(v, parent),
      flipped = false;

    if (!edge) {
      edge = g.edge(parent, v);
      flipped = true;
    }

    g.node(v).rank = g.node(parent).rank + (flipped ? edge.minlen : -edge.minlen);
  });
}

/*
 * Returns true if the edge is in the tree.
 */
function isTreeEdge(tree: Graph, u: string, v: string) {
  return tree.hasEdge(u, v);
}

/*
 * Returns true if the specified node is descendant of the root node per the
 * assigned low and lim attributes in the tree.
 */
function isDescendant(tree: Graph, vLabel: any, rootLabel: any) {
  return rootLabel.low <= vLabel.lim && vLabel.lim <= rootLabel.lim;
}
