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
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {AppService} from './app_service';
import { ModelLoaderServiceInterface, type OverridesPerCollection, type OverridesPerGraph } from '../../common/model_loader_service_interface';
import type { AttributeDisplayType, EditableAttributeTypes, EditableValueListAttribute } from './common/types.js';

interface UrlInfo {
  anchorText: string;
  url: string;
}

// Regular expression to match a Markdown link format: [anchorText](url)
const MARKDOWN_LINK_REGEX = /^\[([^\]]+)\]\(([^)]+)\)$/;

// Internal URL prefixes that should be recognized as URLs.
const INTERNAL_URL_PREFIXES = ['go/', 'b/', 'cl/', 'cs/', 'google3/'];

interface UrlInfo {
  anchorText: string;
  url: string;
}

/** Expandable info text component. */
@Component({
  selector: 'expandable-info-text',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './expandable_info_text.ng.html',
  styleUrls: ['./expandable_info_text.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpandableInfoText implements AfterViewInit, OnDestroy, OnChanges {
  @Input() text = '';
  @Input() type = '';
  @Input() collectionLabel = '';
  @Input() graphId = '';
  @Input() nodeFullLocation = '';
  @Input() nodeNamedLocation = '';
  @Input() bgColor = 'transparent';
  @Input() textColor = 'inherit';
  @Input() editable?: EditableAttributeTypes = undefined;
  @Input() displayType?: AttributeDisplayType = undefined;
  @ViewChild('container') container?: ElementRef<HTMLElement>;
  @ViewChild('oneLineText') oneLineText?: ElementRef<HTMLElement>;

  displayText = '';
  override?: string;
  wasOverrideSentToServer = false;

  expanded = false;
  urlInfo?: UrlInfo;

  private hasOverflowInternal = false;
  private resizeObserver?: ResizeObserver;

  constructor(
    @Inject('ModelLoaderService')
    private readonly modelLoaderService: ModelLoaderServiceInterface,
    private readonly appService: AppService,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  @HostBinding('class.expanded') get hostExpanded() {
    return this.expanded;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateHasOverflow();
      this.changeDetectorRef.markForCheck();
    });

    if (this.container) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateHasOverflow();
        this.changeDetectorRef.markForCheck();
      });
      this.resizeObserver.observe(this.container.nativeElement);
    }

    this.handleOverrideChange(this.modelLoaderService.overrides());
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      this.updateHasOverflow();
      this.changeDetectorRef.markForCheck();
    });

    if (changes['text']) {
      this.urlInfo = this.parseUrlInfo(this.text);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  hasCurModel() {
    const curPane = this.appService.getSelectedPane();
    const curCollectionLabel = curPane?.modelGraph?.collectionLabel;
    const models = this.modelLoaderService.models();
    const curModel = models.find(({ label }) => label === curCollectionLabel);

    return curModel !== undefined;
  }

  @HostListener('document:override-update', ['$event.detail'])
  handleOverrideChange(newOverrides: OverridesPerCollection) {
    const graphOverrides = this.getGraphOverride(newOverrides);
    this.updateDisplayText(graphOverrides);
  }

  splitEditableList(value: string, separator = ',') {
    return value
      .replace(/^\[/iu, '')
      .replace(/\]$/iu, '')
      .split(separator)
      .map((part) => {
        const parsedValue = Number.parseFloat(part);

        if (Number.isNaN(parsedValue)) {
          return { type: 'text', value: part.trim() };
        }

        return { type: 'number', value: parsedValue }
      });
  }

  handleTextChange(evt: Event) {
    const target = evt.target;

    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
      return;
    }

    if (!this.collectionLabel || !this.graphId || !this.nodeFullLocation) {
      return;
    }

    let updatedValue = target.value;

    if (this.editable?.input_type === 'int_list') {
      updatedValue = `[${this.splitEditableList(this.displayText).map(({ value }, index) => {
        if (index.toString() === target.dataset['index']) {
          return target.value;
        }

        return value;
      }).join(', ')}]`;
    }

    if (this.editable?.input_type === 'grid') {
      updatedValue = `${this.splitEditableList(this.displayText, this.editable?.separator ?? 'x').map(({ value }, index) => {
        if (index.toString() === target.dataset['index']) {
          return target.value;
        }

        return value;
      }).join(this.editable?.separator ?? 'x')}`;
    }

    this.modelLoaderService.updateOverrides({
      [this.collectionLabel]: {
        [this.graphId]: {
          wasSentToServer: false,
          overrides: {
            [this.nodeFullLocation]: {
              full_location: this.nodeFullLocation,
              named_location: this.nodeNamedLocation,
              attributes: [{
                key: this.type,
                value: updatedValue
              }]
            }
          }
        }
      }
    });

    this.override = updatedValue;
    this.displayText = updatedValue;
  }

  handleToggleExpand(event: MouseEvent, fromExpandedText = false) {
    if (!this.hasOverflow && !this.hasMultipleLines) {
      return;
    }

    event.stopPropagation();

    // Don't allow clicking on the expanded text to collapse it because users
    // might want to copy the content.
    if (fromExpandedText && this.expanded) {
      return;
    }
    this.expanded = !this.expanded;
  }

  getMaxConstValueCount(): number {
    return this.appService.config()?.maxConstValueCount ?? 0;
  }

  getEditableOptions(editable: EditableAttributeTypes, value: string) {
    const options = (editable as EditableValueListAttribute).options;

    if (options.includes(value)) {
      return options;
    }

    return [value, ...options];
  }

  isPercentage(value: string) {
    const parsedValue = Number.parseFloat(value);

    if (Number.isNaN(parsedValue)) {
      return false;
    }

    if (parsedValue < 0 || parsedValue > 1) {
      return false;
    }

    return true;
  }

  formatPercentage(value: string) {
    const parsedValue = Number.parseFloat(value);

    if (Number.isNaN(parsedValue)) {
      return '0%';
    }

    return `${parsedValue * 100}%`;
  }

  private getGraphOverride(overrides: OverridesPerCollection) {
    return overrides
      ?.[this.collectionLabel]
      ?.[this.graphId];
  }

  private getAttributeOverrides(graphOverrides?: OverridesPerGraph[string]) {
    return graphOverrides
      ?.overrides
      ?.[this.nodeFullLocation]
      ?.attributes
      ?.find(({ key }) => key === this.type)
      ?.value;
  }

  updateDisplayText(graphOverrides: OverridesPerGraph[string] | undefined) {
    this.wasOverrideSentToServer = graphOverrides?.wasSentToServer ?? false;
    this.override = this.getAttributeOverrides(graphOverrides);

    this.displayText = this.override ?? this.text;
  }

  get overrideTooltip() {
    if (this.wasOverrideSentToServer && this.hasOverride) {
        return 'Override was not applied';
    }

    if (this.wasOverrideSentToServer && !this.hasOverride) {
        return 'Override was applied';
    }

    if (this.hasOverride) {
      return 'This field has an override';
    }

    return '';
  }

  get overrideIcon() {
    if (this.wasOverrideSentToServer && this.hasOverride) {
        return 'warning';
    }

    if (this.wasOverrideSentToServer && !this.hasOverride) {
        return 'check_circle';
    }

    if (this.hasOverride) {
      return 'info';
    }

    return '';
  }

  get isOverrideUploded() {
    return this.override !== undefined && this.wasOverrideSentToServer;
  }

  get hasOverride() {
    return this.override !== undefined && this.override !== this.text;
  }

  get maxIntValue() {
    return Number.MAX_SAFE_INTEGER;
  }

  get hasOverflow(): boolean {
    this.updateHasOverflow();
    return this.hasOverflowInternal;
  }

  get hasMultipleLines(): boolean {
    return this.type !== 'namespace' && this.displayText.includes('\n');
  }

  get iconName(): string {
    return this.expanded ? 'unfold_less' : 'unfold_more';
  }

  get hasBgColor(): boolean {
    return this.bgColor !== 'transparent';
  }

  get namespaceComponents(): string[] {
    const components = this.displayText.split('/');
    if (this.displayText !== '<root>') {
      components.unshift('<root>');
    }
    return components;
  }

  get formatQuantization(): string {
    const parts = this.displayText
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map((value) => value.trim());
    return parts.join('\n');
  }

  private updateHasOverflow() {
    if (!this.oneLineText) {
      this.hasOverflowInternal = false;
      return;
    }

    this.hasOverflowInternal =
      this.oneLineText.nativeElement.scrollWidth >
      this.oneLineText.nativeElement.offsetWidth;
    if (
      this.expanded &&
      (this.type === 'namespace' || this.type === 'values')
    ) {
      this.hasOverflowInternal = true;
    }
  }

  /**
   * Parses a given text string to extract URL information.
   *
   * It handles two formats:
   * 1. A direct URL (e.g., "https://example.com")
   * 2. A Markdown link format (e.g., "[Visit Example](https://example.com)")
   */
  private parseUrlInfo(text: string): UrlInfo | undefined {
    if (text.trim() === '') {
      return undefined;
    }

    // Try to match the text against the Markdown link regex
    const match = text.match(MARKDOWN_LINK_REGEX);

    // Markdown.
    if (match) {
      // The first captured group is the anchor text
      const anchorText = match[1];
      // The second captured group is the URL
      let url = match[2];
      // Add http protocol if it's missing (e.g. internal urls).
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://${url}`;
      }
      return {anchorText, url};
    }
    // Internal-only urls.
    else if (INTERNAL_URL_PREFIXES.some((prefix) => text.startsWith(prefix))) {
      return {anchorText: text, url: `http://${text}`};
    }
    // Regular URL.
    else if (text.startsWith('http://') || text.startsWith('https://')) {
      try {
        // tslint:disable:no-unused-variable
        const unused = new URL(text);
        return {anchorText: text, url: text};
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }
}
