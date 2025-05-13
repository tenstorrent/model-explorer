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
import {Component, Input, signal, type OnChanges, type OnInit, type SimpleChanges} from '@angular/core';
import {createHighlighter, type HighlighterGeneric} from 'shiki';

@Component({
  selector: 'cpp-highlighter',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './cpp_highlighter.ng.html',
  styleUrls: ['./cpp_highlighter.scss'],
})
export class CppHighlighter implements OnInit, OnChanges {
  @Input({ required: true }) code: string = '';

  isHighlighterLoaded = false;

  highlighter: HighlighterGeneric<'cpp', 'light-plus'> | undefined = undefined;

  private renderCode(newCode: string) {
    this.renderedCode.update(() => this.highlighter?.codeToHtml(newCode, {
      lang: 'cpp',
      theme: 'light-plus'
    }) ?? '');
  }

  async ngOnInit() {
    this.highlighter = await createHighlighter({
      langs: ['cpp'],
      themes: ['light-plus'],
    });

    this.renderCode(this.code);
    this.isHighlighterLoaded = true;
  }

  ngOnChanges(changes: SimpleChanges) {
      if (changes['code']) {
        this.renderCode(changes['code'].currentValue);
      }
  }
}
