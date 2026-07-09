/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { ContractLog, type LogEvent } from '../index';

describe('ContractLog re-export', () => {
  it('exposes compact-js decodeAll so consumers decode CallResult events without reaching into compact-js', () => {
    expect(ContractLog.decodeAll).toBeTypeOf('function');
    expect(ContractLog.decodeAll([])).toEqual([]);
  });

  it('re-exports the LogEvent type so consumers can name CallResult events without importing compact-runtime', () => {
    const events: readonly LogEvent[] = [];
    expect(ContractLog.decodeAll(events)).toEqual([]);
  });
});
