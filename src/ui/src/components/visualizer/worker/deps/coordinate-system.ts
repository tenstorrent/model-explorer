import type { Graph } from '@dagrejs/graphlib';

function reverseY(graph: Graph) {
  graph.nodes().forEach((nodeName) => {
    const node = graph.node(nodeName);

    node.y = -node.y;
  });

  graph.edges().forEach((currentEdge) => {
    const edge = graph.edge(currentEdge);

    edge.points.forEach((points: { y: number }) => {
      points.y = -points.y;
    });

    edge.y &&= -edge.y;
  });
}

function swapWidthHeight(graph: Graph) {
  graph.nodes().forEach((currentNode) => {
    const node: { width: number, height: number } = graph.node(currentNode);

    [node.width, node.height] = [node.height, node.width];
  });

  graph.edges().forEach((currentEdge) => {
    const edge: { width: number, height: number } = graph.edge(currentEdge);

    [edge.width, edge.height] = [edge.height, edge.width];
  });
}

function swapXY(graph: Graph) {
  graph.nodes().forEach((currentNode) => {
    const node: { x: number, y: number } = graph.node(currentNode);

    [node.x, node.y] = [node.y, node.x];
  });

  graph.edges().forEach((currentEdge) => {
    const edge: { x?: number, y?: number, points: { x: number, y: number }[] } = graph.edge(currentEdge);

    edge.points.forEach((points) => {
      [points.x, points.y] = [points.y, points.x];
    });

    if (edge.x) {
      [edge.x, edge.y] = [edge.y, edge.x];
    }
  });
}
export function adjust(graph: Graph) {
  const rankDir = graph.graph().rankdir.toLowerCase();

  if (rankDir === 'lr' || rankDir === 'rl') {
    swapWidthHeight(graph);
  }
}

export function undo(graph: Graph) {
  const rankDir = graph.graph().rankdir.toLowerCase();

  if (rankDir === 'bt' || rankDir === 'rl') {
    reverseY(graph);
  }

  if (rankDir === 'lr' || rankDir === 'rl') {
    swapXY(graph);
    swapWidthHeight(graph);
  }
}
