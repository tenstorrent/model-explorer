import type { Graph } from '@dagrejs/graphlib';
import { pick } from './util.js';

/*
 * Given a list of entries of the form {v, barycenter, weight} and a
 * constraint graph this function will resolve any conflicts between the
 * constraint graph and the barycenters for the entries. If the barycenters for
 * an entry would violate a constraint in the constraint graph then we coalesce
 * the nodes in the conflict into a new node that respects the contraint and
 * aggregates barycenter and weight information.
 *
 * This implementation is based on the description in Forster, "A Fast and
 * Simple Hueristic for Constrained Two-Level Crossing Reduction," thought it
 * differs in some specific details.
 *
 * Pre-conditions:
 *
 *    1. Each entry has the form {v, barycenter, weight}, or if the node has
 *       no barycenter, then {v}.
 *
 * Returns:
 *
 *    A new list of entries of the form {vs, i, barycenter, weight}. The list
 *    `vs` may either be a singleton or it may be an aggregation of nodes
 *    ordered such that they do not violate constraints from the constraint
 *    graph. The property `i` is the lowest original index of any of the
 *    elements in `vs`.
 */
export function resolveConflicts(entries: any[], cg: Graph) {
  let mappedEntries: Record<string, any> = {};
  entries.forEach((entry, i) => {
    let tmp: any = mappedEntries[entry.v] = {
      indegree: 0,
      in: [],
      out: [],
      vs: [entry.v],
      i: i
    };
    if (entry.barycenter !== undefined) {
      tmp.barycenter = entry.barycenter;
      tmp.weight = entry.weight;
    }
  });

  cg.edges().forEach((e: any) => {
    let entryV = mappedEntries[e.v];
    let entryW = mappedEntries[e.w];
    if (entryV !== undefined && entryW !== undefined) {
      entryW.indegree++;
      entryV.out.push(mappedEntries[e.w]);
    }
  });

  let sourceSet = Object.values(mappedEntries).filter((entry) => !entry.indegree);

  return doResolveConflicts(sourceSet) as Graph[];
}

function doResolveConflicts(sourceSet: any[]) {
  let entries = [];

  function handleIn(vEntry: any) {
    return (uEntry: any) => {
      if (uEntry.merged) {
        return;
      }
      if (
        uEntry.barycenter === undefined ||
        vEntry.barycenter === undefined ||
        uEntry.barycenter >= vEntry.barycenter
      ) {
        mergeEntries(vEntry, uEntry);
      }
    };
  }

  function handleOut(vEntry: any) {
    return (wEntry: any) => {
      wEntry['in'].push(vEntry);
      if (--wEntry.indegree === 0) {
        sourceSet.push(wEntry);
      }
    };
  }

  while (sourceSet.length) {
    let entry = sourceSet.pop();
    entries.push(entry);
    entry['in'].reverse().forEach(handleIn(entry));
    entry.out.forEach(handleOut(entry));
  }

  return entries.filter((entry) => !entry.merged).map((entry) => {
    return pick(entry, ['vs', 'i', 'barycenter', 'weight']);
  });
}

function mergeEntries(target: any, source: any) {
  let sum = 0;
  let weight = 0;

  if (target.weight) {
    sum += target.barycenter * target.weight;
    weight += target.weight;
  }

  if (source.weight) {
    sum += source.barycenter * source.weight;
    weight += source.weight;
  }

  target.vs = source.vs.concat(target.vs);
  target.barycenter = sum / weight;
  target.weight = weight;
  target.i = Math.min(source.i, target.i);
  source.merged = true;
}
