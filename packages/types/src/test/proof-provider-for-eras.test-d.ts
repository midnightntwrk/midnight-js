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

import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ProvingProvider as RetainedEraProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import { describe, expectTypeOf, it } from 'vitest';

import { createProofProviderForEras, type ProofProvider } from '../proof-provider';

// Compile-level tests: the property under test is that this file type-checks,
// and for the `@ts-expect-error` case that it does NOT without the suppression.

const currentEraProvingProvider: ProvingProvider = {
  check: async () => [],
  prove: async () => new Uint8Array(),
  lookupKey: async () => undefined
};

// What an in-process prover's `asV8ProvingProvider()` is declared to return.
const retainedEraProvingProvider: RetainedEraProvingProvider = {
  check: async () => [],
  prove: async () => new Uint8Array()
};

describe('createProofProviderForEras', () => {
  // The point of the retained slot's type: registering the provider an
  // in-process prover hands over for that era must not need a cast.
  it('accepts a retained-era provider, which declares no lookupKey', () => {
    expectTypeOf(
      createProofProviderForEras({
        currentEra: currentEraProvingProvider,
        retainedEras: { v8: retainedEraProvingProvider }
      })
    ).toExtend<ProofProvider>();
  });

  // The asymmetry is worth pinning because it is the half the types DO catch:
  // the current era's shape is a superset, so only this direction is an error.
  // The reverse -- a current-era provider in the retained slot -- type-checks,
  // which is why the pairing is documented rather than enforced.
  it('refuses a retained-era provider for the current era', () => {
    createProofProviderForEras({
      // @ts-expect-error the current era's ProvingProvider also declares
      // lookupKey, which the retained era's shape does not.
      currentEra: retainedEraProvingProvider
    });
  });

  it('refuses a retained slot keyed by the current era', () => {
    createProofProviderForEras({
      currentEra: currentEraProvingProvider,
      // @ts-expect-error the current era crosses the seam as a live ledger
      // object, so it is not registrable as a retained era.
      retainedEras: { v9: retainedEraProvingProvider }
    });
  });
});
