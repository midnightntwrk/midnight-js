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

import { describe, expectTypeOf, it } from 'vitest';

import type { AnyPrivateState, AnyProvableCircuitId } from '../midnight-types';

// The two names carry no ledger prefix because they reduce to era-neutral types. If either stops
// reducing to its era-neutral type, it is bound to ledger 9 and must take the prefix.
describe('unprefixed Any aliases', () => {
  it('AnyProvableCircuitId is a plain string', () => {
    expectTypeOf<AnyProvableCircuitId>().toEqualTypeOf<string>();
  });

  it('AnyPrivateState is any', () => {
    expectTypeOf<AnyPrivateState>().toBeAny();
  });
});
