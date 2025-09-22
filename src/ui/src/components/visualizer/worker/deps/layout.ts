import { Graph } from '@dagrejs/graphlib';
import type { Point, Rect } from '../../common/types.js';
import * as acyclic from './acyclic.js';
import { addBorderSegments } from './add-border-segments.js';
import * as coordinateSystem from './coordinate-system.js';
import * as nestingGraph from './nesting-graph.js';
import * as normalize from './normalize.js';
import { order } from './order.js';
import { parentDummyChains } from './parent-dummy-chains.js';
import { position } from './position.js';
import { rank } from './rank.js';
import { addDummyNode, asNonCompoundGraph, buildLayerMatrix, intersectRect, normalizeRanks, removeEmptyRanks, time } from './util.js';

/*
 * Copies final layout information from the layout graph back to the input
 * graph. This process only copies whitelisted attributes from the layout graph
 * to the input graph, so it serves as a good place to determine what
 * attributes can influence layout.
 */
function updateInputGraph(inputGraph: Graph, layoutGraph: Graph) {
  inputGraph.nodes().forEach((nodeName) => {
    const inputLabel = inputGraph.node(nodeName);
    const layoutLabel = layoutGraph.node(nodeName);

    if (inputLabel) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
      inputLabel.rank = layoutLabel.rank;

      if (layoutGraph.children(nodeName).length) {
        inputLabel.width = layoutLabel.width;
        inputLabel.height = layoutLabel.height;
      }
    }
  });

  inputGraph.edges().forEach((edge) => {
    const inputLabel = inputGraph.edge(edge);
    const layoutLabel = layoutGraph.edge(edge);

    inputLabel.points = layoutLabel.points;
    if (layoutLabel.x !== null && layoutLabel.x !== undefined) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
    }
  });

  inputGraph.graph().width = layoutGraph.graph().width;
  inputGraph.graph().height = layoutGraph.graph().height;
}

function assignRankMinMax(graph: Graph) {
  let maxRank = 0;
  graph.nodes().forEach((nodeName) => {
    const node = graph.node(nodeName);
    if (node.borderTop) {
      node.minRank = graph.node(node.borderTop)?.rank ?? 0;
      node.maxRank = graph.node(node.borderBottom)?.rank ?? 0;
      maxRank = Math.max(maxRank, node.maxRank);
    }
  });
  graph.graph().maxRank = maxRank;
}

function removeEdgeLabelProxies(graph: Graph) {
  graph.nodes().forEach((nodeName) => {
    const node = graph.node(nodeName);
    if (node.dummy === 'edge-proxy') {
      graph.edge(node.e).labelRank = node.rank;
      graph.removeNode(nodeName);
    }
  });
}

function translateGraph(graph: Graph) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = 0;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = 0;
  const graphLabel = graph.graph();
  const marginX = graphLabel.marginx || 0;
  const marginY = graphLabel.marginy || 0;

  function getExtremes(attrs: Rect) {
    if (!attrs) {
      return;
    }

    const x = attrs?.x ?? 0;
    const y = attrs?.y ?? 0;
    const w = attrs?.width ?? 0;
    const h = attrs?.height ?? 0;
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2);
    maxY = Math.max(maxY, y + h / 2);
  }

  graph.nodes().forEach((nodeName) => getExtremes(graph.node(nodeName)));
  graph.edges().forEach((edge) => {
    const edgeData = graph.edge(edge);
    if (edgeData.x !== null && edgeData.x !== undefined) {
      getExtremes(edgeData);
    }
  });

  minX -= marginX;
  minY -= marginY;

  graph.nodes().forEach((nodeName) => {
    const node = graph.node(nodeName);

    if (!node) {
      return;
    }

    node.x -= minX;
    node.y -= minY;
  });

  graph.edges().forEach((edge) => {
    const edgeData = graph.edge(edge);
    if (!edgeData) {
      return;
    }

    edgeData.points.forEach((point: Point) => {
      point.x -= minX;
      point.y -= minY;
    });
    if (edgeData.x !== null && edgeData.x !== undefined) { edgeData.x -= minX; }
    if (edgeData.y !== null && edgeData.y !== undefined) { edgeData.y -= minY; }
  });

  graphLabel.width = maxX - minX + marginX;
  graphLabel.height = maxY - minY + marginY;
}

function assignNodeIntersects(graph: Graph) {
  graph.edges().forEach((edge) => {
    const edgeData = graph.edge(edge);
    const nodeV = graph.node(edge.v);
    const nodeW = graph.node(edge.w);
    let p1;
    let p2;
    if (!edgeData.points) {
      edgeData.points = [];
      p1 = nodeW;
      p2 = nodeV;
    } else {
      p1 = edgeData.points[0];
      p2 = edgeData.points[edgeData.points.length - 1];
    }
    edgeData.points.unshift(intersectRect(nodeV, p1));
    edgeData.points.push(intersectRect(nodeW, p2));
  });
}

function fixupEdgeLabelCoords(g: Graph) {
  g.edges().forEach((e) => {
    const edge = g.edge(e);
    if (edge.hasOwnProperty('x')) {
      if (edge.labelpos === 'l' || edge.labelpos === 'r') {
        edge.width -= edge.labeloffset;
      }
      switch (edge.labelpos) {
        case 'l':
          edge.x -= edge.width / 2 + edge.labeloffset;
          break;
        case 'r':
          edge.x += edge.width / 2 + edge.labeloffset;
          break;
      }
    }
  });
}

function reversePointsForReversedEdges(g: Graph) {
  g.edges().forEach((e) => {
    const edge = g.edge(e);
    if (edge.reversed) {
      edge.points.reverse();
    }
  });
}

function removeBorderNodes(g: Graph) {
  g.nodes().forEach((v) => {
    if (g.children(v).length) {
      const node = g.node(v);

      if (!node) {
        return;
      }

      const t = g.node(node.borderTop);
      const b = g.node(node.borderBottom);
      const l = g.node(node.borderLeft[node.borderLeft.length - 1]);
      const r = g.node(node.borderRight[node.borderRight.length - 1]);

      node.width = Math.abs(r.x - l.x);
      node.height = Math.abs(b.y - t.y);
      node.x = l.x + node.width / 2;
      node.y = t.y + node.height / 2;
    }
  });

  g.nodes().forEach((v) => {
    if (g.node(v)?.dummy === 'border') {
      g.removeNode(v);
    }
  });
}

function insertSelfEdges(g: Graph) {
  const layers = buildLayerMatrix(g);
  layers.forEach((layer) => {
    let orderShift = 0;
    layer.forEach((v, i) => {
      const node = g.node(v);
      node.order = i + orderShift;
      (node.selfEdges || []).forEach((selfEdge: any) => {
        addDummyNode(g, 'selfedge', {
          width: selfEdge.label.width,
          height: selfEdge.label.height,
          rank: node.rank,
          order: i + (++orderShift),
          e: selfEdge.e,
          label: selfEdge.label
        }, '_se');
      });
      delete node.selfEdges;
    });
  });
}

function positionSelfEdges(g: Graph) {
  g.nodes().forEach((v) => {
    const node = g.node(v);
    if (node?.dummy === 'selfedge') {
      const selfNode = g.node(node.e.v);
      const x = selfNode.x + selfNode.width / 2;
      const { y } = selfNode;
      const dx = node.x - x;
      const dy = selfNode.height / 2;
      g.setEdge(node.e, node.label);
      g.removeNode(v);
      node.label.points = [
        { x: x + 2 * dx / 3, y: y - dy },
        { x: x + 5 * dx / 6, y: y - dy },
        { x: x + dx, y },
        { x: x + 5 * dx / 6, y: y + dy },
        { x: x + 2 * dx / 3, y: y + dy }
      ];
      node.label.x = node.x;
      node.label.y = node.y;
    }
  });
}

function canonicalize(attrs: Record<string, any>) {
  const newAttrs: Record<string, any> = {};
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (typeof k === 'string') {
        k = k.toLowerCase();
      }

      newAttrs[k] = v;
    });
  }
  return newAttrs;
}

/*
 * Constructs a new graph from the input graph, which can be used for layout.
 * This process copies only whitelisted attributes from the input graph to the
 * layout graph. Thus this function serves as a good place to determine what
 * attributes can influence layout.
 */
function buildLayoutGraph(inputGraph: Graph) {
  const g = new Graph({ multigraph: true, compound: true });
  const graph = canonicalize(inputGraph.graph());

  g.setGraph({
    ranksep: graph['ranksep'] ?? 50,
    edgesep: graph['edgesep'] ?? 20,
    nodesep: graph['nodesep'] ?? 50,
    rankdir: graph['rankdir'] ?? 'tb',
    marginx: graph['marginx'],
    marginy: graph['marginy'],
    acyclicer: graph['acyclicer'],
    ranker: graph['ranker'],
    align: graph['align']
  });

  inputGraph.nodes().forEach((v) => {
    const node = canonicalize(inputGraph.node(v));
    const newNode = { width: node?.['width'] ?? 0, height: node?.['height'] ?? 0 };

    g.setNode(v, newNode);
    g.setParent(v, inputGraph.parent(v) ?? undefined);
  });

  inputGraph.edges().forEach((e) => {
    const edge = canonicalize(inputGraph.edge(e));

    g.setEdge(e, {
      minlen: edge['minlen'] ?? 1,
      weight: edge['weight'] ?? 1,
      width: edge['width'] ?? 0,
      height: edge['height'] ?? 0,
      labeloffset: edge['labeloffset'] ?? 10,
      labelpos: edge['labelpos'] ?? 'r'
    });
  });

  return g;
}

/*
 * This idea comes from the Gansner paper: to account for edge labels in our
 * layout we split each rank in half by doubling minlen and halving ranksep.
 * Then we can place labels at these mid-points between nodes.
 *
 * We also add some minimal padding to the width to push the label for the edge
 * away from the edge itself a bit.
 */
function makeSpaceForEdgeLabels(graph: Graph) {
  const graphData = graph.graph();
  graphData.ranksep /= 2;
  graph.edges().forEach((edge) => {
    const edgeData = graph.edge(edge);
    edgeData.minlen *= 2;
    if (edgeData.labelpos.toLowerCase() !== 'c') {
      if (graphData.rankdir === 'TB' || graphData.rankdir === 'BT') {
        edgeData.width += edgeData.labeloffset;
      } else {
        edgeData.height += edgeData.labeloffset;
      }
    }
  });
}

/*
 * Creates temporary dummy nodes that capture the rank in which each edge's
 * label is going to, if it has one of non-zero width and height. We do this
 * so that we can safely remove empty ranks while preserving balance for the
 * label's position.
 */
function injectEdgeLabelProxies(graph: Graph) {
  graph.edges().forEach((edge) => {
    const edgeData = graph.edge(edge);

    if (edgeData.width && edgeData.height) {
      const nodeV = graph.node(edge.v);
      const nodeW = graph.node(edge.w);
      const label = { rank: (nodeW.rank - nodeV.rank) / 2 + nodeV.rank, e: edge };

      addDummyNode(graph, 'edge-proxy', label, '_ep');
    }
  });
}

function removeSelfEdges(graph: Graph) {
  graph.edges().forEach((edge) => {
    if (edge.v === edge.w) {
      const node = graph.node(edge.v);
      node.selfEdges ??= [];
      node.selfEdges.push({ e: edge, label: graph.edge(edge) });
      graph.removeEdge(edge);
    }
  });
}

function runLayout(graph: Graph) {
  time('    makeSpaceForEdgeLabels', () => makeSpaceForEdgeLabels(graph));
  time('    removeSelfEdges', () => removeSelfEdges(graph));
  time('    acyclic', () => acyclic.run(graph));
  time('    nestingGraph.run', () => nestingGraph.run(graph));
  time('    rank', () => rank(asNonCompoundGraph(graph)));
  time('    injectEdgeLabelProxies', () => injectEdgeLabelProxies(graph));
  time('    removeEmptyRanks', () => removeEmptyRanks(graph));
  time('    nestingGraph.cleanup', () => nestingGraph.cleanup(graph));
  time('    normalizeRanks', () => normalizeRanks(graph));
  time('    assignRankMinMax', () => assignRankMinMax(graph));
  time('    removeEdgeLabelProxies', () => removeEdgeLabelProxies(graph));
  time('    normalize.run', () => normalize.run(graph));
  time('    parentDummyChains', () => parentDummyChains(graph));
  time('    addBorderSegments', () => addBorderSegments(graph));
  time('    order', () => order(graph, null, time));
  time('    insertSelfEdges', () => insertSelfEdges(graph));
  time('    adjustCoordinateSystem', () => coordinateSystem.adjust(graph));
  time('    position', () => position(graph));
  time('    positionSelfEdges', () => positionSelfEdges(graph));
  time('    removeBorderNodes', () => removeBorderNodes(graph));
  time('    normalize.undo', () => normalize.undo(graph));
  time('    fixupEdgeLabelCoords', () => fixupEdgeLabelCoords(graph));
  time('    undoCoordinateSystem', () => coordinateSystem.undo(graph));
  time('    translateGraph', () => translateGraph(graph));
  time('    assignNodeIntersects', () => assignNodeIntersects(graph));
  time('    reversePoints', () => reversePointsForReversedEdges(graph));
  time('    acyclic.undo', () => acyclic.undo(graph));
}

export function layout(graph: Graph) {
  time('layout', () => {
    const layoutGraph = time('  buildLayoutGraph', () => buildLayoutGraph(graph));
    time('  runLayout', () => runLayout(layoutGraph));
    time('  updateInputGraph', () => updateInputGraph(graph, layoutGraph));
  });
}
