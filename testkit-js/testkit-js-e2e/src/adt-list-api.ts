/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ContractConfiguration } from '@midnight-ntwrk/testkit-js';
import path from 'path';

export { CompiledAdtListContract } from './contract';

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

export class AdtListConfiguration implements ContractConfiguration {
  readonly privateStateStoreName;
  readonly zkConfigPath;
  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName || 'adt-list-private-state';
    this.zkConfigPath = zkConfigPath || path.resolve(currentDir, '..', 'dist', 'contract', 'compiled', 'adt_list');
  }
}
