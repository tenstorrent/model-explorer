import type { GraphCollection } from '../components/visualizer/common/input_graph.js';
import type { NodeAttribute } from '../custom_element/index.js';

export const isMockEnabled = localStorage.getItem('mock-api') === 'true';

function processAttribute(attr: NodeAttribute): NodeAttribute {
  if (attr.editable) {
    return attr;
  }

  if (typeof attr.value !== 'string') {
    return {
      key: attr.key,
      value: attr.value
    };
  }

  if (attr.key.includes('memory')) {
    return {
      key: attr.key,
      value: attr.value,
      display_type: 'memory'
    }
  }

  if (attr.key.includes('grid')) {
    return {
      key: attr.key,
      value: attr.value,
      editable: {
        input_type: 'grid',
        separator: 'x',
        min_value: 0,
        max_value: 10,
        step: 1
      }
    };
  }

  if (attr.value.startsWith('[')) {
    return {
      key: attr.key,
      value: attr.value,
      editable: {
        input_type: 'int_list',
        min_value: 0,
        max_value: 128,
        step: 32
      }
    };
  }

  if (attr.value.startsWith('(')) {
    return {
      key: attr.key,
      value: attr.value
    };
  }

  return {
    key: attr.key,
    value: attr.value,
    editable: {
      input_type: 'value_list',
      options: ['foo', 'bar', 'baz']
    }
  };
}

/**
 * @deprecated
 * @todo Revert mock API changes
 */
export function mockGraphCollectionAttributes<T extends GraphCollection>(json: T) {
  json.graphs?.forEach((graph) => {
    graph.nodes?.forEach((node) => {
      node.attrs?.forEach((nodeAttribute, index) => {
        node.attrs![index] = processAttribute(nodeAttribute);
      });

      if (!node.attrs?.find(({ key }) => key.includes('memory'))) {
        node.attrs?.push(processAttribute({ key: 'memory', value: '0.5' }));
      }

      if (!node.attrs?.find(({ key }) => key.includes('grid'))) {
        node.attrs?.push(processAttribute({ key: 'grid', value: '1x1' }));
      }
    });

    if (!graph.overlays) {
      graph.overlays = {};
    }
  });

  return json;
}

/**
 * @deprecated
 * @todo Revert mock API changes!
 */
export function mockExtensionCommand(command: string, json: any) {
  if (!isMockEnabled) {
    return json;
  }

  if (command === 'convert') {
    return mockGraphCollectionAttributes(json);
  }

  return json;
}
