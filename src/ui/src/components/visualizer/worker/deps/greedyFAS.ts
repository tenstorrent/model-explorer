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
    buckets[0].enqueue(entry);
  } else if (!entry.in) {
    buckets[buckets.length - 1].enqueue(entry);
  } else {
    buckets[entry.out - entry.in + zeroIdx].enqueue(entry);
  }
}
function buildState(g: Graph, weightFn: (e: Edge) => number) {
  const fasGraph = new Graph();
  let maxIn = 0;
  let maxOut = 0;

  g.nodes().forEach((v) => {
    fasGraph.setNode(v, { v, in: 0, out: 0 });
  });

  // Aggregate weights on nodes, but also sum the weights across multi-edges
  // into a single edge for the fasGraph.
  g.edges().forEach((e) => {
    const prevWeight = fasGraph.edge(e.v, e.w) || 0;
    const weight = weightFn(e);
    const edgeWeight = prevWeight + weight;
    fasGraph.setEdge(e.v, e.w, edgeWeight);
    maxOut = Math.max(maxOut, fasGraph.node(e.v).out += weight);
    maxIn = Math.max(maxIn, fasGraph.node(e.w).in += weight);
  });

  const buckets = range(maxOut + maxIn + 3).map(() => new List());
  const zeroIdx = maxIn + 1;

  fasGraph.nodes().forEach((v) => {
    assignBucket(buckets, zeroIdx, fasGraph.node(v));
  });

  return { graph: fasGraph, buckets, zeroIdx };
}

const DEFAULT_WEIGHT_FN = () => 1;

export function greedyFAS(g: Graph, weightFn: (e: Edge) => number) {
  if (g.nodeCount() <= 1) {
    return [];
  }
  const state = buildState(g, weightFn || DEFAULT_WEIGHT_FN);
  const results = doGreedyFAS(state.graph, state.buckets, state.zeroIdx);

  // Expand multi-edges
  return results.flatMap((e) => g.outEdges(e.v, e.w) ?? []);
}

function doGreedyFAS(g: Graph, buckets: List[], zeroIdx: number) {
  let results: Edge[] = [];
  const sources = buckets[buckets.length - 1];
  const sinks = buckets[0];

  let entry;
  while (g.nodeCount()) {
    while ((entry = sinks.dequeue())) { removeNode(g, buckets, zeroIdx, entry); }
    while ((entry = sources.dequeue())) { removeNode(g, buckets, zeroIdx, entry); }
    if (g.nodeCount()) {
      for (let i = buckets.length - 2; i > 0; --i) {
        entry = buckets[i].dequeue();
        if (entry) {
          results = results.concat(removeNode(g, buckets, zeroIdx, entry, true) ?? []);
          break;
        }
      }
    }
  }

  return results;
}

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
