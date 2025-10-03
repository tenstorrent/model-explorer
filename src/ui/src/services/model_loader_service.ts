/**
 * @license
 * Copyright 2024 The Model Explorer Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==============================================================================
 */

declare global {
  interface DocumentEventMap {
    'override-update': CustomEvent<OverridesPerCollection>;
  }
}

import {Injectable, signal} from '@angular/core';

import {GRAPHS_MODEL_SOURCE_PREFIX} from '../common/consts';
import {
  type AdapterConvertCommand,
  type AdapterConvertResponse,
  type AdapterExecuteCommand,
  type AdapterExecuteResponse,
  type AdapterExecuteSettings,
  type AdapterStatusCheckCommand,
  type AdapterStatusCheckResponse,
  type ExtensionCommand,
  type ExtensionResponse,
} from '../common/extension_command';
import {ModelLoaderServiceInterface, type CppCodePerCollection, type OverridesPerCollection, type OverridesPerNode } from '../common/model_loader_service_interface';
import {
  InternalAdapterExtId,
  ModelItem,
  ModelItemStatus,
  ModelItemType,
} from '../common/types';
import {processJson, processUploadedJsonFile} from '../common/utils';
import {
  Graph,
  GraphCollection,
} from '../components/visualizer/common/input_graph';
import {processErrorMessage} from '../components/visualizer/common/utils';

import {ExtensionService} from './extension_service';
import {SettingsService} from './settings_service';

const UPLOAD_API_PATH = '/apipost/v1/upload';
const LOAD_GRAPHS_JSON_API_PATH = '/api/v1/load_graphs_json';
const READ_TEXT_FILE_API_PATH = '/api/v1/read_text_file';

declare interface UploadResponse {
  path: string;
}

declare interface ReadTextFileResponse {
  content: string;
  error?: string;
}

/**
 * A service to manage model loading related tasks.
 */
@Injectable({
  providedIn: 'root',
})
export class ModelLoaderService implements ModelLoaderServiceInterface {
  // The loaded graph collections
  readonly loadedGraphCollections = signal<GraphCollection[] | undefined>(
    undefined,
  );

  readonly selectedGraphId = signal<string | undefined>(undefined);

  readonly models = signal<ModelItem[]>([]);

  readonly overrides = signal<OverridesPerCollection>({});

  readonly generatedCppCode = signal<CppCodePerCollection>({});

  readonly graphErrors = signal<string[] | undefined>(undefined);

  backendUrl = new URL('/', import.meta.url).href;

  constructor(
    private readonly settingsService: SettingsService,
    readonly extensionService: ExtensionService,
  ) {}

  updateOverrides(newOverrides: OverridesPerCollection, wasSentToServer = false) {
    this.overrides.update((curOverrides) => {
      Object.entries(newOverrides).forEach(([collectionLabel, overridesPerGraph]) => {
        if (!curOverrides[collectionLabel]) {
          curOverrides[collectionLabel] = {};
        }

        const curCollectionOverrides = curOverrides[collectionLabel];

        Object.entries(overridesPerGraph).forEach(([graphId, graphOverrides]) => {
          if (!curCollectionOverrides[graphId]) {
            curCollectionOverrides[graphId] = {
              wasSentToServer: false,
              overrides: {}
            }
          }

          const curGraphOverrides = curCollectionOverrides[graphId];

          curGraphOverrides.wasSentToServer = wasSentToServer;

          Object.entries(graphOverrides.overrides).forEach(([nodeFullLocation, keyValuePairs]) => {
            if (!curGraphOverrides.overrides[nodeFullLocation]) {
              curGraphOverrides.overrides[nodeFullLocation] = {
                named_location: keyValuePairs.named_location ?? '',
                full_location: nodeFullLocation,
                attributes: []
              };
            }

            const curNodeOverrides = curGraphOverrides.overrides[nodeFullLocation];

            keyValuePairs.attributes.forEach((keyValuePair) => {
              const existingAttrIndex = curNodeOverrides.attributes.findIndex(({ key }) => key === keyValuePair.key);

              if (existingAttrIndex === -1) {
                curNodeOverrides.attributes.push(keyValuePair);
              } else {
                curNodeOverrides.attributes[existingAttrIndex] = keyValuePair;
              }
            });
          });
        });
      });

      return curOverrides;
    });

    document.dispatchEvent(new CustomEvent('override-update', {
      detail: this.overrides()
    }));
  }

  get hasOverrides() {
    return Object.keys(this.overrides()).length > 0;
  }

  updateGraphCollections(newGraphCollections: GraphCollection[]) {
    this.loadedGraphCollections.update((prevGraphCollections = []) => {
      const updatedGraphCollections = [...prevGraphCollections];

      newGraphCollections.forEach((newCollection) => {
        if (newCollection.graphs.length > 0) {
          const collectionIndex = updatedGraphCollections.findIndex(({ label }) => label === newCollection.label);

          if (collectionIndex === -1) {
            updatedGraphCollections.push(newCollection);
          } else {
            newCollection.graphs.forEach((graph) => {
              const graphIndex = updatedGraphCollections[collectionIndex].graphs.findIndex(({ id }) => graph.id === id);

              if (graphIndex === -1) {
                updatedGraphCollections[collectionIndex].graphs.push(graph);
              } else {
                updatedGraphCollections[collectionIndex].graphs[graphIndex] = graph;
              }
            });
          }
        }
      });

      return updatedGraphCollections;
    });
  }

  async executeModel(modelItem: ModelItem, overrides: OverridesPerNode = {}) {
    modelItem.status.set(ModelItemStatus.PROCESSING);
    let result: boolean = false;
    const selectedSettings= this.extensionService.selectedSettings.get(modelItem.selectedAdapter?.id ?? '');

    result = await this.sendExecuteRequest(
      modelItem,
      modelItem.path,
      {
        optimizationPolicy: selectedSettings?.selectedOptimizationPolicy ?? '',
        generateCppCode: selectedSettings?.generateCppCode ?? false,
        overrides
      }
    );

    return result;
  }

  async loadModels(modelItems: ModelItem[]) {
    // Create tasks for loading models in the given model items.
    const tasks: Array<Promise<GraphCollection[]>> = [];
    for (const modelItem of modelItems) {
      if (
        modelItem.type === ModelItemType.LOCAL ||
        modelItem.type === ModelItemType.GRAPH_JSONS_FROM_SERVER ||
        modelItem.type === ModelItemType.FILE_PATH
      ) {
        tasks.push(this.loadModel(modelItem));
      }
    }

    // Run tasks in parallel and gather results.
    const graphCollectionsList: GraphCollection[][] = await Promise.all(tasks);

    // Process error messages.
    for (const modelItem of modelItems) {
      if (modelItem.errorMessage != null) {
        modelItem.errorMessage = processErrorMessage(modelItem.errorMessage);
      }
    }

    // Only set the result if all tasks return non-empty collection list.
    if (
      graphCollectionsList.find((collections) => collections.length === 0) ==
      null
    ) {
      this.loadedGraphCollections.set(graphCollectionsList.flat());
    }
  }

  async loadModel(modelItem: ModelItem): Promise<GraphCollection[]> {
    modelItem.status.set(ModelItemStatus.PROCESSING);
    let result: GraphCollection[] = [];

    // User-entered file path.
    if (modelItem.type === ModelItemType.FILE_PATH) {
      switch (modelItem.selectedAdapter?.id) {
        // Built-in json adapter.
        case InternalAdapterExtId.JSON_LOADER:
          try {
            const fileContent = await this.readTextFile(modelItem.path);
            const fileName = modelItem.path.split('/').pop() || 'untitled';
            const graphs = JSON.parse(fileContent) as Graph[];
            const jsonResult = processJson(fileName, graphs);
            if (jsonResult.error) {
              throw new Error(`Failed to process file: ${jsonResult.error})`);
            }
            if (jsonResult.graphCollections) {
              result = jsonResult.graphCollections;
            }
            modelItem.status.set(ModelItemStatus.DONE);
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error('Error loading JSON file:', errorMessage);
            modelItem.selected = false;
            modelItem.status.set(ModelItemStatus.ERROR);
            modelItem.errorMessage = errorMessage;
          }
          break;

        // Other adapters. Send request to backend.
        default:
          const filePath = modelItem.path;
          const fileName = filePath.split('/').pop() || 'untitled';
          result = await this.sendConvertRequest(
            modelItem,
            filePath,
            fileName
          );
          break;
      }
    }
    // Upload or graph jsons from server.
    else {
      const file = modelItem.file!;
      switch (modelItem.selectedAdapter?.id) {
        // This adapter processes json file in browser.
        case InternalAdapterExtId.JSON_LOADER:
          try {
            // Special handling for graphs json specified through backend
            // server.
            if (modelItem.type === ModelItemType.GRAPH_JSONS_FROM_SERVER) {
              // Load the json from backend.
              result = await this.loadGraphsFromBackendGraphsJson(
                modelItem.path,
              );
              modelItem.status.set(ModelItemStatus.DONE);
            }
            // Typical use cases where users pick a json file.
            else {
              result = await processUploadedJsonFile(file);
              modelItem.status.set(ModelItemStatus.DONE);
            }
          } catch (e) {
            modelItem.selected = false;
            modelItem.status.set(ModelItemStatus.ERROR);
            modelItem.errorMessage = e as string;
          }
          break;

        // For other adapters
        default:
          // Upload the file
          if (!modelItem.isUploaded) {
            modelItem.status.set(ModelItemStatus.UPLOADING);
            const {path, error: uploadError} = await this.uploadModelFile(file);
            if (uploadError) {
              modelItem.selected = false;
              modelItem.status.set(ModelItemStatus.ERROR);
              modelItem.errorMessage = uploadError;
              return [];
            }

            modelItem.path = path;
            modelItem.isUploaded = true;
          }

          // Send request to backend for processing.
          result = await this.sendConvertRequest(
            modelItem,
            modelItem.path,
            file.name
          );
          break;
      }
    }

    this.models.update((curModels) => {
      const filteredModels = curModels.filter(({ path }) => path !== modelItem.path);

      return [
        ...filteredModels,
        modelItem
      ];
    });

    return result;
  }

  async checkExecutionStatus(modelItem: ModelItem, modelPath: string) {
    const result = await this.sendExtensionRequest<AdapterStatusCheckResponse, AdapterStatusCheckCommand>('status_check', modelItem, modelPath);

    if (!result || modelItem.status() === ModelItemStatus.ERROR) {
      return {
        isDone: true,
        progress: -1,
        error: modelItem.errorMessage ?? 'An error has occured'
      };
    }

    return this.processAdapterStatusCheckResponse(result) ?? {
      isDone: false,
      progress: -1,
      error: 'Empty response'
    };
  }

  private async readTextFile(path: string): Promise<string> {
    const resp = await fetch(new URL(`${READ_TEXT_FILE_API_PATH}?path=${path}`, this.backendUrl));
    const jsonObj = (await resp.json()) as ReadTextFileResponse;
    if (jsonObj.error) {
      throw new Error(`Failed to read file: ${jsonObj.error}`);
    }
    return jsonObj.content;
  }

  private async loadGraphsFromBackendGraphsJson(
    graphPath: string,
  ): Promise<GraphCollection[]> {
    // Get graphs index.
    //
    // graphPath is in the form of graph://{model_name}/{index}. Note that
    // {model_name} might contain "/".
    const partsStr = graphPath.replace(GRAPHS_MODEL_SOURCE_PREFIX, '');
    const lastSlashIndex = partsStr.lastIndexOf('/');
    const name = partsStr.substring(0, lastSlashIndex);
    const index = Number(partsStr.substring(lastSlashIndex + 1));
    const resp = await fetch(new URL(`${LOAD_GRAPHS_JSON_API_PATH}?graph_index=${index}`, this.backendUrl));
    const json = (await resp.json()) as AdapterConvertResponse;
    const graphCollections = this.processAdapterConvertResponse(json, name);
    this.processGeneratedCppCode(graphCollections);

    return graphCollections;
  }

  private async uploadModelFile(
    file: File,
  ): Promise<{path: string; error?: string}> {
    const data = new FormData();
    data.append('file', file, file.name);
    const uploadResp = await fetch(new URL(UPLOAD_API_PATH, this.backendUrl), {
      method: 'POST',
      body: data,
    });
    if (!uploadResp.ok) {
      console.error(await uploadResp.text());
      return {
        path: '',
        error: 'Failed to upload model. Check console for details',
      };
    } else {
      const path = (JSON.parse(await uploadResp.text()) as UploadResponse).path;
      return {path};
    }
  }

  private async sendExtensionRequest<Res extends ExtensionResponse<any[], any[]>, Req extends ExtensionCommand>(
    command: Req['cmdId'],
    modelItem: ModelItem,
    path: string,
    settings?: Req['settings'],
  ) {
    try {
      modelItem.status.set(ModelItemStatus.PROCESSING);
      const extensionCommand: ExtensionCommand = {
        cmdId: command,
        extensionId: modelItem.selectedAdapter?.id || '',
        modelPath: path,
        settings: settings ?? {},
        deleteAfterConversion: false,
      };

      const { cmdResp, otherError: cmdError } = await this.extensionService.sendCommandToExtension<Res>(extensionCommand);

      if (cmdError) {
        throw new Error(cmdError);
      }

      if (!cmdResp) {
        throw new Error(`Command "${command}" didn't return any response`);
      }

      if (cmdResp.error) {
        throw new Error(cmdResp.error);
      }

      modelItem.status.set(ModelItemStatus.DONE);
      return cmdResp;
    } catch (err) {
      modelItem.selected = false;
      modelItem.errorMessage = (err as Partial<Error>)?.message ?? err?.toString() ?? `An error has occured when running command "${command}"`;
      modelItem.status.set(ModelItemStatus.ERROR);

      return undefined;
    }
  }

  private async sendConvertRequest(
    modelItem: ModelItem,
    path: string,
    fileName: string,
    settings: Record<string, any> = {},
  ): Promise<GraphCollection[]> {
    const result = await this.sendExtensionRequest<AdapterConvertResponse, AdapterConvertCommand>(
      'convert',
      modelItem,
      path,
      {
        ...this.settingsService.getAllSettingsValues(),
        ...settings
      },
    );

    if (!result || modelItem.status() === ModelItemStatus.ERROR) {
      return [];
    }

    const graphCollections = this.processAdapterConvertResponse(result, fileName);
    this.processGeneratedCppCode(graphCollections);
    // TODO: should these be updated here?
    // this.updateGraphCollections(graphCollections);
    // this.updateOverrides(graphCollections);

    return graphCollections;
  }

  private async sendExecuteRequest(
    modelItem: ModelItem,
    path: string,
    settings: AdapterExecuteSettings,
  ) {
    const result = await this.sendExtensionRequest<AdapterExecuteResponse, AdapterExecuteCommand>('execute', modelItem, path, settings);

    if (!result || modelItem.status() === ModelItemStatus.ERROR) {
      return false;
    }

    return this.processAdapterExecuteResponse(result);
  }

  private processAdapterConvertResponse(
    resp: AdapterConvertResponse,
    fileName: string,
  ): GraphCollection[] {
    const graphCollections = resp.graphCollections?.map((item) => {
      return {
        label: item.label === '' ? fileName : `${fileName} (${item.label})`,
        graphs: item.graphs
      };
    }) ?? [];

    if (resp.graphs) {
      graphCollections.push({label: fileName, graphs: resp.graphs });
    }

    graphCollections.forEach((graphCollection) => graphCollection.graphs.forEach((graph) => {
      if (!graph?.overlays) {
        graph.overlays = {};
      }
    }));

    return graphCollections;
  }

  private processGeneratedCppCode(graphCollections: GraphCollection[]) {
    this.generatedCppCode.update((curCppCodePerCollection) => {
      graphCollections.forEach(({ label, graphs }) => {
          graphs.forEach(({ id, cppCode }) => {
            if (!cppCode) {
              return;
            }

            if (!curCppCodePerCollection[label]) {
              curCppCodePerCollection[label] = {};
            }

            curCppCodePerCollection[label][id] = cppCode;
          });
        });

        return curCppCodePerCollection;
      });

  }

  private processAdapterStatusCheckResponse(
    resp: AdapterStatusCheckResponse
  ) {
      return resp?.graphs?.[0];
  }

  private processAdapterExecuteResponse(
    resp: AdapterExecuteResponse
  ) {
    return resp.graphs?.length === 0;
  }
}
