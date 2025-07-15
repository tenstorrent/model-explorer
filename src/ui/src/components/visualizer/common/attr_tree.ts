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

import {KeyValue} from './types';

// Use the extended KeyValue interface for tree nodes
export type AttrTreeNode = KeyValue;

/**
 * Builds a tree structure from flat key-value pairs where keys represent paths.
 * Path segments are separated by forward slashes ('/').
 * 
 * Escaping rule:
 * - If an original framework attribute contains a slash, escape it as '//'.
 * - When rendering, un-escape '//' back to '/'.
 * 
 * Each node in the tree contains:
 * - key: The segment name at this level (e.g., "bar" for "foo/bar/baz")
 * - fullKey: The path up to this node (e.g., "foo" -> "foo/bar" -> "foo/bar/baz")
 * - originalKey: The complete original key (only for leaf nodes, useful for editable fields)
 * - value: The attribute value (only for leaf nodes)
 * 
 * Uses a lookup map approach to efficiently provide originalKey for leaf nodes without
 * impacting the recursive processing performance.
 * 
 * @param attrs Flat key-value pairs where keys may represent paths
 * @returns Array of root nodes for the attribute tree
 */
export function buildAttrTree(attrs: Record<string, unknown>): AttrTreeNode[] {
  // Use a separate interface for building to handle the Record vs Array difference
  interface BuildingNode {
    key: string;
    fullKey: string;  // The path up to this node (e.g., "foo/bar" for bar in "foo/bar/baz")
    value?: string;
    children?: Record<string, BuildingNode>;
  }
  
  const root: Record<string, BuildingNode> = {};
  // Create a lookup map from fullKey to originalKey for efficient retrieval
  const fullKeyToOriginalKey: Record<string, string> = {};

  for (const [rawKey, value] of Object.entries(attrs)) {
    if (value === undefined || value === '') continue;
    
    // Convert value to string for display
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    // Split on single forward slashes, but not double slashes (which are escaped)
    const pathSegments = rawKey.split(/\/(?!\/)/g);
    
    let currentLevel = root;
    
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const isLeaf = i === pathSegments.length - 1;
      const fullKey = pathSegments.slice(0, i + 1).join('/');
      
      // Store the mapping from fullKey to originalKey (for editable fields)
      fullKeyToOriginalKey[fullKey] = rawKey;
      
      // Create node if it doesn't exist
      if (!currentLevel[segment]) {
        currentLevel[segment] = {
          key: segment,
          fullKey,
          children: isLeaf ? undefined : {}
        };
      }
      
      if (isLeaf) {
        currentLevel[segment].value = stringValue;
        currentLevel[segment].children = undefined;
      } else {
        // Ensure we have a children object for non-leaf nodes
        if (!currentLevel[segment].children) {
          currentLevel[segment].children = {};
        }
        currentLevel = currentLevel[segment].children!;
      }
    }
  }

  // Convert children from Record to array and sort alphabetically
  function processNode(nodeRecord: Record<string, BuildingNode>): AttrTreeNode[] {
    return Object.values(nodeRecord)
      .map(node => ({
        key: node.key,
        value: node.value || '',
        fullKey: node.fullKey,
        // Add originalKey for leaf nodes (those with values) using the lookup map
        originalKey: node.value ? fullKeyToOriginalKey[node.fullKey] : undefined,
        children: node.children ? processNode(node.children) : undefined,
        type: 'tree' as const
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  return processNode(root);
}


