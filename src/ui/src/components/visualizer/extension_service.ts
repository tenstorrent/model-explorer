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

import {Injectable} from '@angular/core';

import {ExtensionCommand} from './extension_command';

/** Metadata from an extension. */
export declare interface Extension {
  id: string;
  name: string;
  description?: string;
  type: 'node_data_provider';
  language: 'python' | 'js';
}

const DEFAULT_EXTENSION_SERVER_ADDRESS = 'http://localhost:5000';
