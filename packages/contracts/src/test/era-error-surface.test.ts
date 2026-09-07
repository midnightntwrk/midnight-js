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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

// Imported from the package BARREL, not from `../errors`: every other suite reaches into the module
// directly, so a class missing from the barrel stays invisible to them. These imports are the
// assertion -- a class dropped from `src/index.ts` fails `yarn typecheck:tests` here.
import {
  BlankVerifierKeySlotError,
  EraArtifactMismatchError,
  type EraArtifactMismatchReason,
  EraInvariantViolationError,
  HeadStateEraMismatchError,
  IndexerInconsistencyError,
  Ledger8DeployOnV9Error,
  VerifierKeyMismatchError
} from '../index';

describe('the era and verification-path errors a caller has to catch are reachable from the barrel', () => {
  it('carries the registered code on an instance built through the barrel export', () => {
    const cases = [
      { error: new EraArtifactMismatchError('unrecognised-contract-shape'), code: CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH },
      { error: new Ledger8DeployOnV9Error(), code: CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9 },
      { error: new HeadStateEraMismatchError('v9', 'v8'), code: CONTRACTS_ERROR_CODES.HEAD_STATE_ERA_MISMATCH },
      { error: new IndexerInconsistencyError('v9', 'v8'), code: CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY },
      { error: new BlankVerifierKeySlotError('increment'), code: CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT },
      { error: new VerifierKeyMismatchError('increment'), code: CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH },
      { error: new EraInvariantViolationError('submitTx'), code: CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION }
    ];

    // Both directions: the code the class registers, and that the class is the one `instanceof`
    // finds. A barrel that re-exported a same-named stub would pass the first and fail the second.
    for (const { error, code } of cases) {
      expect(hasErrorCode(error, code)).toBe(true);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('lets a consumer branch on the mismatch reason using the exported discriminant type', () => {
    // The capability `EraArtifactMismatchError`'s own docstring promises: `reason` is "the
    // discriminant a caller branches on". Branching needs the TYPE exported too, not just the class
    // -- without it a consumer is reduced to comparing `error.name` strings.
    // A `Record` keyed by the union rather than a `switch`: total by construction, so a reason
    // added upstream without a branch here is a compile error rather than a fall-through.
    const REMEDIATION: Readonly<Record<EraArtifactMismatchReason, string>> = {
      'unwrapped-current-era-contract': 'wrap-it',
      'unrecognised-contract-shape': 'recompile',
      'current-era-artifact-on-pre-fork-head': 'wait-for-fork'
    };

    expect(REMEDIATION[new EraArtifactMismatchError('unwrapped-current-era-contract').reason]).toBe('wrap-it');
    expect(REMEDIATION[new EraArtifactMismatchError('unrecognised-contract-shape').reason]).toBe('recompile');
    expect(REMEDIATION[new EraArtifactMismatchError('current-era-artifact-on-pre-fork-head').reason]).toBe('wait-for-fork');
  });

  it('retains the two eras on a head/state disagreement, so a caller can report which pair failed', () => {
    const head: LedgerVersion = 'v9';
    const stateEra: LedgerVersion = 'v8';

    const mismatch = new HeadStateEraMismatchError(head, stateEra);
    const inconsistency = new IndexerInconsistencyError(head, stateEra);

    // Asserted on BOTH classes and in a fixed order: both constructors take two same-typed
    // `LedgerVersion` parameters, so a swapped pair type-checks and would name the eras backwards.
    expect([mismatch.head, mismatch.stateEra]).toEqual<LedgerVersion[]>(['v9', 'v8']);
    expect([inconsistency.head, inconsistency.stateEra]).toEqual<LedgerVersion[]>(['v9', 'v8']);
  });

  it('names the refused entry point on both verifier-key failures', () => {
    expect(new BlankVerifierKeySlotError('increment').circuitId).toBe('increment');
    expect(new VerifierKeyMismatchError('increment').circuitId).toBe('increment');
  });
});
