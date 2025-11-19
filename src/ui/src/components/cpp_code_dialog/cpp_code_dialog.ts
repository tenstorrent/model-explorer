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
import {Component, Inject, ViewChild, type AfterViewInit, type ElementRef} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { editor as monacoEditor } from 'monaco-editor';
import { ThemeService } from '../../services/theme_service';

export interface CppCodedialogData {
  curCollectionLabel: string;
  curModelId: string;
  code: string;
}

@Component({
  selector: 'cpp-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './cpp_code_dialog.ng.html',
  styleUrls: ['./cpp_code_dialog.scss'],
})
export class CppCodeDialog implements AfterViewInit {
  @ViewChild('cppCodeElement', { static: false })
  cppCodeElement!: ElementRef<HTMLPreElement>;

  editor?: monacoEditor.IStandaloneCodeEditor;

  constructor(
      private themeService: ThemeService,

      @Inject(MAT_DIALOG_DATA)
      public data: CppCodedialogData
  ){}

  ngAfterViewInit() {
      const cppCodeElement = this.cppCodeElement.nativeElement;
      const { width, height } = cppCodeElement.getBoundingClientRect();

      this.editor = monacoEditor.create(cppCodeElement, {
        codeLens: false,
        colorDecorators: false,
        value: this.data?.code ?? '',
        language: 'cpp',
        automaticLayout: true,
        dimension: { width, height },
        dragAndDrop: true,
        dropIntoEditor: { enabled: false },
        emptySelectionClipboard: false,
        inlayHints: { enabled: 'off' },
        inlineSuggest: { enabled: false },
        lightbulb: { enabled: monacoEditor.ShowLightbulbIconMode.Off },
        minimap: { renderCharacters: false },
        parameterHints: { enabled: false },
        quickSuggestions: false,
        renderFinalNewline: 'dimmed',
        renderWhitespace: 'boundary',
        scrollBeyondLastLine: false,
        theme: this.themeService.isDarkMode() ? 'vs-dark' : 'vs',
        useShadowDOM: true,
        wordBasedSuggestions: 'off',
        wordWrap: 'on',
        wrappingIndent: 'same',
        readOnly: true,
      });
    }

  downloadCode() {
    if (this.data.code.length > 0) {
      const tempElement = document.createElement('a');
      const textUrl = URL.createObjectURL(new Blob([this.data.code], { type: 'text/plain' }));

      tempElement.hidden = true;
      tempElement.download = `${this.data.curCollectionLabel}-${this.data.curModelId}.cpp`;
      tempElement.href = textUrl;
      tempElement.click();

      URL.revokeObjectURL(textUrl);
    }
  }
}
