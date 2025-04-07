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

import {WritableSignal} from '@angular/core';
import {Subject} from 'rxjs';

import {Graph, GraphCollection} from '../components/visualizer/common/input_graph';
import {ModelGraph, ModelNode} from '../components/visualizer/common/model_graph';
import type {
	AddSnapshotInfo,
	DownloadAsPngInfo,
	ExpandOrCollapseAllGraphLayersInfo,
	LocateNodeInfo,
	ModelGraphProcessedEvent,
	NodeInfo,
	Pane,
	RendererInfo,
	RestoreSnapshotInfo,
	SearchResults,
	SelectedNodeInfo,
	ShowOnEdgeItemData,
	ShowOnNodeItemData,
	SnapshotData
} from '../components/visualizer/common/types';

import type { VisualizerConfig } from '../components/visualizer/common/visualizer_config';
import type { VisualizerUiState } from '../components/visualizer/common/visualizer_ui_state';


/** The interface of the app service. */
export interface AppServiceInterface {
  readonly curGraphCollections: WritableSignal<GraphCollection[]>;
  readonly curToLocateNodeInfo: WritableSignal<LocateNodeInfo | undefined>;
  readonly curSelectedRenderer: WritableSignal<RendererInfo | undefined>;
  readonly config: WritableSignal<VisualizerConfig | undefined>;
  readonly curInitialUiState: WritableSignal<VisualizerUiState | undefined>;
  readonly panes: WritableSignal<Pane[]>;
  readonly selectedPaneId: WritableSignal<string>;
  readonly remoteNodeDataPaths: WritableSignal<string[]>;
  readonly selectedNode: WritableSignal<NodeInfo | undefined>;
  readonly hoveredNode: WritableSignal<NodeInfo | undefined>;
  readonly doubleClickedNode: WritableSignal<NodeInfo | undefined>;

  readonly spaceKeyToZoomFitClicked: Subject<{}>;
  readonly searchKeyClicked: Subject<{}>;
  readonly addSnapshotClicked: Subject<AddSnapshotInfo>;
  readonly curSnapshotToRestore: Subject<RestoreSnapshotInfo>;
  readonly expandOrCollapseAllGraphLayersClicked: Subject<ExpandOrCollapseAllGraphLayersInfo>;
  readonly downloadAsPngClicked: Subject<DownloadAsPngInfo>;
  readonly modelGraphProcessed$: Subject<ModelGraphProcessedEvent>;

  testMode: boolean;

  addGraphCollections(graphCollections: GraphCollection[]): void;
  selectGraphInPane(graph: Graph, paneIndex: number, flattenLayers?: boolean, snapshot?: SnapshotData, initialLayout?: boolean): void;
  selectGraphInCurrentPane(graph: Graph, flattenLayers?: boolean, snapshot?: SnapshotData, initialLayout?: boolean): void;
  openGraphInSplitPane(graph: Graph, flattenLayers?: boolean, initialLayout?: boolean, openToLeft?: boolean): void;
  getIsGraphInRightPane(graphId: string): boolean;
  processGraph(paneId: string, flattenLayers?: boolean, snapshotToRestore?: SnapshotData, initialLayout?: boolean): void;
  setFlattenLayersInCurrentPane(flatten: boolean): void;
  toggleFlattenLayers(paneId: string): void;
  getFlattenLayers(paneId: string): boolean;
  selectPane(paneId: string): void;
  selectPaneByIndex(paneIndex: number): void;
  selectNode(paneId: string, info?: SelectedNodeInfo): void;
  getModelGraphFromSelectedPane(): ModelGraph | undefined;
  getModelGraphFromPane(paneId: string): ModelGraph | undefined;
  getModelGraphFromPaneIndex(paneIndex: number): ModelGraph | undefined;
  getSelectedNodeInfoFromSelectedPane(): SelectedNodeInfo | undefined;
  getSelectedPane(): Pane | undefined;
  setPaneWidthFraction(leftFraction: number): void;
  setSelectedNodeDataProviderRunId(paneId: string, runId: string | undefined): void;
  getSelectedNodeDataProviderRunId(paneId: string): string | undefined;
  setPaneHasArtificialLayers(paneId: string, hasArtificialLayers: boolean): void;
  setNodeToReveal(paneId: string, nodeId: string | undefined): void;
  closePane(paneId: string): void;
  swapPane(): void;
  getPaneById(id: string): Pane | undefined;
  getPaneIndexById(id: string): number;
  addSnapshot(snapshotData: SnapshotData, graphId: string, paneId: string): void;
  deleteSnapshot(index: number, graphId: string, paneId: string): void;
  getGraphById(id: string): Graph | undefined;
  addSubgraphBreadcrumbItem(paneId: string, prevGraphId: string, curGraphId: string, prevGraphSnapshot: SnapshotData): void;
  setCurrentSubgraphBreadcrumb(paneId: string, index: number): void;
  setSearchResults(paneId: string, searchResults: SearchResults): void;
  clearSearchResults(paneId: string): void;
  toggleShowOnNode(paneId: string, rendererId: string, type: string, valueToSet?: boolean): void;
  setShowOnEdge(paneId: string, rendererId: string, type: string, filterText?: string, outputMetadataKey?: string, inputMetadataKey?: string, sourceNodeAttrKey?: string, targetNodeAttrKey?: string): void;
  setShowOnNodeFilter(paneId: string, rendererId: string, type: string, filterRegex: string): void;
  setShowOnNode(paneId: string, rendererId: string, types: Record<string, ShowOnNodeItemData>): void;
  deleteShowOnNodeItemType(types: string[]): void;
  getShowOnNodeItemTypes(paneId: string, rendererId: string): Record<string, ShowOnNodeItemData>;
  getSavedShowOnNodeItemTypes(): Record<string, ShowOnNodeItemData>;
  getSavedShowOnEdgeItem(): ShowOnEdgeItemData | undefined;
  getShowOnEdgeItem(paneId: string, rendererId: string): ShowOnEdgeItemData | undefined;
  getGraphByPaneId(paneId: string): Graph;
  updateCurrentModelGraph(paneId: string, modelGraph: ModelGraph): void;
  getCurrentModelGraphFromPane(paneId: string): ModelGraph | undefined;
  updateSelectedNode(nodeId: string, graphId: string, collectionLabel: string, node?: ModelNode): void;
  updateHoveredNode(nodeId: string, graphId: string, collectionLabel: string, node?: ModelNode): void;
  updateDoubleClickedNode(nodeId: string, graphId: string, collectionLabel: string, node?: ModelNode): void;
  reset(): void;
}
