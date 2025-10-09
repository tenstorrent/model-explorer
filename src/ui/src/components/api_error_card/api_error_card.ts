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

import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import { SettingsDialog } from '../settings_dialog/settings_dialog.js';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * The welcome card on homepage.
 */
@Component({
  selector: 'api-error-card',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './api_error_card.ng.html',
  styleUrls: ['./api_error_card.scss'],
})
export class APIErrorCard {
  constructor(
    private readonly dialog: MatDialog,
  ) {}

  get appUrl() {
    return window.location.href;
  }

  handleClickSettings() {
    this.dialog.open(SettingsDialog, {});
  }

  handleClickReload() {
    window.location.reload();
  }
}
