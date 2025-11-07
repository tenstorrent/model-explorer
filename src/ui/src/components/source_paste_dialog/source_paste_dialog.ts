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
import {Component, Inject, ViewChild, type AfterViewInit, type ElementRef } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface SourceDialogData {
  text: string;
  addFile: (file: File) => void;
}

@Component({
  selector: 'source-paste-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './source_paste_dialog.ng.html',
  styleUrls: ['./source_paste_dialog.scss'],
})
export class SourcePasteDialog implements AfterViewInit {
  @ViewChild('modelSourceElement', {static: false})
  modelSourceElement!: ElementRef<HTMLPreElement>;

  timestamp = new Date();

  extension = '.mlir';

  get formattedTimestamp() {
    const timeFormatter = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

    return timeFormatter.format(this.timestamp);
  }

  get fileName() {
    return `clipboard-${this.formattedTimestamp}${this.extension}`;
  }

  get modelText() {
    return this.modelSourceElement.nativeElement.textContent ?? '';
  }

  set modelText(newText: string) {
    this.modelSourceElement.nativeElement.textContent = newText;
  }

  constructor(
      @Inject(MAT_DIALOG_DATA)
      public data?: SourceDialogData
  ){}

  ngAfterViewInit() {
    this.modelText = this.data?.text ?? '';
  }

  downloadModel() {
    const tempElement = document.createElement('a');
    const textUrl = URL.createObjectURL(new Blob([this.modelText], { type: 'text/plain' }));

    tempElement.hidden = true;
    tempElement.download = this.fileName;
    tempElement.href = textUrl;
    tempElement.click();

    URL.revokeObjectURL(textUrl);
  }

  async addFile() {
    const file = new File([this.modelText], this.fileName, { lastModified: this.timestamp.getTime(), type: 'text/plain' });

    this.data?.addFile(file);
  }
}
