import { Graph } from '@dagrejs/graphlib';
import { addSubgraphConstraints } from './add-subgraph-constaints.js';
import { buildLayerGraph } from './build-layer-graph.js';
import { crossCount } from './cross-count.js';
import { initOrder } from './init-order.js';
import { sortSubgraph } from './sort-subgraph.js';
import * as util from './util.js';

/*
 * Applies heuristics to minimize edge crossings in the graph and sets the best
 * order solution as an order attribute on each node.
 *
 * Pre-conditions:
 *
 *    1. Graph must be DAG
 *    2. Graph nodes must be objects with a "rank" attribute
 *    3. Graph edges must have the "weight" attribute
 *
 * Post-conditions:
 *
 *    1. Graph nodes will have an "order" attribute based on the results of the
 *       algorithm.
 */
export function order(g: Graph, opts: any, time: typeof util.time) {
  if (opts && typeof opts.customOrder === 'function') {
    opts.customOrder(g, order);
    return;
  }

  let maxRank: number;
  let downLayerGraphs: Graph[];
  let upLayerGraphs: Graph[];
  let layering: string[][];

  time('      maxRank', () => {
    maxRank = util.maxRank(g);
  });
  time('      downLayerGraphs', () => {
    downLayerGraphs = buildLayerGraphs(g, util.range(1, maxRank + 1), 'inEdges');
  });
  time('      upLayerGraphs', () => {
    upLayerGraphs = buildLayerGraphs(g, util.range(maxRank - 1, -1, -1), 'outEdges');
  });
  time('      layering', () => {
    layering = initOrder(g);
  });
  time('      assignOrder-layering', () => {
    assignOrder(g, layering);
  });

  if (opts && opts.disableOptimalOrderHeuristic) {
    return;
  }

  let bestCC = Number.POSITIVE_INFINITY,
    best: string[][];

  time('      compute-best', () => {
    for (let i = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
      sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);

      layering = util.buildLayerMatrix(g);
      let cc = crossCount(g, layering);
      if (cc < bestCC) {
        lastBest = 0;
        best = Object.assign({}, layering);
        bestCC = cc;
      }
    }
  });

  time('      assignOrder-best', () => {
    assignOrder(g, best);
  });
}

function buildLayerGraphs(g: Graph, ranks: number[], relationship: 'inEdges' | 'outEdges') {
  return ranks.map(function(rank) {
    return buildLayerGraph(g, rank, relationship);
  });
}

function sweepLayerGraphs(layerGraphs: Graph[], biasRight: boolean) {
  let cg = new Graph();
  layerGraphs.forEach(function(lg) {
    let root = lg.graph().root;
    let sorted = sortSubgraph(lg, root, cg, biasRight);
    sorted.vs.forEach((v, i) => lg.node(v).order = i);
    addSubgraphConstraints(lg, cg, sorted.vs);
  });
}

function assignOrder(g: Graph, layering: string[][]) {
  Object.values(layering).forEach((layer) => layer.forEach((v, i) => g.node(v).order = i));
}
