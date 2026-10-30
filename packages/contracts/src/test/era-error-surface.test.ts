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
  ContractNotFoundError,
  EraInvariantViolationError,
  EraMismatchError,
  type EraMismatchReason,
  IndexerInconsistencyError,
  Ledger8NotStoredError,
  LedgerParametersUnservedError,
  NetworkVersionReadFailedError,
  NetworkVersionStateMismatchError,
  PrivateStateNotFoundError,
  VerifierKeyMismatchError,
  ZswapOutputResolutionError
} from '../index';

describe('the era and verification-path errors a caller has to catch are reachable from the barrel', () => {
  it('carries the registered code on an instance built through the barrel export', () => {
    const cases = [
      { error: new EraMismatchError('unrecognised-contract-shape'), code: CONTRACTS_ERROR_CODES.ERA_MISMATCH },
      { error: new NetworkVersionStateMismatchError('v9', 'v8'), code: CONTRACTS_ERROR_CODES.NETWORK_VERSION_STATE_MISMATCH },
      { error: new IndexerInconsistencyError('v9', 'v8'), code: CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY },
      { error: new BlankVerifierKeySlotError('increment'), code: CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT },
      { error: new VerifierKeyMismatchError('increment'), code: CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH },
      { error: new EraInvariantViolationError('submitTx'), code: CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION },
      { error: new NetworkVersionReadFailedError('network version read failed'), code: CONTRACTS_ERROR_CODES.NETWORK_VERSION_READ_FAILED },
      { error: new ZswapOutputResolutionError('unresolved'), code: CONTRACTS_ERROR_CODES.ZSWAP_OUTPUT_UNRESOLVED },
      { error: new LedgerParametersUnservedError('addr'), code: CONTRACTS_ERROR_CODES.LEDGER_PARAMETERS_UNSERVED },
      { error: new ContractNotFoundError('no contract'), code: CONTRACTS_ERROR_CODES.CONTRACT_NOT_FOUND },
      { error: new PrivateStateNotFoundError('no private state'), code: CONTRACTS_ERROR_CODES.PRIVATE_STATE_NOT_FOUND },
      { error: new Ledger8NotStoredError('deploy', 'addr', { tag: 'schnorr', value: '11'.repeat(32) }, 'signing-key', new Error('store down')), code: CONTRACTS_ERROR_CODES.LEDGER8_NOT_STORED }
    ];

    // Both directions: the code the class registers, and that the class is the one `instanceof`
    // finds. A barrel that re-exported a same-named stub would pass the first and fail the second.
    for (const { error, code } of cases) {
      expect(hasErrorCode(error, code)).toBe(true);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('lets a consumer branch on the mismatch reason using the exported discriminant type', () => {
    // The capability `EraMismatchError`'s own docstring promises: `reason` is "the
    // discriminant a caller branches on". Branching needs the TYPE exported too, not just the class
    // -- without it a consumer is reduced to comparing `error.name` strings.
    // A `Record` keyed by the union rather than a `switch`: total by construction, so a reason
    // added upstream without a branch here is a compile error rather than a fall-through.
    const REMEDIATION: Readonly<Record<EraMismatchReason, string>> = {
      'unwrapped-ledger9-contract': 'wrap-it',
      'unrecognised-contract-shape': 'recompile',
      'ledger9-artifact-on-ledger8-network': 'wait-for-fork',
      'ledger9-transaction-on-ledger8-network': 'submit-v8-bytes',
      'ledger8-transaction-on-ledger9-network': 'recompose-on-v9',
      'artifact-era-undeclared': 'serve-contract-info',
      'provider-cannot-declare-era': 'implement-the-member',
      'unknown-artifact-runtime-version': 'upgrade-midnight-js',
      'ledger8-deploy-on-ledger9-network': 'recompile-and-deploy',
      'ledger8-maintenance-on-ledger9-network': 'recompile-and-maintain',
      'ledger8-artifact-on-ledger9-contract': 'pass-ledger9-artifacts',
      'ledger8-contract-state-unsupported': 'upgrade-indexer',
      'scope-on-ledger8-network': 'submit-each-call',
      'ledger8-call-in-scope': 'call-outside-scope',
      'ledger8-contract-unsupported': 'use-an-era-routing-function',
      'unrecognised-result-era': 'carry-the-era'
    };

    expect(REMEDIATION[new EraMismatchError('unwrapped-ledger9-contract').reason]).toBe('wrap-it');
    expect(REMEDIATION[new EraMismatchError('unrecognised-contract-shape').reason]).toBe('recompile');
    expect(REMEDIATION[new EraMismatchError('ledger9-artifact-on-ledger8-network').reason]).toBe('wait-for-fork');
    expect(REMEDIATION[new EraMismatchError('ledger9-transaction-on-ledger8-network').reason]).toBe(
      'submit-v8-bytes'
    );
    expect(REMEDIATION[new EraMismatchError('ledger8-transaction-on-ledger9-network').reason]).toBe(
      'recompose-on-v9'
    );
    expect(REMEDIATION[new EraMismatchError('artifact-era-undeclared').reason]).toBe('serve-contract-info');
    expect(REMEDIATION[new EraMismatchError('provider-cannot-declare-era').reason]).toBe(
      'implement-the-member'
    );
    expect(REMEDIATION[new EraMismatchError('unknown-artifact-runtime-version').reason]).toBe(
      'upgrade-midnight-js'
    );
    expect(REMEDIATION[new EraMismatchError('ledger8-call-in-scope', { detail: 'Circuit: increment.' }).reason]).toBe(
      'call-outside-scope'
    );
  });

  it('retains the two eras on a head/state disagreement, so a caller can report which pair failed', () => {
    const head: LedgerVersion = 'v9';
    const stateEra: LedgerVersion = 'v8';

    const mismatch = new NetworkVersionStateMismatchError(head, stateEra);
    const inconsistency = new IndexerInconsistencyError(head, stateEra);

    // Asserted on BOTH classes and in a fixed order: both constructors take two same-typed
    // `LedgerVersion` parameters, so a swapped pair type-checks and would name the eras backwards.
    expect([mismatch.networkVersion, mismatch.stateEra]).toEqual<LedgerVersion[]>(['v9', 'v8']);
    expect([inconsistency.networkVersion, inconsistency.stateEra]).toEqual<LedgerVersion[]>(['v9', 'v8']);
  });

  it('names the refused entry point on both verifier-key failures', () => {
    expect(new BlankVerifierKeySlotError('increment').circuitId).toBe('increment');
    expect(new VerifierKeyMismatchError('increment').circuitId).toBe('increment');
  });
});
