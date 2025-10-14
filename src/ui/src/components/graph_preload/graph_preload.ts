import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ModelLoaderServiceInterface } from '../../common/model_loader_service_interface.js';
import { GraphErrorsDialog } from '../graph_error_dialog/graph_error_dialog.js';
import { ExtensionService } from '../../services/extension_service.js';

const SERVER_REQUEST_TIMEOUT_MS = 2 * 60 * 1000; // Two minutes

@Component({
  selector: 'graph-preload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './graph_preload.ng.html',
  styleUrls: ['./graph_preload.scss'],
})
export class GraphPreload {
  constructor(
    @Inject('ModelLoaderService')
    private readonly modelLoaderService: ModelLoaderServiceInterface,
    private readonly extensionService: ExtensionService,
    private readonly dialog: MatDialog,
  ) {}

  isLoadingGraphs = signal(false);

  get supportsPreload() {
    return this.extensionService.extensions.findIndex(({ settings }) => settings?.supportsPreload) !== -1;
  }

  async handleLoadGraphsFromServer() {
    this.isLoadingGraphs.set(true);

    try {
      const errors = await Promise.race([
        this.modelLoaderService.preloadModels(),
        new Promise<{ graph: string, error: string }[]>((_, reject) => {
          setTimeout(() => reject(new Error('Server request took too long and timed out.')), SERVER_REQUEST_TIMEOUT_MS);
        })
      ]);

      if (errors.length > 0) {
        this.dialog.open(GraphErrorsDialog, {
          width: 'clamp(10rem, 60vw, 60rem)',
          height: 'clamp(10rem, 60vh, 60rem)',
          data: {
            errorMessages: errors.map(({ graph, error}) => `${graph ? `Graph: "${graph}"\n` : ''}Error: ${error}`).join('\n'),
            title: 'Error Loading Graphs from Server'
          }
        });
      }
    } catch (err) {
      this.dialog.open(GraphErrorsDialog, {
        width: 'clamp(10rem, 60vw, 60rem)',
        height: 'clamp(10rem, 60vh, 60rem)',
        data: {
          errorMessages: (err as Error).message ?? (err as Error).toString(),
          title: 'Error Loading Graphs from Server'
        }
      });
    } finally {
      this.isLoadingGraphs.set(false);
    }
  }
}
