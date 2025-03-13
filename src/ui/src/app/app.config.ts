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

import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideRouter, Routes} from '@angular/router';

import {DemoPage} from '../components/demo_page/demo_page';
import {HomePage} from '../components/home_page/home_page';
import {INJECT_WINDOW} from '../inject';
import {ModelLoaderService} from '../services/model_loader_service';
import { LoggingService } from '../services/logging_service';

const routes: Routes = [
  {path: '', component: HomePage},
  {path: 'demo', component: DemoPage},
];

/** Main app config. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideAnimations(),
    {provide: 'ModelLoaderService', useClass: ModelLoaderService},
    {provide: 'LoggingService', useClass: LoggingService},
    {provide: INJECT_WINDOW, useValue: window},
  ],
};
