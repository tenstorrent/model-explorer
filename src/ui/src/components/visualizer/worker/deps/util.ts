import { Graph } from '@dagrejs/graphlib';
import type { Point, Rect } from '../../common/types.js';
/*
 * Adds a dummy node to the graph and return v.
 */
export function addDummyNode(g: Graph, type: string, attrs: any, name: string) {
  let v;
  do {
    v = uniqueId(name);
  } while (g.hasNode(v));

  attrs.dummy = type;
  g.setNode(v, attrs);
  return v;
}

/*
 * Returns a new graph with only simple edges. Handles aggregation of data
 * associated with multi-edges.
 */
export function simplify(g: Graph) {
  let simplified = new Graph().setGraph(g.graph());
  g.nodes().forEach((v) => simplified.setNode(v, g.node(v)));
  g.edges().forEach((e) => {
    let simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlen: 1 };
    let label = g.edge(e);
    simplified.setEdge(e.v, e.w, {
      weight: simpleLabel.weight + label.weight,
      minlen: Math.max(simpleLabel.minlen, label.minlen)
    });
  });
  return simplified;
}

export function asNonCompoundGraph(g: Graph) {
  let simplified = new Graph({ multigraph: g.isMultigraph() }).setGraph(g.graph());
  g.nodes().forEach((v) => {
    if (!g.children(v).length) {
      simplified.setNode(v, g.node(v));
    }
  });
  g.edges().forEach((e) => {
    simplified.setEdge(e, g.edge(e));
  });
  return simplified;
}

export function successorWeights(g: Graph) {
  let weightMap = g.nodes().map((v) => {
    let sucs: Record<string, number> = {};
    g.outEdges(v)?.forEach((e) => {
      sucs[e.w] = (sucs[e.w] || 0) + g.edge(e).weight;
    });
    return sucs;
  });
  return zipObject(g.nodes(), weightMap);
}

export function predecessorWeights(g: Graph) {
  let weightMap = g.nodes().map((v) => {
    let preds: Record<string, number> = {};
    g.inEdges(v)?.forEach((e) => {
      preds[e.v] = (preds[e.v] || 0) + g.edge(e).weight;
    });
    return preds;
  });
  return zipObject(g.nodes(), weightMap);
}

/*
 * Finds where a line starting at point ({x, y}) would intersect a rectangle
 * ({x, y, width, height}) if it were pointing at the rectangle's center.
 */
export function intersectRect(rect: Rect, point: Point) {
  let x = rect.x;
  let y = rect.y;

  // Rectangle intersection algorithm from:
  // http://math.stackexchange.com/questions/108113/find-edge-between-two-boxes
  let dx = point.x - x;
  let dy = point.y - y;
  let w = rect.width / 2;
  let h = rect.height / 2;

  if (!dx && !dy) {
    throw new Error('Not possible to find intersection inside of the rectangle');
  }

  let sx, sy;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    // Intersection is top or bottom of rect.
    if (dy < 0) {
      h = -h;
    }
    sx = h * dx / dy;
    sy = h;
  } else {
    // Intersection is left or right of rect.
    if (dx < 0) {
      w = -w;
    }
    sx = w;
    sy = w * dy / dx;
  }

  return { x: x + sx, y: y + sy };
}

/*
 * Given a DAG with each node assigned "rank" and "order" properties, this
 * function will produce a matrix with the ids of each node.
 */
export function buildLayerMatrix(g: Graph) {
  let layering = range(maxRank(g) + 1).map(() => []) as string[][];
  g.nodes().forEach((v) => {
    let node = g.node(v);

    let rank = node?.rank;
    if (rank !== undefined) {
      layering[rank][node.order] = v;
    }
  });
  return layering;
}

/*
 * Adjusts the ranks for all nodes in the graph such that all nodes v have
 * rank(v) >= 0 and at least one node w has rank(w) = 0.
 */
export function normalizeRanks(g: Graph) {
  let min = Math.min(
    ...g.nodes().map((v) => {
      let rank = g.node(v).rank;
      if (rank === undefined) {
        return Number.MAX_VALUE;
      }

      return rank;
    })
  );
  g.nodes().forEach((v) => {
    let node = g.node(v);
    if (node.hasOwnProperty('rank')) {
      node.rank -= min;
    }
  });
}

export function removeEmptyRanks(g: Graph) {
  // Ranks may not start at 0, so we need to offset them
  let offset = Math.min(...g.nodes().map((v) => g.node(v).rank));

  let layers: string[][] = [];
  g.nodes().forEach((v) => {
    let rank = g.node(v).rank - offset;
    if (!layers[rank]) {
      layers[rank] = [];
    }
    layers[rank].push(v);
  });

  let delta = 0;
  let nodeRankFactor = g.graph().nodeRankFactor;
  Array.from(layers).forEach((vs, i) => {
    if (vs === undefined && i % nodeRankFactor !== 0) {
      --delta;
    } else if (vs !== undefined && delta) {
      vs.forEach((v) => g.node(v).rank += delta);
    }
  });
}

export function addBorderNode(g: Graph, prefix: string, rank?: string, order?: string) {
  let node = {
    width: 0,
    height: 0,
    rank,
    order
  };

  return addDummyNode(g, 'border', node, prefix);
}

export function maxRank(g: Graph) {
  /*
   * The following code would throw "maximum call stack size exceeded" error
   * when handling large graphs. Change it to using for loop instead.
   *
   *  return Math.max(...g.nodes().map(v => {
   *    let rank = g.node(v).rank;
   *    if (rank === undefined) {
   *      return Number.MIN_VALUE;
   *    }
   *    return rank;
   *  }));
   */

  let maxRank = Number.MIN_VALUE;

  for (const v of g.nodes()) {
    let rank = g.node(v)?.rank ?? 0;

    if (rank === undefined) {
      continue;
    }

    if (rank > maxRank) {
      maxRank = rank;
    }
  }

  return maxRank;
}

/*
 * Partition a collection into two groups: `lhs` and `rhs`. If the supplied
 * function returns true for an entry it goes into `lhs`. Otherwise it goes
 * into `rhs.
 */
export function partition<T>(collection: T[], fn: (value: T) => boolean) {
  let result: { lhs: T[], rhs: T[] } = { lhs: [], rhs: [] };
  collection.forEach((value) => {
    if (fn(value)) {
      result.lhs.push(value);
    } else {
      result.rhs.push(value);
    }
  });
  return result;
}

/*
 * Returns a new function that wraps `fn` with a timer. The wrapper logs the
 * time it takes to execute the function.
 */
export function time(name: string, fn: Function) {
  performance.mark(`${name}-start`);
  try {
    return fn();
  } finally {
    performance.mark(`${name}-end`);
    const measure = performance.measure(name, `${name}-start`, `${name}-end`);

    console.log(`${measure.name}: ${measure.duration}`);
  }
}

export function notime(name: string, fn: Function) {
  return fn();
}

let idCounter = 0;
export function uniqueId(prefix: any) {
  var id = ++idCounter;
  return `${prefix.toString()}${id}`;
}

export function range(start: number, limit?: number, step = 1) {
  if (limit == null) {
    limit = start;
    start = 0;
  }

  let endCon = (i: number) => i < limit;
  if (step < 0) {
    endCon = (i) => limit < i;
  }

  const range = [];
  for (let i = start; endCon(i); i += step) {
    range.push(i);
  }

  return range;
}

export function pick(source: any, keys: string[]) {
  const dest: Record<string, any> = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      dest[key] = source[key];
    }
  }

  return dest;
}

export function mapValues(obj: any, funcOrProp: string | Function) {
  let func = funcOrProp;
  if (typeof funcOrProp === 'string') {
    func = (val: any) => val[funcOrProp];
  }

  return Object.entries(obj).reduce((acc, [k, v]) => {
    acc[k] = (func as Function)(v, k);
    return acc;
  }, {} as Record<string, any>);
}

export function zipObject(props: string[], values: any) {
  return props.reduce((acc, key, i) => {
    acc[key] = values[i];
    return acc;
  }, {} as Record<string, any>);
}
