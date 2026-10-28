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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import * as ledger9 from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { LEDGER_STATE_KINDS, LEDGER_VERSIONS, type LedgerStateKind, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { InvalidLedgerStateError, LedgerStateDecoderMissingError, PROVIDER_ERROR_CODES } from '../errors';
import { LedgerState } from '../ledger-state';

type Runtime = {
  readonly ContractState: new () => { serialize(): Uint8Array };
  readonly LedgerParameters: { initialParameters(): { serialize(): Uint8Array } };
  readonly ZswapChainState: new () => { serialize(): Uint8Array };
};

const mint: Readonly<Record<LedgerStateKind, (runtime: Runtime) => Uint8Array>> = {
  ContractState: (runtime) => new runtime.ContractState().serialize(),
  LedgerParameters: (runtime) => runtime.LedgerParameters.initialParameters().serialize(),
  ZswapChainState: (runtime) => new runtime.ZswapChainState().serialize()
};

const bytesOf = {} as Record<LedgerStateKind, Record<LedgerVersion, Uint8Array>>;

beforeAll(async () => {
  const runtimes: Record<LedgerVersion, Runtime> = { v8: await loadLedger8Protocol(), v9: ledger9 };
  for (const kind of LEDGER_STATE_KINDS) {
    bytesOf[kind] = { v8: mint[kind](runtimes.v8), v9: mint[kind](runtimes.v9) };
  }
});

const everyKindAndEra = LEDGER_STATE_KINDS.flatMap((kind) => LEDGER_VERSIONS.map((era) => [kind, era] as const));

const thrownBy = (act: () => unknown): unknown => {
  try {
    act();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the call to throw');
};

describe('LedgerState.fromBytes', () => {
  it.each(everyKindAndEra)('carries a %s written by the %s runtime', (kind, era) => {
    const state = LedgerState.fromBytes(kind, era, bytesOf[kind][era]);

    expect(state.kind).toBe(kind);
    expect(state.version).toBe(era);
    expect(state.serialize()).toEqual(bytesOf[kind][era]);
  });

  it('refuses a contract state whose tag belongs to another era', () => {
    const error = thrownBy(() => LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v8));

    expect(error).toBeInstanceOf(InvalidLedgerStateError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_LEDGER_STATE,
      kind: 'ContractState',
      version: 'v9',
      reason: 'tag-mismatch'
    });
  });

  it('refuses ledger parameters whose tag belongs to another era', () => {
    const error = thrownBy(() => LedgerState.fromBytes('LedgerParameters', 'v8', bytesOf.LedgerParameters.v9));

    expect(error).toMatchObject({ kind: 'LedgerParameters', version: 'v8', reason: 'tag-mismatch' });
  });

  it('refuses bytes of another kind', () => {
    const error = thrownBy(() => LedgerState.fromBytes('ContractState', 'v9', bytesOf.LedgerParameters.v9));

    expect(error).toMatchObject({ kind: 'ContractState', reason: 'tag-mismatch' });
  });

  it('refuses bytes shorter than the tag', () => {
    const error = thrownBy(() => LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9.subarray(0, 10)));

    expect(error).toMatchObject({ reason: 'tag-mismatch' });
  });

  it('refuses an unknown kind', () => {
    // @ts-expect-error the kind is outside LedgerStateKind
    const error = thrownBy(() => LedgerState.fromBytes('Transaction', 'v9', bytesOf.ContractState.v9));

    expect(error).toBeInstanceOf(InvalidLedgerStateError);
    expect(error).toMatchObject({ reason: 'unknown-kind' });
  });

  it('refuses a value that is not a Uint8Array', () => {
    // @ts-expect-error the bytes are a string
    const error = thrownBy(() => LedgerState.fromBytes('ContractState', 'v9', 'midnight:contract-state[v8]:'));

    expect(error).toMatchObject({ reason: 'not-bytes' });
  });

  it('refuses an unknown ledger version', () => {
    // @ts-expect-error the version is outside LedgerVersion
    const error = thrownBy(() => LedgerState.fromBytes('ContractState', 'v10', bytesOf.ContractState.v9));

    expect(error).toBeInstanceOf(UnknownLedgerVersionError);
  });

  it('keeps its own copy of the bytes', () => {
    const bytes = bytesOf.ContractState.v9.slice();
    const state = LedgerState.fromBytes('ContractState', 'v9', bytes);

    bytes.fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('hands out a fresh copy on every serialize', () => {
    const state = LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9);

    state.serialize().fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9))).toBe(true);
  });
});

describe('LedgerState.deserialize', () => {
  it('decodes with the decoder of its own era only', () => {
    const v8 = { deserialize: vi.fn(() => 'from v8') };
    const v9 = { deserialize: vi.fn(() => 'from v9') };
    const state = LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9);

    const decoded = state.deserialize({ v8, v9 });

    expect(decoded).toBe('from v9');
    expect(v9.deserialize).toHaveBeenCalledWith(bytesOf.ContractState.v9);
    expect(v8.deserialize).not.toHaveBeenCalled();
  });

  it('gives an object of the runtime the caller passed', () => {
    const state = LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9);

    expect(state.deserialize({ v9: ledger9.ContractState })).toBeInstanceOf(ledger9.ContractState);
  });

  it('decodes zswap bytes with either era, because both write the same format', async () => {
    const ledger8 = await loadLedger8Protocol();
    const state = LedgerState.fromBytes('ZswapChainState', 'v8', bytesOf.ZswapChainState.v9);

    expect(state.deserialize({ v8: ledger8.ZswapChainState })).toBeInstanceOf(ledger8.ZswapChainState);
  });

  it.each([
    ['ContractState', 'v9', '@midnight-ntwrk/compact-runtime'],
    ['ContractState', 'v8', '@midnight-ntwrk/compact-runtime'],
    ['LedgerParameters', 'v9', '@midnightntwrk/ledger-v9'],
    ['LedgerParameters', 'v8', '@midnightntwrk/ledger-v8'],
    ['ZswapChainState', 'v9', '@midnightntwrk/ledger-v9'],
    ['ZswapChainState', 'v8', '@midnightntwrk/ledger-v8']
  ] as const)('refuses a %s of %s with no decoder for its era and names %s', (kind, era, packageName) => {
    const otherEra = era === 'v9' ? 'v8' : 'v9';
    const state = LedgerState.fromBytes(kind, era, bytesOf[kind][era]);

    const error = thrownBy(() => state.deserialize({ [otherEra]: { deserialize: () => 'wrong era' } }));

    expect(error).toBeInstanceOf(LedgerStateDecoderMissingError);
    expect(error).toMatchObject({ code: PROVIDER_ERROR_CODES.LEDGER_STATE_DECODER_MISSING, kind, version: era });
    expect(String(error)).toContain(packageName);
  });

  it('ignores a decoder inherited through the prototype', () => {
    const state = LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9);
    const inherited: { v9?: { deserialize(bytes: Uint8Array): string } } = Object.create({
      v9: { deserialize: () => 'inherited' }
    });

    expect(thrownBy(() => state.deserialize(inherited))).toBeInstanceOf(LedgerStateDecoderMissingError);
  });

  it('refuses a decoder with no deserialize function', () => {
    const state = LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9);

    // @ts-expect-error the decoder has no deserialize
    expect(thrownBy(() => state.deserialize({ v9: {} }))).toBeInstanceOf(LedgerStateDecoderMissingError);
  });

  it('lets the decoder failure through unchanged', () => {
    const failure = new Error('bad body');
    const state = LedgerState.fromBytes('ContractState', 'v9', bytesOf.ContractState.v9);

    const error = thrownBy(() =>
      state.deserialize({
        v9: {
          deserialize: () => {
            throw failure;
          }
        }
      })
    );

    expect(error).toBe(failure);
  });
});
