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

import {loadTfjsModel} from './tfjs';

describe('loadTfjsModel', () => {
  it('preserves boolean values and unsigned quantized data types', () => {
    const model = {
      modelTopology: {
        node: [{
          name: 'node',
          op: 'TestOp',
          attr: {
            scalarFalse: {b: false},
            booleans: {list: {b: [false, true]}},
            quint8: {type: 12},
            quint16: {type: 16},
          },
        }],
      },
    } as Parameters<typeof loadTfjsModel>[1];

    const collection = loadTfjsModel('model.json', model);

    expect(collection.graphs[0].nodes[0].attrs).toEqual([
      {key: 'scalarFalse', value: 'false'},
      {key: 'booleans', value: 'false, true'},
      {key: 'quint8', value: 'quint8'},
      {key: 'quint16', value: 'quint16'},
    ]);
  });
});
