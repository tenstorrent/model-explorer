import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, ChangeDetectorRef, signal, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ModelLoaderServiceInterface, OverridesPerNode } from '../../common/model_loader_service_interface';
import { AppService } from './app_service';
import { UrlService } from '../../services/url_service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModelItemStatus, type ModelItem } from '../../common/types';
import { genUid } from './common/utils';
import { GraphErrorsDialog } from '../graph_error_dialog/graph_error_dialog';
import { LoggingDialog } from '../logging_dialog/logging_dialog';
import { NodeDataProviderExtensionService } from './node_data_provider_extension_service';
import type { LoggingServiceInterface } from '../../common/logging_service_interface';
import type { Graph } from './common/input_graph';
import { ExecutionSettingsDialog, type ExecutionSettingsDialogData } from '../execution_settings_dialog/execution_settings_dialog';
import { CppCodeDialog, type CppCodedialogData } from '../cpp_code_dialog/cpp_code_dialog.js';

declare global {
	interface DocumentEventMap {
		'override-upload': CustomEvent<undefined>;
	}
}

/**
 * The graph edit component.
 *
 * It allows users to upload overrides and execute a graph.
 */
@Component({
  standalone: true,
  selector: 'graph-edit',
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './graph_edit.ng.html',
  styleUrls: ['./graph_edit.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphEdit {
  @Input({required: true}) appService!: AppService;
  @Input({required: true}) nodeDataProviderExtensionService!: NodeDataProviderExtensionService;
  isProcessingExecuteRequest = signal(false);
  isProcessingUploadRequest = signal(false);

  executionProgress = 0;
  executionTotal = 0;

  constructor(
    @Inject('LoggingService')
    private readonly loggingService: LoggingServiceInterface,
    @Inject('ModelLoaderService')
    private readonly modelLoaderService: ModelLoaderServiceInterface,
    private readonly urlService: UrlService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  private poolForStatusUpdate(modelItem: ModelItem, modelPath: string, updateCallback: (progress: number, total: number, elapsedTime: string, stdout?: string) => void | Promise<void>, doneCallback: (status: 'done' | 'timeout', elapsedTime: string) => void | Promise<void>, errorCallback: (error: string, elapsedTime: string) => void | Promise<void>) {
    const POOL_TIME_MS = 1 * 1000; // 1 second
    const TIMEOUT_MS = 1 * 60 * 60 * 1000; // 1 hour

    type DurationFormat = (duration: number) => string;
    let intervalFormatter: DurationFormat = (duration) => duration.toString();
    if ('DurationFormat' in Intl) {
      // @ts-expect-error This is not included in typescript's definition yet
      intervalFormatter = (duration) => new Intl.DurationFormat('en-US', { style: 'digital' })?.format({
        minutes: Math.floor((duration / 1000 / 60)),
        seconds: Math.floor((duration / 1000) % 60),
        milliseconds: Math.floor(((duration / 1000) % 1) * 1000)
      });
    }

    const startTime = Date.now();
    const intervalId = setInterval(async () => {
      const { isDone, total = 100, progress, error, stdout } = await this.modelLoaderService.checkExecutionStatus(modelItem, modelPath);
      const deltaTime = Date.now() - startTime;

      if (error) {
        errorCallback(error, intervalFormatter(deltaTime));
        clearInterval(intervalId);
        return;
      }

      if (isDone) {
        doneCallback('done', intervalFormatter(deltaTime));
        clearInterval(intervalId);
        return;
      }

      if (deltaTime > TIMEOUT_MS) {
        doneCallback('timeout', intervalFormatter(deltaTime));
        clearInterval(intervalId);
        return;
      }

      if (progress !== -1) {
        // Regular expression adapted from: https://github.com/chalk/ansi-regex
        const formattedStdout = stdout?.replaceAll(new RegExp(`[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))`,'giu'), '');

        updateCallback(progress, total, intervalFormatter(deltaTime), formattedStdout);
      }
    }, POOL_TIME_MS);
  }

  private async updateGraphInformation(curModel: ModelItem, models: ModelItem[]) {
    const newGraphCollections = await this.modelLoaderService.loadModel(curModel);

    if (curModel.status() !== ModelItemStatus.ERROR) {
      const newGraphCollectionsLabels = newGraphCollections?.map(({ label }) => label) ?? [];

      this.modelLoaderService.loadedGraphCollections.update((prevGraphCollections) => {
        const filteredGraphCollections = (prevGraphCollections ?? [])?.filter(({ label }) => !newGraphCollectionsLabels.includes(label));
        const mergedGraphCollections = [...filteredGraphCollections, ...newGraphCollections];

        return mergedGraphCollections;
      });

      this.urlService.setUiState(undefined);
      this.urlService.setModels(models?.map(({ path, selectedAdapter }) => {
        return {
          url: path,
          adapterId: selectedAdapter?.id
        };
      }) ?? []);


      this.modelLoaderService.overrides.update((curOverrides) => {
        newGraphCollections.forEach(({ label: collectionLabel, graphs }) => {
          graphs.forEach(({ id: graphId }) => {
            const existingOverrides = curOverrides
            ?.[collectionLabel ?? '']
            ?.[graphId ?? ''];

            if (existingOverrides) {
              existingOverrides.wasSentToServer = true;
            }
          });
        });

        return curOverrides;
      });
      this.modelLoaderService.graphErrors.update(() => undefined);
      this.appService.addGraphCollections(newGraphCollections);

      const modelGraphs = this.appService.panes().map((pane) => pane.modelGraph).filter((modelGraph) => modelGraph !== undefined);

      newGraphCollections.forEach((collection) => {
        collection.graphs.forEach((graph: Partial<Graph>) => {
          // TODO: find a better way to reference the model graph
          const modelGraph = modelGraphs.find(({ id, collectionLabel }) => collectionLabel === collection.label && (graph.id ? id.startsWith(graph.id) : false));

          if (modelGraph) {
            Object.entries(graph.overlays ?? {}).forEach(([runName, overlayData]) => {
              const formattedRunName = runName === 'perf_data' ? `${modelGraph.id} (Performance Trace)` : runName;
              const newRunId = genUid();

              this.nodeDataProviderExtensionService.getRunsForModelGraph(modelGraph)
                .filter(({ runName: prevRunName }) => prevRunName === formattedRunName)
                .map(({ runId }) => runId)
                .forEach((runId) => {
                  this.nodeDataProviderExtensionService.deleteRun(runId);
                });

              this.nodeDataProviderExtensionService.addRun(
                newRunId,
                formattedRunName,
                curModel.selectedAdapter?.id ?? '',
                modelGraph,
                overlayData,
              );
            });
          }
        });
      });

      this.showSuccessMessage('Model updated');
    } else {
      this.showErrorDialog('Graph Execution Error', curModel.errorMessage ?? 'An error has occured');
    }
  }

  private getCurrentGraphInformation() {
    const curPane = this.appService.getSelectedPane();
    const curCollectionLabel = curPane?.modelGraph?.collectionLabel ?? '';
    const curModelId = curPane?.modelGraph?.id ?? '';
    const curCollection = this.appService.curGraphCollections().find(({ label }) => label === curCollectionLabel);
    const models = this.modelLoaderService.models();
    const curModel = models.find(({ label }) => label === curCollectionLabel);
    const graphOverrides = this.modelLoaderService.overrides()
      ?.[curCollectionLabel]
      ?.[curModelId]
      ?.overrides
      ?? {};

    return {
      curModel,
      curCollection,
      curCollectionLabel,
      curModelId,
      models,
      graphOverrides,
    };
  }

  private showErrorDialog(title: string, ...messages: string[]) {
    this.modelLoaderService.graphErrors.update((curErrors) => {
      return [...new Set([...curErrors ?? [], ...messages])];
    });
    this.dialog.open(GraphErrorsDialog, {
      width: 'clamp(10rem, 60vw, 60rem)',
      height: 'clamp(10rem, 60vh, 60rem)',
      data: {
        errorMessages: [...messages],
        title
      }
    });
  }

  private showSuccessMessage(message: string, action = 'Dismiss') {
    this.snackBar.open(message, action, {
      duration: 5000,
      verticalPosition: 'top',
      horizontalPosition: 'center'
    });
  }

  async handleClickExecuteGraph() {
    const { curModel, models, graphOverrides } = this.getCurrentGraphInformation();

    if (curModel) {
      try {
        this.isProcessingExecuteRequest.update(() => true);
        this.loggingService.info('Start executing model', curModel.path);

        const result = await this.modelLoaderService.executeModel(curModel, graphOverrides);

        if (curModel.status() !== ModelItemStatus.ERROR) {
          if (result) {
            const updateStatus = (progress: number, total: number, elapsedTime: string, stdout?: string) => {
              this.executionProgress = progress ?? this.executionProgress;
              this.executionTotal = total;
              this.loggingService.debug(`Execution progress: ${progress} of ${total}`, curModel.path, `Elapsed time: ${elapsedTime}`);

              if (stdout) {
                this.loggingService.info(stdout);
              }

              this.changeDetectorRef.detectChanges();
            };

            const finishUpdate = async (status: 'done' | 'timeout', elapsedTime: string) => {
              if (status === 'timeout') {
                this.loggingService.error('Model execute timeout', curModel.path, `Elapsed time: ${elapsedTime}`);
              } else {
                this.loggingService.info('Model execute finished', curModel.path, `Elapsed time: ${elapsedTime}`);
                await this.updateGraphInformation(curModel, models);
                this.loggingService.info('Model updated', curModel.path);
              }

              this.isProcessingExecuteRequest.update(() => false);
            };

            const showError = (error: string, elapsedTime: string) => {
              this.executionProgress = 0;
              this.isProcessingExecuteRequest.update(() => false);
              this.loggingService.error('Graph Execution Error', error, `Elapsed time: ${elapsedTime}`);
              this.showErrorDialog('Graph Execution Error', error);
            };

            this.poolForStatusUpdate(curModel, curModel.path, updateStatus, finishUpdate, showError);
          } else {
            throw new Error("Graph execution resulted in an error");
          }
        } else {
          throw new Error(curModel.errorMessage ?? 'An error has occured');
        }
      } catch (err) {
        const errorMessage = (err as Error).message ?? 'An error has occured';

        this.loggingService.error('Graph Execution Error', errorMessage);
        this.showErrorDialog('Graph Execution Error', errorMessage);
        this.isProcessingExecuteRequest.update(() => false);
      }
    }
  }

  handleLogDialogOpen() {
    this.dialog.open(LoggingDialog, {
      width: 'clamp(10rem, 80vw, 100rem)',
      height: 'clamp(10rem, 80vh, 100rem)'
    });
  }

  handleDownloadOverrides() {
    const { graphOverrides, curCollectionLabel, curModelId } = this.getCurrentGraphInformation();

    if (graphOverrides) {
      const tempElement = document.createElement('a');
      const textUrl = URL.createObjectURL(new Blob([JSON.stringify(graphOverrides, null, '\t')], { type: 'application/json' }));

      tempElement.hidden = true;
      tempElement.download = `overrides-${curCollectionLabel}-${curModelId}-${new Date().toISOString()}.json`;
      tempElement.href = textUrl;
      tempElement.click();

      URL.revokeObjectURL(textUrl);
    }
  }

  async handleUploadOverrides(input: HTMLInputElement) {
    const overridesFile = input.files?.[0];

    if (!overridesFile || overridesFile.type !== 'application/json') {
      return;
    }

    try {
      const contents = await overridesFile.text();
      const newOverrides = JSON.parse(contents) as OverridesPerNode;

      if (!newOverrides || Array.isArray(newOverrides)) {
        throw new Error('Overrides should be an a JSON object.');
      }

      const { curCollectionLabel, curModelId } = this.getCurrentGraphInformation();

      this.modelLoaderService.updateOverrides({
        [curCollectionLabel]: {
          [curModelId]: {
            overrides: newOverrides,
            wasSentToServer: false
          }
        }
      });

      document.dispatchEvent(new CustomEvent('override-upload'));
    } catch (err) {
      const errorMessage = (err as Error).message ?? 'An error has occured';

      this.loggingService.error('Overrides Loading Error', errorMessage);
      this.showErrorDialog('Overrides Loading Error', errorMessage);
    }

    input.value = '';
  }

  handleCppDialogOpen() {
    this.dialog.open(CppCodeDialog, {
      width: 'clamp(10rem, 80vw, 100rem)',
      height: 'clamp(10rem, 80vh, 100rem)',
      data: { code: this.curCppCode } as CppCodedialogData
    });
  }

  handleSettingsDialogOpen() {
    const curExtensionId = this.getCurrentGraphInformation().models[0].selectedAdapter?.id ?? '';

    this.dialog.open(ExecutionSettingsDialog, {
      width: 'clamp(10rem, 80vw, 30rem)',
      height: 'clamp(10rem, 80vh, 40rem)',
      data: { curExtensionId } as ExecutionSettingsDialogData
    });
  }

  get curCppCode() {
    const { curCollectionLabel, curModelId } = this.getCurrentGraphInformation();

    return this.modelLoaderService.generatedCppCode()?.[curCollectionLabel]?.[curModelId] ?? '';
  }

  get hasOverrides() {
    return this.modelLoaderService.hasOverrides;
  }

  get hasCurModel() {
    return this.getCurrentGraphInformation().curModel !== undefined;
  }

  get graphHasErrors() {
    return this.modelLoaderService.graphErrors() !== undefined;
  }
}
