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

import { describe, expect, it } from 'vitest';

import { Ledger9ContractLog, type Ledger9LogEvent } from '../index';

describe('Ledger9ContractLog re-export', () => {
  it('exposes compact-js decodeAll so consumers decode Ledger9CallResult events without reaching into compact-js', () => {
    expect(Ledger9ContractLog.decodeAll).toBeTypeOf('function');
    expect(Ledger9ContractLog.decodeAll([])).toEqual([]);
  });

  it('re-exports the Ledger9LogEvent type so consumers can name Ledger9CallResult events without importing compact-runtime', () => {
    const events: readonly Ledger9LogEvent[] = [];
    expect(Ledger9ContractLog.decodeAll(events)).toEqual([]);
  });
});
