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

import type { StateValue } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

import { stateValueEqual } from '@/assertions';

const createMockStateValue = (value: string): StateValue => ({
  toString: (_verbose: boolean) => value
}) as StateValue;

describe('[Unit tests] Assertions', () => {
  it('stateValueEqual should return false for different states', () => {
    const a = createMockStateValue('state-a');
    const b = createMockStateValue('state-b');

    expect(stateValueEqual(a, b)).toBe(false);
  });

  it('stateValueEqual should return true for equal states', () => {
    const a = createMockStateValue('same');
    const b = createMockStateValue('same');

    expect(stateValueEqual(a, b)).toBe(true);
  });
});
