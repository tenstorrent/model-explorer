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

import {
  ExtensionCommand,
  NdpGetConfigEditorsCommand,
  NdpGetConfigEditorsResponse,
  NdpRunCommand,
  NdpRunResponse,
} from '../common/extension_command';
import {
  ConfigValue,
  Extension,
  NodeDataProviderExtension,
  ExtensionSettings,
  SelectedExtensionSettings,
  type AdapterExtension,
} from '../common/types';
import {INTERNAL_COLAB} from '../common/utils';
import { SettingKey, SettingsService } from './settings_service.js';

const EXTERNAL_GET_EXTENSIONS_API_PATH = '/api/v1/get_extensions';
const EXTERNAL_SEND_CMD_GET_API_PATH = '/api/v1/send_command';
const EXTERNAL_SEND_CMD_POST_API_PATH = '/apipost/v1/send_command';

/**
 * Service for managing model explorer extensions.
 */
@Injectable({providedIn: 'root'})
export class ExtensionService {
  readonly loading = signal<boolean>(true);
  readonly errorLoadingExtension = signal<boolean>(false);
  readonly internalColab = INTERNAL_COLAB;

  extensions: Extension[] = [];

  extensionSettings = new Map<string, ExtensionSettings>();
  selectedSettings = new Map<string, SelectedExtensionSettings>();

  constructor(
    private readonly settingsService: SettingsService
  ) {
    this.loadExtensions();
  }

  private get backendUrl() {
    return this.settingsService.getStringValue(SettingKey.API_HOST);
  }

  async sendCommandToExtension<T>(
    cmd: ExtensionCommand,
  ): Promise<{cmdResp?: T; otherError?: string}> {
    try {
      let resp: Response | undefined = undefined;

      // In internal colab, use GET request.
      if (this.internalColab) {
        const url = `${EXTERNAL_SEND_CMD_GET_API_PATH}?json=${JSON.stringify(cmd)}`;
        resp = await fetch(new URL(url, this.backendUrl));
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

        resp = await fetch(new URL(EXTERNAL_SEND_CMD_POST_API_PATH, this.backendUrl), requestData);
      }

      if (!resp.ok) {
        return {otherError: `Failed to run extension: ${resp.status}`};
      }

      let json = await resp.json();

      if (typeof json !== 'object' || json === null) {
        return {otherError: `Failed to parse command response.`};
      }

      return {cmdResp: json as T};
    } catch (e) {
      return {otherError: e as string};
    }
  }

  private setDefaultExtensionSettings(extensionIds: string[]) {
    extensionIds.forEach((extensionId) => {
      this.selectedSettings.set(extensionId, {
        generateCppCode: false,
        selectedOptimizationPolicy: this.extensionSettings.get(extensionId)?.optimizationPolicies?.[0] ?? ''
      });
    });
  }

  private processExtensionSettings(extensions: Extension[]) {
    (extensions as AdapterExtension[]).forEach(({ id, settings }) => {
      this.extensionSettings.set(id, settings ?? {});
    });
  }

  /**
   * Get custom extensions (i.e. not built-in).
   *
   * Built-in extensions have ids starting with 'builtin_'.
   */
  getCustomExtensions(): Extension[] {
    return this.extensions.filter((ext) => !ext.id.startsWith('builtin_'));
  }

  async getNdpConfigEditors(extension: NodeDataProviderExtension): Promise<{
    cmdResp?: NdpGetConfigEditorsResponse;
    otherError?: string;
  }> {
    const cmd: NdpGetConfigEditorsCommand = {
      cmdId: 'get_config_editors',
      extensionId: extension.id,
    };
    const resp =
      await this.sendCommandToExtension<NdpGetConfigEditorsResponse>(cmd);
    return {
      cmdResp: resp.cmdResp,
      otherError: resp.otherError,
    };
  }

  async runNdpExtension(
    extension: NodeDataProviderExtension,
    modelPath: string,
    configValues: Record<string, ConfigValue>,
  ): Promise<{
    cmdResp?: NdpRunResponse;
    otherError?: string;
  }> {
    const cmd: NdpRunCommand = {
      cmdId: 'run',
      extensionId: extension.id,
      modelPath,
      configValues,
    };
    const resp = await this.sendCommandToExtension<NdpRunResponse>(cmd);
    return {
      cmdResp: resp.cmdResp,
      otherError: resp.otherError,
    };
  }

  private async loadExtensions() {
    // Talk to BE to get registered extensions.
    let exts: Extension[] = [];

    exts = await this.getExtensionsForExternal();
    this.processExtensionSettings(exts);
    this.setDefaultExtensionSettings(exts.map(({ id }) => id));
    this.extensions = exts;
    this.loading.set(false);
  }

  private async getExtensionsForExternal(): Promise<Extension[]> {
    try {
      this.errorLoadingExtension.update(() => false);
      const resp = await fetch(new URL(EXTERNAL_GET_EXTENSIONS_API_PATH, this.backendUrl), {
        credentials: 'include',
      });
      if (!resp.ok) {
        console.error(`Failed to get extensions: ${resp.status}`);
        return [];
      }
      const json = await resp.json() as Extension[];

      return json;
    } catch (e) {
      console.error('Failed to get extensions.', e);
      this.errorLoadingExtension.update(() => true);
      return [];
    }
  }
}
