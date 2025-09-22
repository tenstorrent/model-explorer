/*
 * A greedy heuristic for finding a feedback arc set for a graph. A feedback
 * arc set is a set of edges that can be removed to make a graph acyclic.
 * The algorithm comes from: P. Eades, X. Lin, and W. F. Smyth, "A fast and
 * effective heuristic for the feedback arc set problem." This implementation
 * adjusts that from the paper to allow for weighted edges.
 */

import { type Edge, Graph } from '@dagrejs/graphlib';
import { List } from './list.js';

function range(limit: number) {
  const rangeNumbers: number[] = [];
  for (let i = 0; i < limit; i++) {
    rangeNumbers.push(i);
  }

  return rangeNumbers;
}

function assignBucket(buckets: List[], zeroIdx: number, entry: any) {
  if (!entry.out) {
    buckets[0]?.enqueue(entry);
  } else if (!entry.in) {
    buckets[buckets.length - 1]?.enqueue(entry);
  } else {
    buckets[entry.out - entry.in + zeroIdx]?.enqueue(entry);
  }
}
function buildState(graph: Graph, weightFn: (edge: Edge) => number) {
  const fasGraph = new Graph();
  let maxIn = 0;
  let maxOut = 0;

  graph.nodes().forEach((nodeName) => {
    fasGraph.setNode(nodeName, { v: nodeName, in: 0, out: 0 });
  });

  // Aggregate weights on nodes, but also sum the weights across multi-edges
  // into a single edge for the fasGraph.
  graph.edges().forEach((edge) => {
    const prevWeight = fasGraph.edge(edge.v, edge.w) || 0;
    const weight = weightFn(edge);
    const edgeWeight = prevWeight + weight;
    fasGraph.setEdge(edge.v, edge.w, edgeWeight);
    maxOut = Math.max(maxOut, fasGraph.node(edge.v).out += weight);
    maxIn = Math.max(maxIn, fasGraph.node(edge.w).in += weight);
  });

  const buckets = range(maxOut + maxIn + 3).map(() => new List());
  const zeroIdx = maxIn + 1;

  fasGraph.nodes().forEach((nodeName) => {
    assignBucket(buckets, zeroIdx, fasGraph.node(nodeName));
  });

  return { graph: fasGraph, buckets, zeroIdx };
}

const DEFAULT_WEIGHT_FN = () => 1;

function removeNode(graph: Graph, buckets: List[], zeroIdx: number, entry: any, collectPredecessors?: boolean) {
  const results: Edge[] | undefined = collectPredecessors ? [] : undefined;

  graph.inEdges(entry.v)?.forEach((edge) => {
    const weight = graph.edge(edge);
    const uEntry = graph.node(edge.v);

    if (collectPredecessors) {
      results?.push({ v: edge.v, w: edge.w });
    }

    uEntry.out -= weight;
    assignBucket(buckets, zeroIdx, uEntry);
  });

  graph.outEdges(entry.v)?.forEach((edge) => {
    const weight = graph.edge(edge);
    const { w } = edge;
    const wEntry = graph.node(w);
    wEntry.in -= weight;
    assignBucket(buckets, zeroIdx, wEntry);
  });

  graph.removeNode(entry.v);

  return results;
}

function doGreedyFAS(graph: Graph, buckets: List[], zeroIdx: number) {
  let results: Edge[] = [];
  const sources = buckets[buckets.length - 1];
  const [sinks] = buckets;

  let entry;
  while (graph.nodeCount()) {
    do {
      entry = sinks?.dequeue();
      removeNode(graph, buckets, zeroIdx, entry);
    } while (entry);

    do {
      entry = sources?.dequeue();
      removeNode(graph, buckets, zeroIdx, entry);
    } while (entry);

    if (graph.nodeCount()) {
      for (let i = buckets.length - 2; i > 0; --i) {
        entry = buckets[i]?.dequeue();

        if (entry) {
          results = results.concat(removeNode(graph, buckets, zeroIdx, entry, true) ?? []);
          break;
        }
      }
    }
  }

  return results;
}

export function greedyFAS(graph: Graph, weightFn: (e: Edge) => number) {
  if (graph.nodeCount() <= 1) {
    return [];
  }
  const state = buildState(graph, weightFn || DEFAULT_WEIGHT_FN);
  const results = doGreedyFAS(state.graph, state.buckets, state.zeroIdx);

  // Expand multi-edges
  return results.flatMap((edge) => graph.outEdges(edge.v, edge.w) ?? []);
}
