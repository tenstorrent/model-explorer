/**
 * @license
 * Copyright 2026 The Model Explorer Authors. All Rights Reserved.
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

import {loadTfjsModel} from './tfjs';

/** Helper: builds a minimal Tfjs graph around one op node's attributes. */
function loadGraphWithAttrs(attr: {
  [key: string]: unknown;
}): {attrs: Array<{key: string; value: unknown}>} {
  const collection = loadTfjsModel('test.json', {
    modelTopology: {
      node: [
        {
          name: 'op_node',
          op: 'TestOp',
          attr: attr as never,
        },
      ],
    },
  });
  const attrs = collection.graphs[0].nodes[0].attrs ?? [];
  return {attrs};
}

/** Helper: reads a single attr value by key. */
function attrValue(
    attrs: Array<{key: string; value: unknown}>, key: string): string {
  const found = attrs.find((a) => a.key === key);
  if (found == null) {
    fail(`expected attr '${key}' to exist`);
  }
  return `${found!.value}`;
}

describe('tfjs attribute decoding', () => {
  it('renders a scalar boolean false as "false" (issue #86)', () => {
    const {attrs} = loadGraphWithAttrs({some_flag: {b: false}});
    expect(attrValue(attrs, 'some_flag')).toEqual('false');
  });

  it('renders a scalar boolean true as "true"', () => {
    const {attrs} = loadGraphWithAttrs({other_flag: {b: true}});
    expect(attrValue(attrs, 'other_flag')).toEqual('true');
  });

  it('renders every entry of a boolean list, including false (issue #86)',
     () => {
       const {attrs} = loadGraphWithAttrs({flags_list: {list: {b: [
         true, false, true,
       ]}}});
       expect(attrValue(attrs, 'flags_list')).toEqual('true, false, true');
     });

  it('labels DT_QUINT8 as unsigned quint8 (issue #86)', () => {
    // DT_QUINT8 == 12 per the TFJS DataType enum.
    const {attrs} = loadGraphWithAttrs({dtype_attr: {type: 12}});
    expect(attrValue(attrs, 'dtype_attr')).toEqual('quint8');
  });

  it('labels DT_QUINT16 as unsigned quint16 (issue #86)', () => {
    // DT_QUINT16 == 16 per the TFJS DataType enum.
    const {attrs} = loadGraphWithAttrs({dtype_attr: {type: 16}});
    expect(attrValue(attrs, 'dtype_attr')).toEqual('quint16');
  });

  it('still labels signed quantized dtypes correctly', () => {
    // DT_QINT8 == 11, DT_QINT16 == 15.
    let {attrs} = loadGraphWithAttrs({dtype_attr: {type: 11}});
    expect(attrValue(attrs, 'dtype_attr')).toEqual('qint8');
    ({attrs} = loadGraphWithAttrs({dtype_attr: {type: 15}}));
    expect(attrValue(attrs, 'dtype_attr')).toEqual('qint16');
  });
});
