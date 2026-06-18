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

/**
 * Integration tests against real WASM bindings.
 *
 * Acts as a CANARY: if `@midnight-ntwrk/ledger` or any underlying source
 * library changes error message strings (e.g. on a major bump), one or more
 * tests fail loudly and force a refresh of `patterns.ts` (spec §7.1).
 *
 * Test strategy: craft bad inputs deterministically rather than via
 * serialize-then-mutate (which would require building real ledger objects).
 * For each scenario we either feed garbage bytes or build a Uint8Array that
 * contains exactly the header tag bytes we want, then assert the classifier
 * produces the expected `classification` / `direction` / `dataType`.
 */

import { describe, expect, it } from 'vitest';

import { isDeserializationError } from '../deserialization';
import {
  decodeLedgerStateValue,
  deserializeCompactContractState,
  deserializeContractState,
  deserializeLedgerParameters,
  deserializeLedgerTransaction,
  deserializeZswapChainState
} from '../deserialization/typed-wrappers';

const caller = '@midnight-ntwrk/midnight-js-test:classify-integration';

const headerBytes = (tag: string): Uint8Array => new TextEncoder().encode(tag);

/** Helper: catch a thrown DeserializationError from a typed wrapper invocation. */
const catchDeserError = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (isDeserializationError(e)) return e;
    throw new Error(`Expected DeserializationError, got: ${String(e)}`, { cause: e });
  }
  throw new Error('Expected DeserializationError to be thrown, but fn() returned normally');
};

describe('integration: ledger source — Pattern #1 (tag mismatch)', () => {
  it('empty buffer → version-mismatch, direction undefined (got is empty, secondary fails)', () => {
    const err = catchDeserError(() => deserializeContractState(new Uint8Array(0), { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    expect(err.context.direction).toBeUndefined();
    expect(err.context.source).toBe('ledger');
    // expected version is structural ContractState [v8] in current ledger-v9
    expect(err.context.extracted?.expectedVersion).toBe(8);
    expect(err.context.extracted?.receivedVersion).toBeUndefined();
  });

  it('garbage bytes → version-mismatch, direction undefined (got is gibberish, secondary fails)', () => {
    const garbage = new Uint8Array([0xab, 0xcd, 0xef, 0x01, 0x02, 0x03, 0x04, 0x05]);

    const err = catchDeserError(() => deserializeContractState(garbage, { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    expect(err.context.direction).toBeUndefined();
  });

  it('header tag with older version → version-mismatch + data-older-than-code', () => {
    // ContractState currently expects [v8]. We feed [v5].
    const oldTag = headerBytes('midnight:contract-state[v5]:');

    const err = catchDeserError(() => deserializeContractState(oldTag, { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    expect(err.context.direction).toBe('data-older-than-code');
    expect(err.context.extracted?.expectedVersion).toBe(8);
    expect(err.context.extracted?.receivedVersion).toBe(5);
  });

  it('header tag with newer version → version-mismatch + data-newer-than-code', () => {
    // ContractState currently expects [v8]. We feed [v9].
    const newTag = headerBytes('midnight:contract-state[v9]:');

    const err = catchDeserError(() => deserializeContractState(newTag, { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    expect(err.context.direction).toBe('data-newer-than-code');
    expect(err.context.extracted?.expectedVersion).toBe(8);
    expect(err.context.extracted?.receivedVersion).toBe(9);
  });

  it('cross-type bytes (zswap header fed to ContractState) → version-mismatch', () => {
    const crossTypeTag = headerBytes('midnight:zswap-ledger-state[v5]:');

    const err = catchDeserError(() => deserializeContractState(crossTypeTag, { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    // direction may or may not be inferable — accept either undefined or set
  });

  it('extracted.dataType is populated from the WASM error prefix (D9 override)', () => {
    const oldTag = headerBytes('midnight:contract-state[v5]:');

    const err = catchDeserError(() => deserializeContractState(oldTag, { caller }));

    expect(err.context.extracted?.dataType).toBe('ContractState');
    // dataType in the final context matches extracted (which equals the WASM class name)
    expect(err.context.dataType).toBe('ContractState');
  });
});

describe('integration: ledger source — ZswapChainState', () => {
  it('empty buffer → version-mismatch with ZswapChainState dataType', () => {
    const err = catchDeserError(() => deserializeZswapChainState(new Uint8Array(0), { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    expect(err.context.source).toBe('ledger');
    // The WASM class is named ZswapChainState — regex `what` matches
    expect(err.context.dataType).toBe('ZswapChainState');
  });

  it('older version → data-older-than-code', () => {
    // ZswapChainState currently expects [v5]
    const oldTag = headerBytes('midnight:zswap-ledger-state[v4]:');

    const err = catchDeserError(() => deserializeZswapChainState(oldTag, { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    expect(err.context.direction).toBe('data-older-than-code');
  });

  it('newer version → data-newer-than-code', () => {
    const newTag = headerBytes('midnight:zswap-ledger-state[v6]:');

    const err = catchDeserError(() => deserializeZswapChainState(newTag, { caller }));

    expect(err.context.classification).toBe('version-mismatch');
    expect(err.context.direction).toBe('data-newer-than-code');
  });
});

describe('integration: ledger source — LedgerTransaction', () => {
  it('garbage bytes → DeserializationError thrown', () => {
    const err = catchDeserError(() => deserializeLedgerTransaction(new Uint8Array([0]), { caller }));

    expect(err.context.source).toBe('ledger');
    // dataType pulled from WASM-reported class name 'Transaction' (per D9 override)
    expect(err.context.dataType).toBe('Transaction');
  });
});

describe('integration: ledger source — LedgerParameters smoke', () => {
  it('garbage bytes → DeserializationError with LedgerParameters dataType', () => {
    const err = catchDeserError(() => deserializeLedgerParameters(new Uint8Array([0, 0]), { caller }));

    expect(err.context.source).toBe('ledger');
    expect(err.context.dataType).toBe('LedgerParameters');
  });
});

describe('integration: compact-runtime source', () => {
  it('garbage bytes → DeserializationError with source=compact-runtime', () => {
    const err = catchDeserError(() => deserializeCompactContractState(new Uint8Array([0]), { caller }));

    expect(err.context.source).toBe('compact-runtime');
  });
});

describe('integration: onchain-runtime source — StateValue', () => {
  it('malformed EncodedStateValue → DeserializationError with source=onchain-runtime', () => {
    const malformed = { tag: 'not-a-real-tag' } as unknown as Parameters<typeof decodeLedgerStateValue>[0];

    const err = catchDeserError(() => decodeLedgerStateValue(malformed, { caller }));

    expect(err.context.source).toBe('onchain-runtime');
  });
});

describe('integration: mitigation hints rendered (D12 — keyed on classification × source)', () => {
  it('version-mismatch error references the structural tag and underlying packages', () => {
    const err = catchDeserError(() =>
      deserializeContractState(headerBytes('midnight:contract-state[v5]:'), { caller })
    );

    const joined = err.context.mitigation.join('\n');
    expect(joined).toMatch(/structural (version )?tag/i);
    expect(joined).toMatch(/@midnight-ntwrk\/ledger/);
    expect(joined).not.toContain('midnight-js-protocol');
  });
});
