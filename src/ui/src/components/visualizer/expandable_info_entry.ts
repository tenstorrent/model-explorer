import {CommonModule} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import type { EditableAttributeTypes } from './common/input_graph';
import type { InfoItem } from './info_panel';
import { HoverableLabel } from './hoverable_label';
import type { SearchMatchAttr } from './common/types';
import { ExpandableInfoText } from './expandable_info_text.js';

/** Expandable info text component. */
@Component({
  selector: 'expandable-info-entry',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, HoverableLabel, ExpandableInfoText],
  templateUrl: './expandable_info_entry.ng.html',
  styleUrls: ['./expandable_info_entry.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpandableInfoEntry {
  @Input() value = '';
  @Input() label = '';
  @Input() collectionLabel?: string = undefined;
  @Input() nodeId?: string = undefined;
  @Input() bgColor = 'transparent';
  @Input() textColor = 'inherit';
  @Input() editable?: EditableAttributeTypes = undefined;
  @Input() children?: InfoItem[] = undefined;
  @Input() curSearchAttrMatches: SearchMatchAttr[] = [];

  constructor() {}

  isSearchMatchedAttrId(attrId: string): boolean {
	return (
	  this.curSearchAttrMatches.find(
		(match) => match.matchedAttrId === attrId,
	  ) != null
	);
  }
}
