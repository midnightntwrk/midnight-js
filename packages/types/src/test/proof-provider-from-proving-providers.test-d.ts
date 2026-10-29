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

import type { ProvingProvider as Ledger8ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expectTypeOf, it } from 'vitest';

import { createProofProviderFromProvingProviders, type ProofProvider } from '../proof-provider';

// Compile-level tests: the property under test is that this file type-checks,
// and for the `@ts-expect-error` cases that it does NOT without the suppression.

const ledger9ProvingProvider: ProvingProvider = {
  check: async () => [],
  prove: async () => new Uint8Array(),
  lookupKey: async () => undefined
};

// What an in-process prover's `asV8ProvingProvider()` is declared to return.
const ledger8ProvingProvider: Ledger8ProvingProvider = {
  check: async () => [],
  prove: async () => new Uint8Array()
};

describe('createProofProviderFromProvingProviders', () => {
  it('accepts a v8 proving provider, which declares no lookupKey', () => {
    expectTypeOf(
      createProofProviderFromProvingProviders({ v8: ledger8ProvingProvider, v9: ledger9ProvingProvider })
    ).toExtend<ProofProvider>();
  });

  // The v9 shape is a superset of the v8 one, so only this direction is an
  // error; the reverse type-checks, which is why the pairing is documented.
  it('refuses a v8 proving provider for v9', () => {
    createProofProviderFromProvingProviders({
      v8: undefined,
      // @ts-expect-error the v9 ProvingProvider also declares lookupKey
      v9: ledger8ProvingProvider
    });
  });

  it('requires a key for every era', () => {
    // @ts-expect-error the v8 key is missing; an unserved era is written as undefined
    createProofProviderFromProvingProviders({ v9: ledger9ProvingProvider });
  });
});
