import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ModelLoaderServiceInterface } from '../../common/model_loader_service_interface.js';

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
    private readonly modelLoaderService: ModelLoaderServiceInterface
  ) {}

  isLoadingGraphs = false;

  async handleLoadGraphsFromServer() {
    this.isLoadingGraphs = true;

    try {
      const errors = await this.modelLoaderService.preloadModels();
      // TODO: display error modal
    } catch (err) {
      // TODO: handle errors
    } finally {
      this.isLoadingGraphs = false;
    }
  }
}
