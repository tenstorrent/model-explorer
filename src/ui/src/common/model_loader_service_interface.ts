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

import {WritableSignal} from '@angular/core';

import {GraphCollection} from '../components/visualizer/common/input_graph';
import type { KeyValue } from '../components/visualizer/common/types';

import {ModelItem} from './types';
import type { AdapterStatusCheckResults } from './extension_command';

export type CppCodePerGraph = Record<string, string>;
export type CppCodePerCollection = Record<string, CppCodePerGraph>;

export type OverridesPerNode = Record<string, { named_location: string, full_location: string, attributes: KeyValue[] }>;
export type OverridesPerGraph = Record<string, OverridesPerNode>;
export type OverridesPerCollection = Record<string, OverridesPerGraph>;

/** The interface of model load service. */
export interface ModelLoaderServiceInterface {
  loadModels(modelItems: ModelItem[]): Promise<void>;
  loadModel(modelItems: ModelItem): Promise<GraphCollection[]>;
  executeModel(modelItem: ModelItem, overrides?: OverridesPerNode): Promise<boolean>;
  checkExecutionStatus(modelItem: ModelItem, modelPath: string): Promise<AdapterStatusCheckResults>;
  overrideModel(modelItem: ModelItem, graphCollection: GraphCollection, fieldsToUpdate: OverridesPerNode): Promise<boolean>;
  get loadedGraphCollections(): WritableSignal<GraphCollection[] | undefined>;
  get selectedGraphId(): WritableSignal<string | undefined>;
  get models(): WritableSignal<ModelItem[]>;
  get overrides(): WritableSignal<OverridesPerCollection>;
  get generatedCppCode(): WritableSignal<CppCodePerCollection>;
  get graphErrors(): WritableSignal<string[] | undefined>;
  get hasOverrides(): boolean;
}
