import { Graph } from '@dagrejs/graphlib';
import { uniqueId } from './util.js';

function createRootNode(graph: Graph) {
  let rootName;

  do {
    rootName = uniqueId('_root');
  } while (graph.hasNode(rootName));

  return rootName;
}

/*
 * Constructs a graph that can be used to sort a layer of nodes. The graph will
 * contain all base and subgraph nodes from the request layer in their original
 * hierarchy and any edges that are incident on these nodes and are of the type
 * requested by the "relationship" parameter.
 *
 * Nodes from the requested rank that do not have parents are assigned a root
 * node in the output graph, which is set in the root graph attribute. This
 * makes it easy to walk the hierarchy of movable nodes during ordering.
 *
 * Pre-conditions:
 *
 *    1. Input graph is a DAG
 *    2. Base nodes in the input graph have a rank attribute
 *    3. Subgraph nodes in the input graph has minRank and maxRank attributes
 *    4. Edges have an assigned weight
 *
 * Post-conditions:
 *
 *    1. Output graph has all nodes in the movable rank with preserved
 *       hierarchy.
 *    2. Root nodes in the movable layer are made children of the node
 *       indicated by the root attribute of the graph.
 *    3. Non-movable nodes incident on movable nodes, selected by the
 *       relationship parameter, are included in the graph (without hierarchy).
 *    4. Edges incident on movable nodes, selected by the relationship
 *       parameter, are added to the output graph.
 *    5. The weights for copied edges are aggregated as need, since the output
 *       graph is not a multi-graph.
 */
export function buildLayerGraph(graph: Graph, rank: number, relationship: 'inEdges' | 'outEdges') {
  const root = createRootNode(graph);
  const result = new Graph({ compound: true }).setGraph({ root })
    .setDefaultNodeLabel((nodeLabel: string) => graph.node(nodeLabel));

  graph.nodes().forEach((nodeId) => {
    const node = graph.node(nodeId);
    const parentNode = graph.parent(nodeId);

    if (!node) {
      return;
    }

    if (node.rank === rank || node.minRank <= rank && rank <= node.maxRank) {
      result.setNode(nodeId);
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      result.setParent(nodeId, parentNode || root);

      // This assumes we have only short edges!
      graph[relationship](nodeId)?.forEach((currentEdge) => {
        const u = currentEdge.v === nodeId ? currentEdge.w : currentEdge.v;
        const edge = result.edge(u, nodeId);
        const weight = edge !== undefined ? edge.weight : 0;
        result.setEdge(u, nodeId, { weight: graph.edge(currentEdge).weight + weight });
      });

      if (node.minRank) {
        result.setNode(nodeId, {
          borderLeft: node.borderLeft[rank],
          borderRight: node.borderRight[rank]
        });
      }
    }
  });

  return result;
}
