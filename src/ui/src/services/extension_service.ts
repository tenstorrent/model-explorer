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

import {Injectable, signal} from '@angular/core';

import {ExtensionCommand, type AdapterExecuteResponse, type AdapterOverrideResponse, type AdapterStatusCheckResponse } from '../common/extension_command';
import {Extension, type ExtensionSettings} from '../common/types';
import {INTERNAL_COLAB} from '../common/utils';

const EXTERNAL_GET_EXTENSIONS_API_PATH = '/api/v1/get_extensions';
const EXTERNAL_SEND_CMD_GET_API_PATH = '/api/v1/send_command';
const EXTERNAL_SEND_CMD_POST_API_PATH = '/apipost/v1/send_command';

const MOCK_STATUS_UPDATE: Required<Omit<AdapterStatusCheckResponse, 'error'>> = {
  isDone: false,
  progress: 0,
  total: 100,
  timeElapsed: 0,
  currentStatus: 'executing',
};

/**
 * Service for managing model explorer extensions.
 */
@Injectable({providedIn: 'root'})
export class ExtensionService {
  readonly loading = signal<boolean>(true);
  readonly internalColab = INTERNAL_COLAB;

  extensions: Extension[] = [];

  extensionSettings = new Map<string, ExtensionSettings>();

  constructor() {
    this.loadExtensions();
  }

  // TODO: revert mock API changes!
  async sendCommandToExtension<T>(
    cmd: ExtensionCommand,
  ): Promise<{cmdResp?: T; otherError?: string}> {
    try {
      let resp: Response | undefined = undefined;
      // In internal colab, use GET request.
      if (this.internalColab) {
        const url = `${EXTERNAL_SEND_CMD_GET_API_PATH}?json=${JSON.stringify(cmd)}`;
        resp = await fetch(url);
      }
      // In other environments, use POST request.
      else {
        const requestData: RequestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        };
        requestData.body = JSON.stringify(cmd);

        if (localStorage.getItem('mock-api') === 'true' && cmd.cmdId === 'status_check') {
          if (MOCK_STATUS_UPDATE.isDone) {
            MOCK_STATUS_UPDATE.isDone = false;
            MOCK_STATUS_UPDATE.progress = 0;
            MOCK_STATUS_UPDATE.currentStatus = 'executing';
            MOCK_STATUS_UPDATE.timeElapsed = 0;
          }

          MOCK_STATUS_UPDATE.timeElapsed = MOCK_STATUS_UPDATE.timeElapsed + Math.trunc(Math.random() * 100);
          MOCK_STATUS_UPDATE.progress += Math.trunc(Math.random() * 10);

          if (MOCK_STATUS_UPDATE.progress >= MOCK_STATUS_UPDATE.total) {
            MOCK_STATUS_UPDATE.isDone = true;
            MOCK_STATUS_UPDATE.progress = MOCK_STATUS_UPDATE.total;
            MOCK_STATUS_UPDATE.currentStatus = 'finished';
          }

          return { cmdResp: MOCK_STATUS_UPDATE as T };
        }

        if (localStorage.getItem('mock-api') === 'true' && cmd.cmdId === 'execute') {
          const response: AdapterExecuteResponse = {
            log_file: '',
            stdout: '',
            perf_data: {
              'ttir-graph': {
                results: {
                  'forward0': {
                    value: 1,
                    bgColor: '#ff0000',
                    textColor: '#000000'
                  }
                }
              }
            }
          };

          return { cmdResp: response as T };
        }

        if (localStorage.getItem('mock-api') === 'true' && cmd.cmdId === 'override') {
          const response: AdapterOverrideResponse = {
            success: true,
            // @ts-expect-error
            graphs: cmd.settings.graphs
          };

          return { cmdResp: response as T };
        }

        resp = await fetch(EXTERNAL_SEND_CMD_POST_API_PATH, requestData);
      }
      if (!resp.ok) {
        return {otherError: `Failed to convert model. ${resp.status}`};
      }

      let json = await resp.json();

      function processAttribute(key: string, value: string) {
        if (value.startsWith('[')) {
          const arr = value.split(',');

          return {
            key,
            value,
            editable: {
              input_type: 'int_list',
              min_size: 1,
              max_size: arr.length,
              min_value: 0,
              max_value: 128,
              step: 32
            }
          };
        }

        if (value.startsWith('(')) {
          return { key, value };
        }

        return {
          key,
          value,
          editable: {
            input_type: 'value_list',
            options: ['foo', 'bar', 'baz']
          }
        };
      }

      if (localStorage.getItem('mock-api') === 'true' && cmd.cmdId === 'convert') {
        json.graphs?.forEach((graph: { nodes: { attrs: { key: string, value: string }[]}[]}) => {
          graph.nodes?.forEach((node) => {
            node.attrs?.forEach(({key, value}, index) => {
              node.attrs[index] = processAttribute(key, value);
            });
          });
        });
      }

      return {cmdResp: json as T};
    } catch (e) {
      return {otherError: e as string};
    }
  }

  private processExtensionSettings(extensions: Extension[]) {
    extensions.forEach(({ id, settings }) => {
      this.extensionSettings.set(id, settings ?? {});
    });
  }

  private async loadExtensions() {
    // Talk to BE to get registered extensions.
    let exts: Extension[] = [];

    exts = await this.getExtensionsForExternal();
    this.processExtensionSettings(exts);
    this.extensions = exts;
    this.loading.set(false);
  }

  private async getExtensionsForExternal(): Promise<Extension[]> {
    try {
      const resp = await fetch(EXTERNAL_GET_EXTENSIONS_API_PATH, {
        credentials: 'include',
      });
      if (!resp.ok) {
        console.error(`Failed to get extensions: ${resp.status}`);
        return [];
      }
      const json = await resp.json() as Extension[];

      // TODO: revert mock API changes!
      if (localStorage.getItem('mock-api') === 'true') {
        json.forEach((ext) => {
          if (ext.id === 'tt_adapter') {
            ext.settings = {
              optimizationPolicies: ['Foo', 'Bar', 'Baz', 'Quux']
            };
          }
        });
      }

      return json;
    } catch (e) {
      console.error('Failed to get extensions.', e);
      return [];
    }
  }
}
