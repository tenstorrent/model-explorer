import type { Graph } from '@dagrejs/graphlib';
import { barycenter } from './barycenter.js';
import { resolveConflicts } from './resolve-conflicts.js';
import { sort } from './sort.js';

export function sortSubgraph(g: Graph, v: string, cg: any, biasRight: boolean) {
  let movable = g.children(v);
  let node = g.node(v);
  let bl = node ? node.borderLeft : undefined;
  let br = node ? node.borderRight : undefined;
  let subgraphs: Record<string, any> = {};

  if (bl) {
    movable = movable.filter((w) => w !== bl && w !== br);
  }

  let barycenters = barycenter(g, movable);
  barycenters.forEach((entry) => {
    if (g.children(entry.v).length) {
      let subgraphResult = sortSubgraph(g, entry.v, cg, biasRight);
      subgraphs[entry.v] = subgraphResult;
      if (subgraphResult.hasOwnProperty('barycenter')) {
        mergeBarycenters(entry, subgraphResult);
      }
    }
  });

  let entries = resolveConflicts(barycenters, cg);
  expandSubgraphs(entries, subgraphs);

  let result = sort(entries, biasRight);

  if (bl) {
    result.vs = [bl, result.vs, br].flat();
    if (g.predecessors(bl)?.length) {
      let blPred = g.node(g.predecessors(bl)?.[0] ?? ''),
        brPred = g.node(g.predecessors(br)?.[0] ?? '');
      if (!result.hasOwnProperty('barycenter')) {
        result.barycenter = 0;
        result.weight = 0;
      }
      result.barycenter = ((result?.barycenter ?? 0) * (result.weight ?? 0) +
        blPred.order + brPred.order) / ((result.weight ?? 0) + 2);
      result.weight = result.weight != undefined ? result.weight + 2 : 0;
    }
  }

  return result;
}

function expandSubgraphs(entries: any[], subgraphs: Record<string, any>) {
  entries.forEach((entry) => {
    entry.vs = entry.vs.flatMap((v: string) => {
      if (subgraphs[v]) {
        return subgraphs[v].vs;
      }
      return v;
    });
  });
}

function mergeBarycenters(target: any, other: any) {
  if (target.barycenter !== undefined) {
    target.barycenter = (target.barycenter * target.weight +
      other.barycenter * other.weight) /
      (target.weight + other.weight);
    target.weight += other.weight;
  } else {
    target.barycenter = other.barycenter;
    target.weight = other.weight;
  }
}
