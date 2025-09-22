import type { Graph } from '@dagrejs/graphlib';
import { addBorderNode, addDummyNode } from './util.js';

// eslint-disable-next-line @typescript-eslint/max-params
function dfs(graph: Graph, root: string, nodeSep: number, weight: number, height: number, depths: Record<string, number>, nodeName: string) {
  const children = graph.children(nodeName);
  if (!children.length) {
    if (nodeName !== root) {
      graph.setEdge(root, nodeName, { weight: 0, minlen: nodeSep });
    }
    return;
  }

  const top = addBorderNode(graph, '_bt');
  const bottom = addBorderNode(graph, '_bb');
  const label = graph.node(nodeName);

  graph.setParent(top, nodeName);
  label.borderTop = top;
  graph.setParent(bottom, nodeName);
  label.borderBottom = bottom;

  children.forEach((child) => {
    dfs(graph, root, nodeSep, weight, height, depths, child);

    const childNode = graph.node(child);
    const childTop = childNode.borderTop ?? child;
    const childBottom = childNode.borderBottom ?? child;
    const thisWeight = childNode.borderTop ? weight : 2 * weight;
    const minlen = childTop !== childBottom ? 1 : height - ((depths[nodeName] ?? 0) + 1);

    graph.setEdge(top, childTop, {
      weight: thisWeight,
      minlen,
      nestingEdge: true
    });

    graph.setEdge(childBottom, bottom, {
      weight: thisWeight,
      minlen,
      nestingEdge: true
    });
  });

  if (!graph.parent(nodeName)) {
    graph.setEdge(root, top, { weight: 0, minlen: height + (depths[nodeName] ?? 0) });
  }
}

function treeDepths(graph: Graph) {
  const depths: Record<string, number> = {};

  function internalDfs(nodeName: string, depth: number) {
    const children = graph.children(nodeName);
    if (children?.length) {
      children.forEach((child) => internalDfs(child, depth + 1));
    }
    depths[nodeName] = depth;
  }

  // @ts-expect-error
  graph.children().forEach((child) => internalDfs(child, 1));

  return depths;
}

function sumWeights(graph: Graph) {
  return graph.edges().reduce((acc, edge) => acc + graph.edge(edge).weight, 0);
}

export function cleanup(graph: Graph) {
  const graphLabel = graph.graph();
  graph.removeNode(graphLabel.nestingRoot);
  delete graphLabel.nestingRoot;
  graph.edges().forEach((edge) => {
    const edgeData = graph.edge(edge);
    if (edgeData.nestingEdge) {
      graph.removeEdge(edge);
    }
  });
}

/*
 * A nesting graph creates dummy nodes for the tops and bottoms of subgraphs,
 * adds appropriate edges to ensure that all cluster nodes are placed between
 * these boundaries, and ensures that the graph is connected.
 *
 * In addition we ensure, through the use of the minlen property, that nodes
 * and subgraph border nodes to not end up on the same rank.
 *
 * Preconditions:
 *
 *    1. Input graph is a DAG
 *    2. Nodes in the input graph has a minlen attribute
 *
 * Postconditions:
 *
 *    1. Input graph is connected.
 *    2. Dummy nodes are added for the tops and bottoms of subgraphs.
 *    3. The minlen attribute for nodes is adjusted to ensure nodes do not
 *       get placed on the same rank as subgraph border nodes.
 *
 * The nesting graph idea comes from Sander, "Layout of Compound Directed
 * Graphs."
 */
export function run(graph: Graph) {
  const root = addDummyNode(graph, 'root', {}, '_root');
  const depths = treeDepths(graph);
  // NOTE: depths is an Object not an array
  const height = Math.max(...Object.values(depths)) - 1;
  const nodeSep = 2 * height + 1;

  graph.graph().nestingRoot = root;

  // Multiply minlen by nodeSep to align nodes on non-border ranks.
  graph.edges().forEach((edge) => {
    graph.edge(edge).minlen *= nodeSep;
  });

  // Calculate a weight that is sufficient to keep subgraphs vertically compact
  const weight = sumWeights(graph) + 1;

  // Create border nodes and link them up
  // @ts-expect-error
  graph.children().forEach((child) => dfs(graph, root, nodeSep, weight, height, depths, child));

  // Save the multiplier for node layers for later removal of empty border
  // layers.
  graph.graph().nodeRankFactor = nodeSep;
}
