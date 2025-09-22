import { alg, type Edge, type Graph } from '@dagrejs/graphlib';
import { feasibleTree } from './feasible-tree.js';
import { longestPath, slack } from './rank-util.js';
import { simplify } from './util.js';

/*
 * Returns true if the edge is in the tree.
 */
function isTreeEdge(tree: Graph, edgeSource: string, edgeSink: string) {
  return tree.hasEdge(edgeSource, edgeSink);
}

/*
 * Given the tight tree, its graph, and a child in the graph calculate and
 * return the cut value for the edge between the child and its parent.
 */
function calcCutValue(tree: Graph, graph: Graph, child: string) {
  const childLab = tree.node(child);
  const { parent } = childLab;
  // True if the child is on the tail end of the edge in the directed graph
  let childIsTail = true;
  // The graph's view of the tree edge we're inspecting
  let graphEdge = graph.edge(child, parent);
  // The accumulated cut value for the edge between this node and its parent
  let cutValue = 0;

  if (!graphEdge) {
    childIsTail = false;
    graphEdge = graph.edge(parent, child);
  }

  cutValue = graphEdge.weight;

  graph.nodeEdges(child)?.forEach((e) => {
    const isOutEdge = e.v === child;
    const other = isOutEdge ? e.w : e.v;

    if (other !== parent) {
      const pointsToHead = isOutEdge === childIsTail;
      const otherWeight = graph.edge(e).weight;

      cutValue += pointsToHead ? otherWeight : -otherWeight;
      if (isTreeEdge(tree, child, other)) {
        const otherCutValue = tree.edge(child, other).cutvalue;
        cutValue += pointsToHead ? -otherCutValue : otherCutValue;
      }
    }
  });

  return cutValue;
}

function assignCutValue(tree: Graph, graph: Graph, child: string) {
  const childLab = tree.node(child);
  const { parent } = childLab;
  tree.edge(child, parent).cutvalue = calcCutValue(tree, graph, child);
}
/*
 * Initializes cut values for all edges in the tree.
 */
function initCutValues(t: Graph, graph: Graph) {
  let nodeList = alg.postorder(t, t.nodes());
  nodeList = nodeList.slice(0, nodeList.length - 1);
  nodeList.forEach((nodeName) => assignCutValue(t, graph, nodeName));
}

function dfsAssignLowLimIterative(tree: Graph, visited: Record<string, boolean>, nextLim: number, startNode?: string, parent = null) {
  let newLim = nextLim;

  const stack = [];
  const lowLimStack = [];

  stack.push({ v: startNode, parent, stage: 0 });

  while (stack.length > 0) {
    const { v, parent, stage }: Partial<{ v: string, parent: string | null, stage: number }> = stack.pop() ?? {};
    const label = tree.node(v ?? '');

    // Stage 0 means this node is being processed for the first time
    if (stage === 0) {
      visited[v ?? ''] = true;
      const low = newLim;
      label.low = low;
      lowLimStack.push({ node: v, low });

      // Mark the node as in-process and push it back to the stack
      stack.push({ v, parent, stage: 1 });

      // Process its neighbors
      const neighbors: string[] = tree.neighbors(v ?? '') ?? [];
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const w = neighbors[i];
        if (!visited['w']) {
          // Push neighbor node onto the stack
          stack.push({ v: w, parent: v, stage: 0 });
        }
      }
    } // Stage 1 means we are returning to the node after processing all its neighbors
    else if (stage === 1) {
      // Assign limits and update parent information
      newLim += 1;

      const lim = newLim;
      label.lim = lim;

      if (parent) {
        label.parent = parent;
      } else {
        delete label.parent;
      }

      const lowLimNode = lowLimStack.pop();
      label.low = lowLimNode?.low;
    }
  }

  return newLim;
}

function initLowLimValues(tree: Graph, root?: string) {
  const treeRoot = root ?? tree.nodes()[0];

  // The following code would throw "maximum call stack size exceeded" error
  // when handling large graphs. Change it to using an iterative version.
  //
  // dfsAssignLowLim(tree, {}, 1, root);

  dfsAssignLowLimIterative(tree, {}, 1, treeRoot);
}

function leaveEdge(tree: Graph) {
  return tree.edges().find((edge) => tree.edge(edge).cutvalue < 0);
}

/*
 * Returns true if the specified node is descendant of the root node per the
 * assigned low and lim attributes in the tree.
 */
function isDescendant(_tree: Graph, vLabel: any, rootLabel: any) {
  return rootLabel.low <= vLabel.lim && vLabel.lim <= rootLabel.lim;
}

function enterEdge(t: Graph, graph: Graph, edge: Edge) {
  let { v } = edge;
  let { w } = edge;

  // For the rest of this function we assume that v is the tail and w is the
  // head, so if we don't have this edge in the graph we should flip it to
  // match the correct orientation.
  if (!graph.hasEdge(v, w)) {
    v = edge.w;
    w = edge.v;
  }

  const vLabel = t.node(v);
  const wLabel = t.node(w);
  let tailLabel = vLabel;
  let flip = false;

  // If the root is in the tail of the edge then we need to flip the logic that
  // checks for the head and tail nodes in the candidates function below.
  if (vLabel.lim > wLabel.lim) {
    tailLabel = wLabel;
    flip = true;
  }

  const candidates = graph.edges().filter((curEdge) =>
    flip === isDescendant(t, t.node(curEdge.v), tailLabel) &&
    flip !== isDescendant(t, t.node(curEdge.w), tailLabel)
  );

  return candidates.reduce((acc, curEdge: Edge) => {
    if (slack(graph, curEdge) < slack(graph, acc)) {
      return curEdge;
    }

    return acc;
  });
}

function updateRanks(tree: Graph, graph: Graph) {
  const root = tree.nodes().find((nodeName) => !graph.node(nodeName).parent) ?? '';
  let nodeList = alg.preorder(tree, [root]);
  nodeList = nodeList.slice(1);
  nodeList.forEach((nodeName) => {
    const { parent } = tree.node(nodeName);
    let edge = graph.edge(nodeName, parent);
    let flipped = false;

    if (!edge) {
      edge = graph.edge(parent, nodeName);
      flipped = true;
    }

    graph.node(nodeName).rank = graph.node(parent).rank + (flipped ? edge.minlen : -edge.minlen);
  });
}

function exchangeEdges(t: Graph, graph: Graph, edgeA: Edge, edgeB: Edge) {
  const { v } = edgeA;
  const { w } = edgeA;
  t.removeEdge(v, w);
  t.setEdge(edgeB.v, edgeB.w, {});
  initLowLimValues(t);
  initCutValues(t, graph);
  updateRanks(t, graph);
}

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
export function networkSimplex(graph: Graph) {
  const simplifiedGraph = simplify(graph);
  longestPath(simplifiedGraph);
  const tree = feasibleTree(simplifiedGraph);

  if (!tree) {
    return;
  }

  initLowLimValues(tree);
  initCutValues(tree, simplifiedGraph);

  let edgeA;
  let edgeB;
  do {
    edgeA = leaveEdge(tree);

    if (edgeA) {
      edgeB = enterEdge(tree, simplifiedGraph, edgeA);
      exchangeEdges(tree, simplifiedGraph, edgeA, edgeB);
    }
  } while (edgeA);
}

// Expose some internals for testing purposes
networkSimplex.initLowLimValues = initLowLimValues;
networkSimplex.initCutValues = initCutValues;
networkSimplex.calcCutValue = calcCutValue;
networkSimplex.leaveEdge = leaveEdge;
networkSimplex.enterEdge = enterEdge;
networkSimplex.exchangeEdges = exchangeEdges;
