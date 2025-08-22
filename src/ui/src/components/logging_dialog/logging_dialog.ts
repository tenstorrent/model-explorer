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
import {Component, Inject, ViewChild, type ElementRef} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { LoggingServiceInterface, LogLevel } from '../../common/logging_service_interface';

/**
 * A dialog showing app level settings.
 */
@Component({
  selector: 'logging-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './logging_dialog.ng.html',
  styleUrls: ['./logging_dialog.scss'],
})
export class LoggingDialog {
  private dateFormatter = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false });
  constructor(
    @Inject('LoggingService')
    private readonly loggingService: LoggingServiceInterface,
  ) {}

  @ViewChild('logList')
  private logList!: ElementRef<HTMLUListElement>;

  @ViewChild('searchInput')
  private searchInput!: ElementRef<HTMLInputElement>;

  private ranges: Range[] = [];

  get totalRanges() {
    return this.ranges.length;
  }

  currentRange = -1;

  get messages() {
    return this.loggingService.getMessages();
  }

  get hasMessages() {
    return this.messages.length > 0;
  }

  getLogLevelIcon(level: LogLevel) {
    switch (level) {
      case 'info':
        return 'info';
      case 'warn':
        return 'warning';
      case 'error':
        return 'dangerous';
      case 'log':
      default:
        return 'help';
    }
  }

  clearLogs() {
    this.loggingService.clear();
  }

  downloadJsonLogs() {
    const messages = this.loggingService.getMessages();

    if (messages.length > 0) {
      const tempElement = document.createElement('a');
      const textUrl = URL.createObjectURL(new Blob([JSON.stringify(messages, null, '\t')], { type: 'application/json' }));

      tempElement.hidden = true;
      tempElement.download = `logs-${new Date().toISOString()}.json`;
      tempElement.href = textUrl;
      tempElement.click();

      URL.revokeObjectURL(textUrl);
    }
  }

  downloadRawLogs() {
    const messages = this.loggingService.getMessages()

    if (messages.length > 0) {
      const text = messages
        .map(({ messages }) => messages)
        .flat()
        .join('\n');
      const tempElement = document.createElement('a');
      const textUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));

      tempElement.hidden = true;
      tempElement.download = `logs-${new Date().toISOString()}.txt`;
      tempElement.href = textUrl;
      tempElement.click();

      URL.revokeObjectURL(textUrl);
    }
  }

  selectPreviousResult() {
    if (this.ranges.length === 0) {
      return;
    }

    const selection = document.getSelection();

    this.currentRange -= 1;

    if (this.currentRange < 0) {
      this.currentRange = this.ranges.length - 1;
    }

    selection?.empty();
    selection?.addRange(this.ranges[this.currentRange]);

    this.ranges[this.currentRange].startContainer.parentElement?.scrollIntoView({ block: 'center' });
  }

  selectNextResult() {
    if (this.ranges.length === 0) {
      return;
    }

    const selection = document.getSelection();

    this.currentRange += 1;

    if (this.currentRange >= this.ranges.length) {
      this.currentRange = 0;
    }

    selection?.empty();
    selection?.addRange(this.ranges[this.currentRange]);

    this.ranges[this.currentRange].startContainer.parentElement?.scrollIntoView({ block: 'center' });
  }

  searchLogs(evt: SubmitEvent) {
    evt.preventDefault();

    const searchString = this.searchInput.nativeElement.value.trim().toLowerCase();

    // @ts-expect-error
    CSS.highlights.clear();

    this.currentRange = -1;
    this.ranges = [];

    if (!searchString) {
      return;
    }

    const treeWalker = document.createTreeWalker(this.logList.nativeElement, NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode();

    while (currentNode) {
      const nodeText = currentNode.textContent?.toLowerCase() ?? '';

      let curTextPosition = 0;

      while (curTextPosition < nodeText.length) {
        const index = nodeText.indexOf(searchString, curTextPosition);

        if (index === -1) {
          break;
        }

        const range = new Range();

        range.setStart(currentNode, index);
        range.setEnd(currentNode, index + searchString.length);
        this.ranges.push(range);

        curTextPosition = index + searchString.length;
      }

      currentNode = treeWalker.nextNode();
    }

    // @ts-expect-error
    CSS.highlights.set("search-results", new Highlight(...this.ranges));

    this.selectNextResult();
  }

  formatDate(date: Date) {
    return this.dateFormatter.format(date);
  }
}
