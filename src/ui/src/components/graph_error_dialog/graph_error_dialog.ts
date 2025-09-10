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
import {Component, Inject } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ErrorDialogData {
	errorMessages: string;
	title?: string
}

/**
 * A dialog showing errors from loading graphs.
 */
@Component({
  selector: 'graph-error-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './graph_error_dialog.ng.html',
  styleUrls: ['./graph_error_dialog.scss'],
})
export class GraphErrorsDialog {
	constructor(
    @Inject(MAT_DIALOG_DATA) public data: ErrorDialogData,
  ) {}

  get formattedErrorMessages() {
    // Regular expression adapted from: https://github.com/chalk/ansi-regex
    const formattedMessages = this.data.errorMessages?.replaceAll(new RegExp(`[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))`,'giu'), '');

    return formattedMessages;
  }
}
