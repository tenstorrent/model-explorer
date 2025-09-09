import type { Graph } from '@dagrejs/graphlib';
import { asNonCompoundGraph, buildLayerMatrix } from './util.js';
import { positionX } from './bk.js';

export function position(g: Graph) {
  g = asNonCompoundGraph(g);

  positionY(g);
  Object.entries(positionX(g)).forEach(([v, x]) => g.node(v).x = x);
}

function positionY(g: Graph) {
  let layering = buildLayerMatrix(g);
  let rankSep = g.graph().ranksep;
  let prevY = 0;
  layering.forEach((layer) => {
    const maxHeight = layer.reduce((acc, v) => {
      const height = g.node(v).height;
      if (acc > height) {
        return acc;
      } else {
        return height;
      }
    }, 0);
    layer.forEach((v) => g.node(v).y = prevY + maxHeight / 2);
    prevY += maxHeight + rankSep;
  });
}
