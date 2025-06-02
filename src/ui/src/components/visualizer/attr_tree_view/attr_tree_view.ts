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

import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FlatTreeControl} from '@angular/cdk/tree';
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {AttrTreeNode} from '../common/attr_tree';
import {KeyValue} from '@angular/common';

/**
 * Flattened node with expandable and level information
 */
interface FlatNode {
  expandable: boolean;
  name: string;
  value: string | undefined;
  level: number;
  isHighlighted: boolean;
  fullKey: string;
}

@Component({
  selector: 'attr-tree-view',
  templateUrl: './attr_tree_view.ng.html',
  styleUrls: ['./attr_tree_view.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttrTreeView implements OnChanges {
  @Input() data: AttrTreeNode[] = [];
  @Input() filterRegex: string = '';
  @Input() expandAll: boolean = true;

  treeControl = new FlatTreeControl<FlatNode>(
    node => node.level,
    node => node.expandable,
  );

  private transformer = (node: AttrTreeNode, level: number): FlatNode => {
    const expandable = !!(node.children && node.children.length > 0);
    const value = node.value || '';
    const isHighlighted = this.filterRegex ? new RegExp(this.filterRegex, 'i').test(value) : false;
    
    return {
      expandable,
      name: node.key,
      value: node.value,
      level,
      isHighlighted,
      fullKey: node.fullKey
    };
  };

  treeFlattener = new MatTreeFlattener(
    this.transformer,
    node => node.level,
    node => node.expandable,
    node => node.children || [],
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  hasChild = (_: number, node: FlatNode) => node.expandable;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      console.log('AttrTreeView received data:', this.data);
      this.dataSource.data = this.data;
      
      if (this.expandAll) {
        // Use setTimeout to ensure the view is updated before expanding
        setTimeout(() => {
          console.log('Expanding all nodes. Total nodes:', this.treeControl.dataNodes.length);
          this.treeControl.dataNodes.forEach((node, index) => {
            if (node.expandable) {
              console.log(`Expanding node ${index}: ${node.name} (level ${node.level})`);
              this.treeControl.expand(node);
            }
          });
        });
      }
    }
  }

  getDisplayValue(value: string | undefined): string {
    if (value === undefined || value === '') return '';
    // Truncate long values
    const maxLength = 100;
    return value.length > maxLength 
      ? `${value.substring(0, maxLength)}...` 
      : value;
  }

  trackByFn(_: number, node: FlatNode): string {
    return `${node.fullKey}-${node.level}`;
  }
}
