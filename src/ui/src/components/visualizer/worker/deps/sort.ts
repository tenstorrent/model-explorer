import type { Graph } from '@dagrejs/graphlib';
import * as util from './util.js';

export function sort(entries: Graph[], biasRight: boolean) {
  let parts = util.partition(entries, (entry: Graph) => {
    return entry.hasOwnProperty('barycenter');
  });
  let sortable = parts.lhs,
    unsortable = parts.rhs.sort((a: any, b: any) => b.i - a.i),
    vs: string[] = [],
    sum = 0,
    weight = 0,
    vsIndex = 0;

  sortable.sort(compareWithBias(!!biasRight));

  vsIndex = consumeUnsortable(vs, unsortable, vsIndex);

  sortable.forEach((entry: any) => {
    vsIndex += entry.vs.length;
    vs.push(entry.vs);
    sum += entry.barycenter * entry.weight;
    weight += entry.weight;
    vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
  });

  let result: { vs: string[], barycenter?: number, weight?: number } = { vs: vs.flat() };
  if (weight) {
    result.barycenter = sum / weight;
    result.weight = weight;
  }
  return result;
}

function consumeUnsortable(vs: string[], unsortable: any[], index: number) {
  let last;
  while (unsortable.length && (last = unsortable[unsortable.length - 1]).i <= index) {
    unsortable.pop();
    vs.push(last.vs);
    index++;
  }
  return index;
}

function compareWithBias(bias: boolean) {
  return (entryV: any, entryW: any) => {
    if (entryV.barycenter < entryW.barycenter) {
      return -1;
    } else if (entryV.barycenter > entryW.barycenter) {
      return 1;
    }

    return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
  };
}
