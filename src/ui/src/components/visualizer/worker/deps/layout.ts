import type { DagreGraphInstance } from '../dagre_types';

/*
 * Returns a new function that wraps `fn` with a timer. The wrapper logs the
 * time it takes to execute the function.
 */
function time(name: string, fn: Function) {
  performance.mark(`${name}-start`);

  try {
    return fn();
  } finally {
    performance.mark(`${name}-end`);
    const measure = performance.measure(name, `${name}-start`, `${name}-end`);

    console.log(`${measure.name}: ${measure.duration}`);
  }
}

function canonicalize(attrs: Object) {
  const newAttrs: Record<string, unknown> = {};

  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (typeof k === "string") {
        k = k.toLowerCase();
      }

      newAttrs[k] = v;
    });
  }

  return newAttrs;
}

/*
 * Constructs a new graph from the input graph, which can be used for layout.
 * This process copies only whitelisted attributes from the input graph to the
 * layout graph. Thus this function serves as a good place to determine what
 * attributes can influence layout.
 */
function buildLayoutGraph(inputGraph: DagreGraphInstance) {
  let g = new Graph({ multigraph: true, compound: true });
  let graph = canonicalize(inputGraph.graph());

  g.setGraph(Object.assign({},
    graphDefaults,
    selectNumberAttrs(graph, graphNumAttrs),
    util.pick(graph, graphAttrs)));

  inputGraph.nodes().forEach(v => {
    let node = canonicalize(inputGraph.node(v));
    const newNode = selectNumberAttrs(node, nodeNumAttrs);
    Object.keys(nodeDefaults).forEach(k => {
      if (newNode[k] === undefined) {
        newNode[k] = nodeDefaults[k];
      }
    });

    g.setNode(v, newNode);
    g.setParent(v, inputGraph.parent(v));
  });

  inputGraph.edges().forEach(e => {
    let edge = canonicalize(inputGraph.edge(e));
    g.setEdge(e, Object.assign({},
      edgeDefaults,
      selectNumberAttrs(edge, edgeNumAttrs),
      util.pick(edge, edgeAttrs)));
  });

  return g;
}

export function layout(graph: DagreGraphInstance) {
  time("layout", () => {
    let layoutGraph =
      time("  buildLayoutGraph", () => buildLayoutGraph(graph));
    time("  runLayout",        () => runLayout(layoutGraph, time));
    time("  updateInputGraph", () => updateInputGraph(graph, layoutGraph));
  });
}
