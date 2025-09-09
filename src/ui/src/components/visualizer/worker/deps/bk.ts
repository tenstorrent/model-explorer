import { Graph } from '@dagrejs/graphlib';
import { buildLayerMatrix, mapValues, range } from './util.js';

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
export function findType1Conflicts(g: Graph, layering: string[][]) {
  let conflicts = {};

  function visitLayer(prevLayer: string[], layer: string[]) {
    let // last visited node in the previous layer that is incident on an inner
    // segment.
    k0 = 0,
      // Tracks the last node in this layer scanned for crossings with a type-1
      // segment.
      scanPos = 0,
      prevLayerLength = prevLayer.length,
      lastNode = layer[layer.length - 1];

    layer.forEach((v: string, i: number) => {
      let w = findOtherInnerSegmentNode(g, v),
        k1 = w ? g.node(w).order : prevLayerLength;

      if (w || v === lastNode) {
        layer.slice(scanPos, i + 1).forEach((scanNode: string) => {
          g.predecessors(scanNode)?.forEach((u) => {
            let uLabel = g.node(u),
              uPos = uLabel.order;
            if (
              (uPos < k0 || k1 < uPos) &&
              !(uLabel.dummy && g.node(scanNode).dummy)
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

export function findType2Conflicts(g: Graph, layering: string[][]) {
  let conflicts = {};

  function scan(south: string[], southPos: number, southEnd: number, prevNorthBorder: number, nextNorthBorder: number) {
    let v: string;
    range(southPos, southEnd).forEach((i) => {
      v = south[i];
      if (g.node(v).dummy) {
        g.predecessors(v)?.forEach((u) => {
          let uNode = g.node(u);
          if (
            uNode.dummy &&
            (uNode.order < prevNorthBorder || uNode.order > nextNorthBorder)
          ) {
            addConflict(conflicts, u, v);
          }
        });
      }
    });
  }

function visitLayer(north: string[], south: string[]) {
    let prevNorthPos = -1,
      nextNorthPos: number,
      southPos = 0;

    south.forEach((v, southLookahead) => {
      if (g.node(v).dummy === 'border') {
        let predecessors = g.predecessors(v) ??[];
        if (predecessors.length) {
          nextNorthPos = g.node(predecessors[0]).order;
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

function findOtherInnerSegmentNode(g: Graph, v: string) {
  if (g.node(v).dummy) {
    return g.predecessors(v)?.find((u) => g.node(u).dummy);
  }

  return;
}

export function addConflict(conflicts: any, v: string, w: string) {
  if (v > w) {
    let tmp = v;
    v = w;
    w = tmp;
  }

  let conflictsV = conflicts[v];
  if (!conflictsV) {
    conflicts[v] = conflictsV = {};
  }
  conflictsV[w] = true;
}

export function hasConflict(conflicts: any, v: string, w: string) {
  if (v > w) {
    let tmp = v;
    v = w;
    w = tmp;
  }
  return !!conflicts[v] && conflicts[v].hasOwnProperty(w);
}

/*
 * Try to align nodes into vertical "blocks" where possible. This algorithm
 * attempts to align a node with one of its median neighbors. If the edge
 * connecting a neighbor is a type-1 conflict then we ignore that possibility.
 * If a previous node has already formed a block with a node after the node
 * we're trying to form a block with, we also ignore that possibility - our
 * blocks would be split in that scenario.
 */
export function verticalAlignment(g: Graph, layering: string[][], conflicts: any, neighborFn: Function) {
  let root: Record<string, string> = {},
    align: Record<string, string> = {},
    pos: Record<string, number> = {};

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
        ws = ws.sort((a: string, b: string) => pos[a] - pos[b]);
        let mp = (ws.length - 1) / 2;
        for (let i = Math.floor(mp), il = Math.ceil(mp); i <= il; ++i) {
          let w = ws[i];
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

  return { root: root, align: align };
}

export function horizontalCompaction(g: Graph, layering: string[][], root: any, align: any, reverseSep: boolean) {
  // This portion of the algorithm differs from BK due to a number of problems.
  // Instead of their algorithm we construct a new block graph and do two
  // sweeps. The first sweep places blocks with the smallest possible
  // coordinates. The second sweep removes unused space by moving blocks to the
  // greatest coordinates without violating separation.
  let xs: Record<string, number> = {},
    blockG = buildBlockGraph(g, layering, root, reverseSep),
    borderType = reverseSep ? 'borderLeft' : 'borderRight';

  function iterate(setXsFunc: Function, nextNodesFunc: Function) {
    let stack = blockG.nodes();
    let elem = stack.pop();
    let visited: Record<string, boolean> = {};
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
    xs[elem] = blockG.inEdges(elem)?.reduce((acc, e) => {
      return Math.max(acc, xs[e.v] + blockG.edge(e));
    }, 0) ?? 0;
  }

  // Second pass, assign greatest coordinates
  function pass2(elem: string) {
    let min = blockG.outEdges(elem)?.reduce((acc, e) => {
      return Math.min(acc, xs[e.w] - blockG.edge(e));
    }, Number.POSITIVE_INFINITY) ?? Number.POSITIVE_INFINITY;

    let node = g.node(elem);
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

function buildBlockGraph(g: Graph, layering: string[][], root: any, reverseSep: boolean) {
  let blockGraph = new Graph(),
    graphLabel = g.graph(),
    sepFn = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep);

  layering.forEach((layer) => {
    let u: string;
    layer.forEach((v) => {
      let vRoot = root[v];
      blockGraph.setNode(vRoot);
      if (u) {
        var uRoot = root[u],
          prevMax = blockGraph.edge(uRoot, vRoot);
        blockGraph.setEdge(uRoot, vRoot, Math.max(sepFn(g, v, u), prevMax || 0));
      }
      u = v;
    });
  });

  return blockGraph;
}

/*
 * Returns the alignment that has the smallest width of the given alignments.
 */
function findSmallestWidthAlignment(g: Graph, xss: Record<string, Record<string, number>>) {
  return Object.values(xss).reduce((currentMinAndXs, xs) => {
    let max = Number.NEGATIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;

    Object.entries(xs).forEach(([v, x]) => {
      let halfWidth = width(g, v) / 2;

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
  let alignToVals = Object.values(alignTo ?? {});

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
      let alignment = vert + horiz,
        xs = xss[alignment];

      if (xs === alignTo) { return; }

      // Math.min(...) and Math.max(...) below would throw "maximum call stack
      // "size exceeded" error when handling large graphs. Change them to
      // using loop.
      let xsVals = Object.values(xs);
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
  return mapValues(xss['ul'], (num: number, v: string) => {
    if (align) {
      return xss[align.toLowerCase()][v];
    } else {
      let xs = Object.values(xss).map((xs: any) => xs[v]).sort((a, b) => a - b);
      return (xs[1] + xs[2]) / 2;
    }
  });
}

export function positionX(g: Graph) {
  let layering = buildLayerMatrix(g);
  let conflicts = Object.assign(
    findType1Conflicts(g, layering),
    findType2Conflicts(g, layering)
  );

  let xss: Record<string, Record<string, number>> = {};
  let adjustedLayering: string[][];
  ['u', 'd'].forEach((vert) => {
    adjustedLayering = vert === 'u' ? layering : Object.values(layering).reverse();
    ['l', 'r'].forEach((horiz) => {
      if (horiz === 'r') {
        adjustedLayering = adjustedLayering.map((inner) => {
          return Object.values(inner).reverse();
        });
      }

      let neighborFn = (vert === 'u' ? g.predecessors : g.successors).bind(g);
      let align = verticalAlignment(g, adjustedLayering, conflicts, neighborFn);
      let xs = horizontalCompaction(g, adjustedLayering, align.root, align.align, horiz === 'r');
      if (horiz === 'r') {
        xs = mapValues(xs, (x: number) => -x);
      }
      xss[vert + horiz] = xs;
    });
  });

  let smallestWidth = findSmallestWidthAlignment(g, xss);
  alignCoordinates(xss, smallestWidth);
  return balance(xss, g.graph().align);
}

function sep(nodeSep: number, edgeSep: number, reverseSep: boolean) {
  return (g: Graph, v: string, w: string) => {
    let vLabel = g.node(v);
    let wLabel = g.node(w);
    let sum = 0;
    let delta;

    sum += vLabel.width / 2;
    if (vLabel.hasOwnProperty('labelpos')) {
      switch (vLabel.labelpos.toLowerCase()) {
        case 'l':
          delta = -vLabel.width / 2;
          break;
        case 'r':
          delta = vLabel.width / 2;
          break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    sum += (vLabel.dummy ? edgeSep : nodeSep) / 2;
    sum += (wLabel.dummy ? edgeSep : nodeSep) / 2;

    sum += wLabel.width / 2;
    if (wLabel.hasOwnProperty('labelpos')) {
      switch (wLabel.labelpos.toLowerCase()) {
        case 'l':
          delta = wLabel.width / 2;
          break;
        case 'r':
          delta = -wLabel.width / 2;
          break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;

    return sum;
  };
}

function width(g: Graph, v: string) {
  return g.node(v).width;
}
