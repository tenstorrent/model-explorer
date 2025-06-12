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

import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AttrTreeNode} from '../common/attr_tree';

@Component({
  selector: 'attr-tree-view',
  templateUrl: './attr_tree_view.ng.html',
  styleUrls: ['./attr_tree_view.scss'],
  standalone: true,
  imports: [
    CommonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttrTreeView {
  @Input() data: AttrTreeNode[] = [];
  @Input() filterRegex: string = '';
  @Input() expandAll: boolean = true;

  getDisplayValue(value: string | undefined): string {
    if (value === undefined || value === '') return '';
    // Truncate long values
    const maxLength = 100;
    return value.length > maxLength 
      ? `${value.substring(0, maxLength)}...` 
      : value;
  }

  trackByNode(_: number, node: AttrTreeNode): string {
    return node.fullKey || node.key;
  }
}
