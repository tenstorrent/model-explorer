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

import {Graph, GraphCollection,} from '../components/visualizer/common/input_graph';
import type { ChangesPerNode, ExecutionCommand } from './model_loader_service_interface';

/** A command sent to extension. */
export declare interface ExtensionCommand {
  cmdId: string;
  extensionId: string;
}

/** A response received from the extension. */
export interface ExtensionResponse {
  error?: string;
}

/** Adapter's "convert" command. */
export declare interface AdapterConvertCommand extends ExtensionCommand {
  cmdId: 'convert';
  modelPath: string;
  // tslint:disable-next-line:no-any Allow arbitrary types.
  settings: Record<string, any>;
  // Whether to delete the model file at `modelPath` after conversion is done.
  deleteAfterConversion: boolean;
}

/** Adapter's "convert" command response. */
export declare interface AdapterConvertResponse extends ExtensionResponse {
  graphs?: Graph[];
  graphCollections?: GraphCollection[];
}

/** Adapter's "override" command. */
export declare interface AdapterOverrideCommand extends ExtensionCommand {
  cmdId: 'override';
  modelPath: string;
  settings: {
    graphs: Graph[];
    changes: ChangesPerNode;
  };
  deleteAfterConversion: boolean;
}

/** Adapter's "override" command response. */
export declare interface AdapterOverrideResponse extends ExtensionResponse {
  success: boolean;
  graphs?: Graph[];
}

/** Adapter's "execute" command. */
export declare interface AdapterExecuteCommand extends ExtensionCommand {
  cmdId: 'execute';
  modelPath: string;
  settings: Record<string, any>;
  deleteAfterConversion: boolean;
}

/** Adapter's "execute" command response. */
export declare interface AdapterExecuteResponse extends ExtensionResponse, ExecutionCommand {
}

/** Adapter's "status check" command. */
export declare interface AdapterStatusCheckCommand extends ExtensionCommand {
  cmdId: 'status_check';
  modelPath: string;
  settings: Record<string, any>;
  deleteAfterConversion: boolean;
}

/** Adapter's "status check" command response. */
export declare interface AdapterStatusCheckResponse extends ExtensionResponse {
  isDone: boolean;
  progress: number;
  total?: number;
  timeElapsed?: number;
  currentStatus?: string;
}
