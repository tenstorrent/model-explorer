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

import {ConnectedPosition, OverlaySizeConfig} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {Component, Inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';

import {Bubble} from '../bubble/bubble';
import { ExtensionService } from '../../services/extension_service';

export interface ExecutionSettingsDialogData {
  curExtensionId: string;
}

/**
 * A dialog showing app level settings.
 */
@Component({
  selector: 'execution-settings-dialog',
  standalone: true,
  imports: [
    Bubble,
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './execution_settings_dialog.ng.html',
  styleUrls: ['./execution_settings_dialog.scss'],
})
export class ExecutionSettingsDialog {
  readonly helpPopupSize: OverlaySizeConfig = {
    minWidth: 0,
    minHeight: 0,
    maxWidth: 340,
  };

  readonly helpPopupPosition: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
      offsetX: 4,
    },
  ];

  constructor(
    private readonly extensionService: ExtensionService,
    @Inject(MAT_DIALOG_DATA)
    public data: ExecutionSettingsDialogData
  ) {}


  get optimizationPolicies() {
    return this.extensionService.extensionSettings.get(this.data.curExtensionId)?.optimizationPolicies ?? [];
  }

  get genCppCode() {
    return this.extensionService.selectedSettings.get(this.data.curExtensionId)?.generateCppCode ?? false;
  }

  handleClickSelectOptimizationPolicy(evt: Event) {
    const optimizationPolicy = (evt.target as HTMLSelectElement).value;
    const existingSettings = this.extensionService.selectedSettings.get(this.data.curExtensionId)!;

    this.extensionService.selectedSettings.set(this.data.curExtensionId, {
      ...existingSettings,
      selectedOptimizationPolicy: optimizationPolicy
    });
  }
}
