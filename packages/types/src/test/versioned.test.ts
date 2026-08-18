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

import { assertNever } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expectTypeOf, it } from 'vitest';

import type { FinalizedTxData } from '../midnight-types';
import type { FinalizedTxDataV8, VersionedFinalizedTxData } from '../versioned';

// These are compile-level tests: the property under test is that the file
// type-checks (or, for the `@ts-expect-error` case, that it does NOT
// type-check without the suppressed error). They are verified by running
// vitest's typecheck pass for this package (`vitest --typecheck`), which
// surfaces `tsc` diagnostics against this file as test failures — see
// packages/types/vitest.config.ts. Running these bodies at plain runtime is
// incidental; `expectTypeOf(...)` performs no runtime assertion.

describe('VersionedFinalizedTxData', () => {
  it('narrows exhaustively over every arm of the union via assertNever in the default branch', () => {
    const describeVersion = (data: VersionedFinalizedTxData): string => {
      switch (data.version) {
        case 'v8':
          return `v8:${data.txId}`;
        case 'v9':
          return `v9:${data.txId}`;
        default:
          return assertNever(data, 'describeVersion');
      }
    };

    expectTypeOf(describeVersion).returns.toBeString();
  });

  it('rejects access to the v9-shaped tx field before the discriminant is narrowed', () => {
    const data = {} as VersionedFinalizedTxData;

    // @ts-expect-error `data.tx` on the unnarrowed union is
    // `FinalizedTxDataV8['tx'] | FinalizedTxData['tx']` (a v8 transaction object
    // or a v9 one) — not assignable to the v9-only `FinalizedTxData['tx']` type
    // required here without first narrowing on `data.version`.
    const v9Tx: FinalizedTxData['tx'] = data.tx;

    expectTypeOf(v9Tx).not.toBeAny();
  });

  it('keeps a FinalizedTxData-shaped object (existing fields plus the version discriminant) assignable to FinalizedTxData', () => {
    expectTypeOf<{ version: 'v9' } & Omit<FinalizedTxData, 'version'>>().toMatchTypeOf<FinalizedTxData>();
  });

  it('keeps FinalizedTxData assignable to VersionedFinalizedTxData, as it was before this type existed', () => {
    expectTypeOf<FinalizedTxData>().toMatchTypeOf<VersionedFinalizedTxData>();
  });

  it('keeps FinalizedTxDataV8 assignable to VersionedFinalizedTxData', () => {
    expectTypeOf<FinalizedTxDataV8>().toMatchTypeOf<VersionedFinalizedTxData>();
  });
});
