import { Graph } from '@dagrejs/graphlib';
import { buildLayerMatrix, mapValues, range } from './util.js';

function findOtherInnerSegmentNode(graph: Graph, vertex: string) {
  if (graph.node(vertex).dummy) {
    return graph.predecessors(vertex)?.find((u) => graph.node(u).dummy);
  }
}

function addConflict(conflicts: any, vertex: string, w: string) {
  if (vertex > w) {
    const tmp = vertex;
    vertex = w;
    w = tmp;
  }

  let conflictsV = conflicts[vertex];
  if (!conflictsV) {
    conflictsV = {};
    conflicts[vertex] = conflictsV;
  }
  conflictsV[w] = true;
}

/*
 * Marks all edges in the graph with a type-1 conflict with the "type1Conflict"
 * property. A type-1 conflict is one where a non-inner segment crosses an
 * inner segment. An inner segment is an edge with both incident nodes marked
 * with the "dummy" property.
 *
 * This algorithm scans layer by layer, starting with the second, for type-1
 * conflicts between the current layer and the previous layer. For each layer
 * it scans the nodes from left to right until it reaches one that is incident
 * on an inner segment. It then scans predecessors to determine if they have
 * edges that cross that inner segment. At the end a final scan is done for all
 * nodes on the current rank to see if they cross the last visited inner
 * segment.
 *
 * This algorithm (safely) assumes that a dummy node will only be incident on a
 * single node in the layers being scanned.
 */
export function findType1Conflicts(graph: Graph, layering: string[][]) {
  const conflicts = {};

  function visitLayer(prevLayer: string[], layer: string[]) {
    // last visited node in the previous layer that is incident on an inner
    // segment.
    let k0 = 0;
    // Tracks the last node in this layer scanned for crossings with a type-1
    // segment.
    let scanPos = 0;
    const prevLayerLength = prevLayer.length;
    const lastNode = layer[layer.length - 1];

    layer.forEach((vertex: string, i: number) => {
      const w = findOtherInnerSegmentNode(graph, vertex);
      const k1 = w ? graph.node(w).order : prevLayerLength;

      if (w || vertex === lastNode) {
        layer.slice(scanPos, i + 1).forEach((scanNode: string) => {
          graph.predecessors(scanNode)?.forEach((u) => {
            const uLabel = graph.node(u);
            const uPos = uLabel.order;
            if (
              (uPos < k0 || k1 < uPos) &&
              !(uLabel.dummy && graph.node(scanNode).dummy)
            ) {
              addConflict(conflicts, u, scanNode);
            }
          });
        });
        scanPos = i + 1;
        k0 = k1;
      }
    });

    return layer;
  }

  layering.length && layering.reduce(visitLayer);

  return conflicts;
}

export function findType2Conflicts(graph: Graph, layering: string[][]) {
  const conflicts = {};

  function scan(south: string[], southPos: number, southEnd: number, prevNorthBorder: number, nextNorthBorder: number) {
    let vertex: string;
    range(southPos, southEnd).forEach((i) => {
      vertex = south[i]!;
      if (graph.node(vertex).dummy) {
        graph.predecessors(vertex)?.forEach((u) => {
          const uNode = graph.node(u);
          if (
            uNode.dummy &&
            (uNode.order < prevNorthBorder || uNode.order > nextNorthBorder)
          ) {
            addConflict(conflicts, u, vertex);
          }
        });
      }
    });
  }

  function visitLayer(north: string[], south: string[]) {
    let prevNorthPos = -1;
    let nextNorthPos: number;
    let southPos = 0;

    south.forEach((v, southLookahead) => {
      if (graph.node(v).dummy === 'border') {
        const predecessors = graph.predecessors(v) ?? [];
        if (predecessors.length) {
          nextNorthPos = graph.node(predecessors[0]!).order;
          scan(south, southPos, southLookahead, prevNorthPos, nextNorthPos);
          southPos = southLookahead;
          prevNorthPos = nextNorthPos;
        }
      }
      scan(south, southPos, south.length, nextNorthPos, north.length);
    });

    return south;
  }

  layering.length && layering.reduce(visitLayer);

  return conflicts;
}

export function hasConflict(conflicts: any, v: string, w: string) {
  if (v > w) {
    const tmp = v;
    v = w;
    w = tmp;
  }
  return Boolean(conflicts[v]) && Object.hasOwn(conflicts[v] ?? {}, w);
}

/*
 * Try to align nodes into vertical "blocks" where possible. This algorithm
 * attempts to align a node with one of its median neighbors. If the edge
 * connecting a neighbor is a type-1 conflict then we ignore that possibility.
 * If a previous node has already formed a block with a node after the node
 * we're trying to form a block with, we also ignore that possibility - our
 * blocks would be split in that scenario.
 */
export function verticalAlignment(_graph: Graph, layering: string[][], conflicts: any, neighborFn: Function) {
  const root: Record<string, string> = {};
  const align: Record<string, string> = {};
  const pos: Record<string, number> = {};

  // We cache the position here based on the layering because the graph and
  // layering may be out of sync. The layering matrix is manipulated to
  // generate different extreme alignments.
  layering.forEach((layer) => {
    layer.forEach((v, order) => {
      root[v] = v;
      align[v] = v;
      pos[v] = order;
    });
  });

  layering.forEach((layer) => {
    let prevIdx = -1;
    layer.forEach((v) => {
      let ws = neighborFn(v);
      if (ws.length) {
        ws = ws.sort((a: string, b: string) => (pos[a] ?? 0) - (pos[b] ?? 0));
        const mp = (ws.length - 1) / 2;
        for (let i = Math.floor(mp), il = Math.ceil(mp); i <= il; ++i) {
          const w = ws[i];
          if (
            align[v] === v &&
            prevIdx < pos[w] &&
            !hasConflict(conflicts, v, w)
          ) {
            align[w] = v;
            align[v] = root[v] = root[w];
            prevIdx = pos[w];
          }
        }
      }
    });
  });

  return { root, align };
}

function sep(nodeSep: number, edgeSep: number, reverseSep: boolean) {
  return (graph: Graph, v: string, w: string) => {
    const vLabel = graph.node(v);
    const wLabel = graph.node(w);
    let sum = 0;
    let delta;

    sum += vLabel.width / 2;
    if (Object.hasOwn(vLabel, 'labelpos')) {
      switch (vLabel.labelpos.toLowerCase()) {
        case 'l':
          delta = -vLabel.width / 2;
          break;
        case 'r':
          delta = vLabel.width / 2;
          break;
        default:
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    sum += (vLabel.dummy ? edgeSep : nodeSep) / 2;
    sum += (wLabel.dummy ? edgeSep : nodeSep) / 2;

    sum += wLabel.width / 2;
    if (Object.hasOwn(wLabel, 'labelpos')) {
      switch (wLabel.labelpos.toLowerCase()) {
        case 'l':
          delta = wLabel.width / 2;
          break;
        case 'r':
          delta = -wLabel.width / 2;
          break;
        default:
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    return sum;
  };
}

function buildBlockGraph(graph: Graph, layering: string[][], root: any, reverseSep: boolean) {
  const blockGraph = new Graph();
  const graphLabel = graph.graph();
  const sepFn = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep);

  layering.forEach((layer) => {
    let u: string;
    layer.forEach((v) => {
      const vRoot = root[v];
      blockGraph.setNode(vRoot);
      if (u) {
        const uRoot = root[u];
        const prevMax = blockGraph.edge(uRoot, vRoot);
        blockGraph.setEdge(uRoot, vRoot, Math.max(sepFn(graph, v, u), prevMax || 0));
      }
      u = v;
    });
  });

  return blockGraph;
}

export function horizontalCompaction(graph: Graph, layering: string[][], root: any, align: any, reverseSep: boolean) {
  // This portion of the algorithm differs from BK due to a number of problems.
  // Instead of their algorithm we construct a new block graph and do two
  // sweeps. The first sweep places blocks with the smallest possible
  // coordinates. The second sweep removes unused space by moving blocks to the
  // greatest coordinates without violating separation.
  const xs: Record<string, number> = {};
  const blockG = buildBlockGraph(graph, layering, root, reverseSep);
  const borderType = reverseSep ? 'borderLeft' : 'borderRight';

  function iterate(setXsFunc: Function, nextNodesFunc: Function) {
    let stack = blockG.nodes();
    let elem = stack.pop();
    const visited: Record<string, boolean> = {};
    while (elem) {
      if (visited[elem]) {
        setXsFunc(elem);
      } else {
        visited[elem] = true;
        stack.push(elem);
        stack = stack.concat(nextNodesFunc(elem));
      }

      elem = stack.pop();
    }
  }

  // First pass, assign smallest coordinates
  function pass1(elem: string) {
    xs[elem] = blockG.inEdges(elem)?.reduce((acc, e) => Math.max(acc, xs[e.v] + blockG.edge(e)), 0) ?? 0;
  }

  // Second pass, assign greatest coordinates
  function pass2(elem: string) {
    const min = blockG.outEdges(elem)?.reduce((acc, e) => Math.min(acc, xs[e.w] - blockG.edge(e)), Number.POSITIVE_INFINITY) ?? Number.POSITIVE_INFINITY;

    const node = graph.node(elem);
    if (min !== Number.POSITIVE_INFINITY && node.borderType !== borderType) {
      xs[elem] = Math.max(xs[elem], min);
    }
  }

  iterate(pass1, blockG.predecessors.bind(blockG));
  iterate(pass2, blockG.successors.bind(blockG));

  // Assign x coordinates to all nodes
  Object.keys(align).forEach((v) => xs[v] = xs[root[v]]);

  return xs;
}

/*
 * Returns the alignment that has the smallest width of the given alignments.
 */
function findSmallestWidthAlignment(g: Graph, xss: Record<string, Record<string, number>>) {
  return Object.values(xss).reduce((currentMinAndXs, xs) => {
    let max = Number.NEGATIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;

    Object.entries(xs).forEach(([v, x]) => {
      const halfWidth = width(g, v) / 2;

      max = Math.max(x + halfWidth, max);
      min = Math.min(x - halfWidth, min);
    });

    const newMin = max - min;
    if (newMin < currentMinAndXs.curMin) {
      currentMinAndXs = { curMin: newMin, xs };
    }

    return currentMinAndXs;
  }, { curMin: Number.POSITIVE_INFINITY, xs: undefined } as { curMin: number, xs?: Record<string, number> }).xs;
}

/*
 * Align the coordinates of each of the layout alignments such that
 * left-biased alignments have their minimum coordinate at the same point as
 * the minimum coordinate of the smallest width alignment and right-biased
 * alignments have their maximum coordinate at the same point as the maximum
 * coordinate of the smallest width alignment.
 */
export function alignCoordinates(xss: Record<string, Record<string, number>>, alignTo?: Record<string, number>) {
  const alignToVals = Object.values(alignTo ?? {});

  // The following code would throw "maximum call stack size exceeded" error
  // when handling large graphs. Change them to using loop.
  //
  // alignToMin = Math.min(...alignToVals),
  // alignToMax = Math.max(...alignToVals);
  let alignToMin = Infinity;
  let alignToMax = -Infinity;
  for (const v of alignToVals) {
    if (v < alignToMin) {
      alignToMin = v;
    }
    if (v > alignToMax) {
      alignToMax = v;
    }
  }

  ['u', 'd'].forEach((vert) => {
    ['l', 'r'].forEach((horiz) => {
      const alignment = vert + horiz;
      const xs = xss[alignment];

      if (xs === alignTo) { return; }

      // Math.min(...) and Math.max(...) below would throw "maximum call stack
      // "size exceeded" error when handling large graphs. Change them to
      // using loop.
      const xsVals = Object.values(xs);
      let xMin = Infinity;
      let xMax = -Infinity;
      for (const v of xsVals) {
        if (v < xMin) {
          xMin = v;
        }
        if (v > xMax) {
          xMax = v;
        }
      }

      // let delta = alignToMin - Math.min(...xsVals);
      let delta = alignToMin - xMin;
      if (horiz !== 'l') {
        // delta = alignToMax - Math.max(...xsVals);
        delta = alignToMax - xMax;
      }

      if (delta) {
        xss[alignment] = mapValues(xs, (x: number) => x + delta);
      }
    });
  });
}

export function balance(xss: any, align: string) {
  return mapValues(xss.ul, (num: number, v: string) => {
    if (align) {
      return xss[align.toLowerCase()][v];
    }
    const xs = Object.values(xss).map((xs: any) => xs[v]).sort((a, b) => a - b);
    return (xs[1] + xs[2]) / 2;
  });
}

export function positionX(graph: Graph) {
  const layering = buildLayerMatrix(graph);
  const conflicts = Object.assign(
    findType1Conflicts(graph, layering),
    findType2Conflicts(graph, layering)
  );

  const xss: Record<string, Record<string, number>> = {};
  let adjustedLayering: string[][];
  ['u', 'd'].forEach((vert) => {
    adjustedLayering = vert === 'u' ? layering : Object.values(layering).reverse();
    ['l', 'r'].forEach((horiz) => {
      if (horiz === 'r') {
        adjustedLayering = adjustedLayering.map((inner) => Object.values(inner).reverse());
      }

      const neighborFn = (vert === 'u' ? graph.predecessors : graph.successors).bind(graph);
      const align = verticalAlignment(graph, adjustedLayering, conflicts, neighborFn);
      let xs = horizontalCompaction(graph, adjustedLayering, align.root, align.align, horiz === 'r');
      if (horiz === 'r') {
        xs = mapValues(xs, (x: number) => -x);
      }
      xss[vert + horiz] = xs;
    });
  });

  const smallestWidth = findSmallestWidthAlignment(graph, xss);
  alignCoordinates(xss, smallestWidth);
  return balance(xss, graph.graph().align);
}

function width(g: Graph, v: string) {
  return g.node(v).width;
}
