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

import {
  InvalidLedgerStateError,
  LedgerStateDecodeFailedError,
  LedgerStateDecoderMissingError,
  PROVIDER_ERROR_CODES
} from '../errors';
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
    const state = LedgerState.fromBytes(era, kind, bytesOf[kind][era]);

    expect(state.kind).toBe(kind);
    expect(state.era).toBe(era);
    expect(state.serialize()).toEqual(bytesOf[kind][era]);
  });

  const datedByTag = LEDGER_STATE_KINDS.filter((kind) => kind !== 'ZswapChainState').flatMap((kind) =>
    LEDGER_VERSIONS.map((era) => [kind, era, era === 'v9' ? 'v8' : 'v9'] as const)
  );

  it.each(datedByTag)('refuses a %s claimed as %s whose tag belongs to %s', (kind, era, otherEra) => {
    const error = thrownBy(() => LedgerState.fromBytes(era, kind, bytesOf[kind][otherEra]));

    expect(error).toBeInstanceOf(InvalidLedgerStateError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_LEDGER_STATE,
      kind,
      era,
      reason: 'tag-mismatch'
    });
  });

  it.each(LEDGER_VERSIONS)('carries zswap bytes of either era as %s, because both write the same tag', (era) => {
    for (const writer of LEDGER_VERSIONS) {
      expect(LedgerState.fromBytes(era, 'ZswapChainState', bytesOf.ZswapChainState[writer]).era).toBe(era);
    }
  });

  it('refuses bytes of another kind', () => {
    const error = thrownBy(() => LedgerState.fromBytes('v9', 'ContractState', bytesOf.LedgerParameters.v9));

    expect(error).toMatchObject({ kind: 'ContractState', reason: 'tag-mismatch' });
  });

  it('refuses bytes shorter than the tag', () => {
    const error = thrownBy(() => LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9.subarray(0, 10)));

    expect(error).toMatchObject({ reason: 'tag-mismatch' });
  });

  it('refuses an unknown kind', () => {
    // @ts-expect-error the kind is outside LedgerStateKind
    const error = thrownBy(() => LedgerState.fromBytes('v9', 'Transaction', bytesOf.ContractState.v9));

    expect(error).toBeInstanceOf(InvalidLedgerStateError);
    expect(error).toMatchObject({ reason: 'unknown-kind' });
  });

  it('refuses a value that is not a Uint8Array', () => {
    // @ts-expect-error the bytes are a string
    const error = thrownBy(() => LedgerState.fromBytes('v9', 'ContractState', 'midnight:contract-state[v8]:'));

    expect(error).toMatchObject({ reason: 'not-bytes' });
  });

  it('refuses an unknown ledger era', () => {
    // @ts-expect-error the era is outside LedgerVersion
    const error = thrownBy(() => LedgerState.fromBytes('v10', 'ContractState', bytesOf.ContractState.v9));

    expect(error).toBeInstanceOf(UnknownLedgerVersionError);
  });

  it('keeps its own copy of the bytes', () => {
    const bytes = bytesOf.ContractState.v9.slice();
    const state = LedgerState.fromBytes('v9', 'ContractState', bytes);

    bytes.fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('hands out a fresh copy on every serialize', () => {
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    state.serialize().fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('keeps its own copy of bytes passed as a Buffer', () => {
    const buffer = Buffer.from(bytesOf.ContractState.v9);
    const state = LedgerState.fromBytes('v9', 'ContractState', buffer);

    buffer.fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('hands out a copy that does not share memory with bytes passed as a Buffer', () => {
    const state = LedgerState.fromBytes('v9', 'ContractState', Buffer.from(bytesOf.ContractState.v9));

    state.serialize().fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('copies only the viewed bytes of a Buffer that starts inside a larger allocation', () => {
    const backing = Buffer.alloc(bytesOf.ContractState.v9.length + 8, 0xff);
    backing.set(bytesOf.ContractState.v9, 8);
    const view = backing.subarray(8);

    const state = LedgerState.fromBytes('v9', 'ContractState', view);
    backing.fill(0);

    expect(view.byteOffset).toBe(backing.byteOffset + 8);
    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9))).toBe(true);
  });

  it('refuses a LedgerState constructed without fromBytes', () => {
    const error = thrownBy(() => Reflect.construct(LedgerState, ['v9', 'ContractState', bytesOf.ContractState.v9]));

    expect(error).toBeInstanceOf(InvalidLedgerStateError);
    expect(error).toMatchObject({ code: PROVIDER_ERROR_CODES.INVALID_LEDGER_STATE, reason: 'not-from-bytes' });
  });
});

describe('LedgerState.isLedgerState', () => {
  it('accepts a value made by fromBytes', () => {
    expect(LedgerState.isLedgerState(LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9))).toBe(true);
  });

  it('refuses a look-alike object', () => {
    const lookAlike = {
      era: 'v9',
      kind: 'ContractState',
      serialize: () => bytesOf.ContractState.v9,
      deserialize: () => undefined
    };

    expect(LedgerState.isLedgerState(lookAlike)).toBe(false);
  });

  it.each([null, undefined, 'midnight:contract-state[v8]:'])('refuses %s', (value) => {
    expect(LedgerState.isLedgerState(value)).toBe(false);
  });

  it('refuses a value made by a second loaded copy of the module', async () => {
    vi.resetModules();
    const secondCopy = await import('../ledger-state');
    const fromSecondCopy = secondCopy.LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    expect(secondCopy.LedgerState).not.toBe(LedgerState);
    expect(secondCopy.LedgerState.isLedgerState(fromSecondCopy)).toBe(true);
    expect(LedgerState.isLedgerState(fromSecondCopy)).toBe(false);
  });
});

describe('LedgerState.deserialize', () => {
  it('decodes with the decoder of its own era only', () => {
    const v8 = { deserialize: vi.fn(() => 'from v8') };
    const v9 = { deserialize: vi.fn(() => 'from v9') };
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    const decoded = state.deserialize({ v8, v9 });

    expect(decoded).toBe('from v9');
    expect(v9.deserialize).toHaveBeenCalledWith(bytesOf.ContractState.v9);
    expect(v8.deserialize).not.toHaveBeenCalled();
  });

  it('gives an object of the runtime the caller passed', () => {
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    expect(state.deserialize({ v9: ledger9.ContractState })).toBeInstanceOf(ledger9.ContractState);
  });

  it('decodes zswap bytes with either era, because both write the same format', async () => {
    const ledger8 = await loadLedger8Protocol();
    const state = LedgerState.fromBytes('v8', 'ZswapChainState', bytesOf.ZswapChainState.v9);

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
    const state = LedgerState.fromBytes(era, kind, bytesOf[kind][era]);

    const error = thrownBy(() =>
      // @ts-expect-error a value of a known era needs a decoder for that era
      state.deserialize({ [otherEra]: { deserialize: () => 'wrong era' } })
    );

    expect(error).toBeInstanceOf(LedgerStateDecoderMissingError);
    expect(error).toMatchObject({ code: PROVIDER_ERROR_CODES.LEDGER_STATE_DECODER_MISSING, kind, era });
    expect(String(error)).toContain(packageName);
  });

  it('ignores a decoder inherited through the prototype', () => {
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);
    const inherited: { v9?: { deserialize(bytes: Uint8Array): string } } = Object.create({
      v9: { deserialize: () => 'inherited' }
    });

    expect(thrownBy(() => state.deserialize(inherited))).toBeInstanceOf(LedgerStateDecoderMissingError);
  });

  it('refuses a decoder with no deserialize function', () => {
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    // @ts-expect-error the decoder has no deserialize
    expect(thrownBy(() => state.deserialize({ v9: {} }))).toBeInstanceOf(LedgerStateDecoderMissingError);
  });

  it.each([undefined, null])('refuses %s in place of the decoders', (decoders) => {
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    // @ts-expect-error the decoders are missing
    const error = thrownBy(() => state.deserialize(decoders));

    expect(error).toBeInstanceOf(LedgerStateDecoderMissingError);
    expect(error).toMatchObject({ kind: 'ContractState', era: 'v9' });
  });

  it('reports a decoder failure as a coded error that keeps the failure as its cause', () => {
    const failure = new Error('bad body');
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    const error = thrownBy(() =>
      state.deserialize({
        v9: {
          deserialize: () => {
            throw failure;
          }
        }
      })
    );

    expect(error).toBeInstanceOf(LedgerStateDecodeFailedError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.LEDGER_STATE_DECODE_FAILED,
      category: 'INTEGRITY',
      kind: 'ContractState',
      era: 'v9',
      cause: failure
    });
  });

  it('rethrows a coded error from the decoder unchanged', () => {
    const coded = new UnknownLedgerVersionError('v10');
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    const error = thrownBy(() =>
      state.deserialize({
        v9: {
          deserialize: () => {
            throw coded;
          }
        }
      })
    );

    expect(error).toBe(coded);
  });

  it('keeps its bytes when the decoder writes into the bytes it was given', () => {
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    state.deserialize({ v9: { deserialize: (bytes: Uint8Array) => bytes.fill(0) } });

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('reports the decoder of another kind as a decode failure', () => {
    const state = LedgerState.fromBytes('v9', 'ContractState', bytesOf.ContractState.v9);

    const error = thrownBy(() => state.deserialize({ v9: ledger9.LedgerParameters }));

    expect(error).toBeInstanceOf(LedgerStateDecodeFailedError);
    expect(error).toMatchObject({ kind: 'ContractState', era: 'v9' });
  });
});
