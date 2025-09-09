import type { Graph } from '@dagrejs/graphlib';

export function adjust(g: Graph) {
  let rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === 'lr' || rankDir === 'rl') {
    swapWidthHeight(g);
  }
}

export function undo(g: Graph) {
  let rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === 'bt' || rankDir === 'rl') {
    reverseY(g);
  }

  if (rankDir === 'lr' || rankDir === 'rl') {
    swapXY(g);
    swapWidthHeight(g);
  }
}

function swapWidthHeight(g: Graph) {
  g.nodes().forEach((v) => swapWidthHeightOne(g.node(v)));
  g.edges().forEach((e) => swapWidthHeightOne(g.edge(e)));
}

function swapWidthHeightOne(attrs: any) {
  let w = attrs.width;
  attrs.width = attrs.height;
  attrs.height = w;
}

function reverseY(g: Graph) {
  g.nodes().forEach((v) => reverseYOne(g.node(v)));

  g.edges().forEach((e) => {
    let edge = g.edge(e);
    edge.points.forEach(reverseYOne);
    if (edge.hasOwnProperty('y')) {
      reverseYOne(edge);
    }
  });
}

function reverseYOne(attrs: any) {
  attrs.y = -attrs.y;
}

function swapXY(g: Graph) {
  g.nodes().forEach((v) => swapXYOne(g.node(v)));

  g.edges().forEach((e) => {
    let edge = g.edge(e);
    edge.points.forEach(swapXYOne);
    if (edge.hasOwnProperty('x')) {
      swapXYOne(edge);
    }
  });
}

function swapXYOne(attrs: any) {
  let x = attrs.x;
  attrs.x = attrs.y;
  attrs.y = x;
}
