import { Graph } from '@dagrejs/graphlib';
import type { Point, Rect } from '../../common/types.js';
import * as acyclic from './acyclic.js';
import { addBorderSegments } from './add-border-segments.js';
import * as coordinateSystem from './coordinate-system.js';
import * as nestingGraph from './nesting-graph.js';
import * as normalize from './normalize.js';
import { order } from './order.js';
import { parentDummyChains } from './parent-dummy-chains.js';
import { rank } from './rank.js';
import { addDummyNode, asNonCompoundGraph, buildLayerMatrix, intersectRect, normalizeRanks, removeEmptyRanks, time, uniqueId } from './util.js';
import { position } from './position.js';

/*
 * Copies final layout information from the layout graph back to the input
 * graph. This process only copies whitelisted attributes from the layout graph
 * to the input graph, so it serves as a good place to determine what
 * attributes can influence layout.
 */
function updateInputGraph(inputGraph: Graph, layoutGraph: Graph) {
  inputGraph.nodes().forEach((v) => {
    let inputLabel = inputGraph.node(v);
    let layoutLabel = layoutGraph.node(v);

    if (inputLabel) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
      inputLabel.rank = layoutLabel.rank;

      if (layoutGraph.children(v).length) {
        inputLabel.width = layoutLabel.width;
        inputLabel.height = layoutLabel.height;
      }
    }
  });

  inputGraph.edges().forEach((e) => {
    let inputLabel = inputGraph.edge(e);
    let layoutLabel = layoutGraph.edge(e);

    inputLabel.points = layoutLabel.points;
    if (layoutLabel.hasOwnProperty('x')) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
    }
  });

  inputGraph.graph().width = layoutGraph.graph().width;
  inputGraph.graph().height = layoutGraph.graph().height;
}

function assignRankMinMax(g: Graph) {
  let maxRank = 0;
  g.nodes().forEach((v) => {
    let node = g.node(v);
    if (node.borderTop) {
      node.minRank = g.node(node.borderTop).rank;
      node.maxRank = g.node(node.borderBottom).rank;
      maxRank = Math.max(maxRank, node.maxRank);
    }
  });
  g.graph().maxRank = maxRank;
}

function removeEdgeLabelProxies(g: Graph) {
  g.nodes().forEach((v) => {
    let node = g.node(v);
    if (node.dummy === 'edge-proxy') {
      g.edge(node.e).labelRank = node.rank;
      g.removeNode(v);
    }
  });
}

function translateGraph(g: Graph) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = 0;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = 0;
  let graphLabel = g.graph();
  let marginX = graphLabel.marginx || 0;
  let marginY = graphLabel.marginy || 0;

  function getExtremes(attrs: Rect) {
    let x = attrs.x;
    let y = attrs.y;
    let w = attrs.width;
    let h = attrs.height;
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2);
    maxY = Math.max(maxY, y + h / 2);
  }

  g.nodes().forEach((v) => getExtremes(g.node(v)));
  g.edges().forEach((e) => {
    let edge = g.edge(e);
    if (edge.hasOwnProperty('x')) {
      getExtremes(edge);
    }
  });

  minX -= marginX;
  minY -= marginY;

  g.nodes().forEach((v) => {
    let node = g.node(v);
    node.x -= minX;
    node.y -= minY;
  });

  g.edges().forEach((e) => {
    let edge = g.edge(e);
    edge.points.forEach((p: Point) => {
      p.x -= minX;
      p.y -= minY;
    });
    if (edge.hasOwnProperty('x')) { edge.x -= minX; }
    if (edge.hasOwnProperty('y')) { edge.y -= minY; }
  });

  graphLabel.width = maxX - minX + marginX;
  graphLabel.height = maxY - minY + marginY;
}

function assignNodeIntersects(g: Graph) {
  g.edges().forEach((e) => {
    let edge = g.edge(e);
    let nodeV = g.node(e.v);
    let nodeW = g.node(e.w);
    let p1, p2;
    if (!edge.points) {
      edge.points = [];
      p1 = nodeW;
      p2 = nodeV;
    } else {
      p1 = edge.points[0];
      p2 = edge.points[edge.points.length - 1];
    }
    edge.points.unshift(intersectRect(nodeV, p1));
    edge.points.push(intersectRect(nodeW, p2));
  });
}

function fixupEdgeLabelCoords(g: Graph) {
  g.edges().forEach((e) => {
    let edge = g.edge(e);
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
    let edge = g.edge(e);
    if (edge.reversed) {
      edge.points.reverse();
    }
  });
}

function removeBorderNodes(g: Graph) {
  g.nodes().forEach((v) => {
    if (g.children(v).length) {
      let node = g.node(v);
      let t = g.node(node.borderTop);
      let b = g.node(node.borderBottom);
      let l = g.node(node.borderLeft[node.borderLeft.length - 1]);
      let r = g.node(node.borderRight[node.borderRight.length - 1]);

      node.width = Math.abs(r.x - l.x);
      node.height = Math.abs(b.y - t.y);
      node.x = l.x + node.width / 2;
      node.y = t.y + node.height / 2;
    }
  });

  g.nodes().forEach((v) => {
    if (g.node(v).dummy === 'border') {
      g.removeNode(v);
    }
  });
}

function insertSelfEdges(g: Graph) {
  var layers = buildLayerMatrix(g);
  layers.forEach((layer) => {
    var orderShift = 0;
    layer.forEach((v, i) => {
      var node = g.node(v);
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
    var node = g.node(v);
    if (node.dummy === 'selfedge') {
      var selfNode = g.node(node.e.v);
      var x = selfNode.x + selfNode.width / 2;
      var y = selfNode.y;
      var dx = node.x - x;
      var dy = selfNode.height / 2;
      g.setEdge(node.e, node.label);
      g.removeNode(v);
      node.label.points = [
        { x: x + 2 * dx / 3, y: y - dy },
        { x: x + 5 * dx / 6, y: y - dy },
        { x: x + dx, y: y },
        { x: x + 5 * dx / 6, y: y + dy },
        { x: x + 2 * dx / 3, y: y + dy }
      ];
      node.label.x = node.x;
      node.label.y = node.y;
    }
  });
}

function canonicalize(attrs: Record<string, any>) {
  var newAttrs: Record<string, any> = {};
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
  let g = new Graph({ multigraph: true, compound: true });
  let graph = canonicalize(inputGraph.graph());

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
function makeSpaceForEdgeLabels(g: Graph) {
  let graph = g.graph();
  graph.ranksep /= 2;
  g.edges().forEach((e) => {
    let edge = g.edge(e);
    edge.minlen *= 2;
    if (edge.labelpos.toLowerCase() !== 'c') {
      if (graph.rankdir === 'TB' || graph.rankdir === 'BT') {
        edge.width += edge.labeloffset;
      } else {
        edge.height += edge.labeloffset;
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
function injectEdgeLabelProxies(g: Graph) {
  g.edges().forEach((e) => {
    let edge = g.edge(e);
    if (edge.width && edge.height) {
      let v = g.node(e.v);
      let w = g.node(e.w);
      let label = { rank: (w.rank - v.rank) / 2 + v.rank, e: e };

      addDummyNode(g, 'edge-proxy', label, '_ep');
    }
  });
}

function removeSelfEdges(g: Graph) {
  g.edges().forEach((e) => {
    if (e.v === e.w) {
      var node = g.node(e.v);
      if (!node.selfEdges) {
        node.selfEdges = [];
      }
      node.selfEdges.push({ e: e, label: g.edge(e) });
      g.removeEdge(e);
    }
  });
}

function runLayout(g: Graph) {
  time('    makeSpaceForEdgeLabels', () => makeSpaceForEdgeLabels(g));
  time('    removeSelfEdges', () => removeSelfEdges(g));
  time('    acyclic', () => acyclic.run(g));
  time('    nestingGraph.run', () => nestingGraph.run(g));
  time('    rank', () => rank(asNonCompoundGraph(g)));
  time('    injectEdgeLabelProxies', () => injectEdgeLabelProxies(g));
  time('    removeEmptyRanks', () => removeEmptyRanks(g));
  time('    nestingGraph.cleanup', () => nestingGraph.cleanup(g));
  time('    normalizeRanks', () => normalizeRanks(g));
  time('    assignRankMinMax', () => assignRankMinMax(g));
  time('    removeEdgeLabelProxies', () => removeEdgeLabelProxies(g));
  time('    normalize.run', () => normalize.run(g));
  time('    parentDummyChains', () => parentDummyChains(g));
  time('    addBorderSegments', () => addBorderSegments(g));
  time('    order', () => order(g, null, time));
  time('    insertSelfEdges', () => insertSelfEdges(g));
  time('    adjustCoordinateSystem', () => coordinateSystem.adjust(g));
  time('    position', () => position(g));
  time('    positionSelfEdges', () => positionSelfEdges(g));
  time('    removeBorderNodes', () => removeBorderNodes(g));
  time('    normalize.undo', () => normalize.undo(g));
  time('    fixupEdgeLabelCoords', () => fixupEdgeLabelCoords(g));
  time('    undoCoordinateSystem', () => coordinateSystem.undo(g));
  time('    translateGraph', () => translateGraph(g));
  time('    assignNodeIntersects', () => assignNodeIntersects(g));
  time('    reversePoints', () => reversePointsForReversedEdges(g));
  time('    acyclic.undo', () => acyclic.undo(g));
}

export function layout(graph: Graph) {
  time('layout', () => {
    let layoutGraph = time('  buildLayoutGraph', () => buildLayoutGraph(graph));
    time('  runLayout', () => runLayout(layoutGraph));
    time('  updateInputGraph', () => updateInputGraph(graph, layoutGraph));
  });
}
