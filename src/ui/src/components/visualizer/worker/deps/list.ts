/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */

interface Sentinel {
  _next?: Sentinel;
  _prev?: Sentinel;
}

function unlink(entry: Sentinel & any) {
  entry._prev._next = entry._next;
  entry._next._prev = entry._prev;
  delete entry._next;
  delete entry._prev;
}

function filterOutLinks(key: string, value: any) {
  if (key !== '_next' && key !== '_prev') {
    return value;
  }
}

/*
 * Simple doubly linked list implementation derived from Cormen, et al.,
 * "Introduction to Algorithms".
 */
export class List {
  _sentinel: Sentinel;

  constructor() {
    const sentinel: Sentinel = {};

    sentinel._prev = sentinel;
    sentinel._next = sentinel;
    this._sentinel = sentinel;
  }

  dequeue() {
    const sentinel = this._sentinel;
    const entry = sentinel._prev;

    if (entry !== sentinel) {
      unlink(entry);
      return entry;
    }

    return undefined;
  }

  enqueue(entry: Sentinel & any) {
    const sentinel = this._sentinel;
    if (entry._prev && entry._next) {
      unlink(entry);
    }
    entry._next = sentinel._next;
    if (sentinel._next) {
      sentinel._next._prev = entry;
    }
    sentinel._next = entry;
    entry._prev = sentinel;
  }

  toString() {
    const strs = [];
    const sentinel = this._sentinel;
    let curr = sentinel._prev;
    while (curr !== sentinel) {
      strs.push(JSON.stringify(curr, filterOutLinks));
      curr = curr?._prev;
    }
    return `[${strs.join(', ')}]`;
  }
}
