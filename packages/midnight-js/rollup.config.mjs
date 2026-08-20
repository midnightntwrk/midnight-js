/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { createMultiEntryRollupConfig } from '../../build-tools/rollup.config.multi-entry.mjs';

export default createMultiEntryRollupConfig(
  {
    index: 'src/index.ts',
    contracts: 'src/contracts.ts',
    'network-id': 'src/network-id.ts',
    types: 'src/types.ts',
    utils: 'src/utils.ts'
  },
  [/node_modules/, /^@midnight-ntwrk\/midnight-js-(.*)$/]
);
