import type { AdapterConvertResponse, ExtensionCommand } from '../common/extension_command.js';

export const isMockEnabled = localStorage.getItem('mock-api') === 'true';

/**
 * @deprecated
 * @todo Revert mock API changes!
 */
export function mockExtensionCommand(command: string, json: any) {
  if (!isMockEnabled) {
    return json;
  }

  if (command === 'convert') {
    (json as AdapterConvertResponse).graphs?.forEach((graph) => {
      if (graph.id === 'tt-graph') {
        graph.id = `tt-graph-${graph.collectionLabel ?? 'NO_COLLECTION_LABEL'}`
      }
    });

    (json as AdapterConvertResponse).graphCollections?.forEach((collection) => {
      collection.graphs.forEach((graph) => {
        if (graph.id === 'tt-graph') {
          graph.id = `tt-graph-${graph.collectionLabel ?? 'NO_COLLECTION_LABEL'}`
        }
      });
    });
  }

  return json;
}


/**
 * @deprecated
 * @todo Revert mock API changes!
 */
export function interceptExtensionCommand(_command: ExtensionCommand) {
  if (!isMockEnabled) {
    return undefined;
  }

  return undefined;
}
