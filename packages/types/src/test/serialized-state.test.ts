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
import { UnknownLedgerEraError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import * as ledger9 from '@midnight-ntwrk/midnight-js-protocol/v9';
import { LEDGER_ERAS, LEDGER_STATE_KINDS, type LedgerEra, type StateKind } from '@midnight-ntwrk/midnight-js-protocol/version';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  InvalidSerializedStateError,
  PROVIDER_ERROR_CODES,
  SerializedStateDecodeFailedError,
  SerializedStateDecoderMissingError
} from '../errors';
import {
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
  type StateDecoders
} from '../serialized-state';

type Runtime = {
  readonly ContractState: new () => { serialize(): Uint8Array };
  readonly LedgerParameters: { initialParameters(): { serialize(): Uint8Array } };
  readonly ZswapChainState: new () => { serialize(): Uint8Array };
};

const mint: Readonly<Record<StateKind, (runtime: Runtime) => Uint8Array>> = {
  ContractState: (runtime) => new runtime.ContractState().serialize(),
  LedgerParameters: (runtime) => runtime.LedgerParameters.initialParameters().serialize(),
  ZswapChainState: (runtime) => new runtime.ZswapChainState().serialize()
};

const bytesOf = {} as Record<StateKind, Record<LedgerEra, Uint8Array>>;

beforeAll(async () => {
  const runtimes: Record<LedgerEra, Runtime> = { v8: await loadLedger8Protocol(), v9: ledger9 };
  for (const kind of LEDGER_STATE_KINDS) {
    bytesOf[kind] = { v8: mint[kind](runtimes.v8), v9: mint[kind](runtimes.v9) };
  }
});

interface AnySerialized {
  readonly era: LedgerEra;
  serialize(): Uint8Array;
  deserialize(decoders: StateDecoders): unknown;
}

interface StateClass {
  readonly kind: StateKind;
  readonly name: string;
  readonly construct: (args: readonly unknown[]) => unknown;
  readonly fromBytes: (era: LedgerEra, bytes: Uint8Array) => AnySerialized;
  readonly is: (value: unknown) => boolean;
}

const classes: readonly StateClass[] = [
  {
    kind: 'ContractState',
    name: 'SerializedContractState',
    construct: (args) => Reflect.construct(SerializedContractState, args),
    fromBytes: (era, bytes) => SerializedContractState.fromBytes(era, bytes),
    is: (value) => SerializedContractState.isSerializedContractState(value)
  },
  {
    kind: 'LedgerParameters',
    name: 'SerializedLedgerParameters',
    construct: (args) => Reflect.construct(SerializedLedgerParameters, args),
    fromBytes: (era, bytes) => SerializedLedgerParameters.fromBytes(era, bytes),
    is: (value) => SerializedLedgerParameters.isSerializedLedgerParameters(value)
  },
  {
    kind: 'ZswapChainState',
    name: 'SerializedZswapChainState',
    construct: (args) => Reflect.construct(SerializedZswapChainState, args),
    fromBytes: (era, bytes) => SerializedZswapChainState.fromBytes(era, bytes),
    is: (value) => SerializedZswapChainState.isSerializedZswapChainState(value)
  }
];

const everyClassAndEra = classes.flatMap((cls) => LEDGER_ERAS.map((era) => [cls.name, era, cls] as const));
const everyClass = classes.map((cls) => [cls.name, cls] as const);

const thrownBy = (act: () => unknown): unknown => {
  try {
    act();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the call to throw');
};

describe('fromBytes', () => {
  it.each(everyClassAndEra)('%s carries the bytes the %s runtime wrote', (_, era, cls) => {
    const state = cls.fromBytes(era, bytesOf[cls.kind][era]);

    expect(state.era).toBe(era);
    expect(state.serialize()).toEqual(bytesOf[cls.kind][era]);
  });

  it.each(everyClass)('%s has no public kind', (_, cls) => {
    expect(Object.keys(cls.fromBytes('v9', bytesOf[cls.kind].v9))).toEqual(['era']);
  });

  const datedByTag = classes
    .filter((cls) => cls.kind !== 'ZswapChainState')
    .flatMap((cls) => LEDGER_ERAS.map((era) => [cls.name, era, era === 'v9' ? 'v8' : 'v9', cls] as const));

  it.each(datedByTag)('%s refuses bytes claimed as %s whose tag belongs to %s', (_, era, otherEra, cls) => {
    const error = thrownBy(() => cls.fromBytes(era, bytesOf[cls.kind][otherEra]));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_LEDGER_STATE,
      kind: cls.kind,
      era,
      reason: 'tag-mismatch'
    });
  });

  it.each(LEDGER_ERAS)('carries zswap bytes of either era as %s, because both write the same tag', (era) => {
    for (const writer of LEDGER_ERAS) {
      expect(SerializedZswapChainState.fromBytes(era, bytesOf.ZswapChainState[writer]).era).toBe(era);
    }
  });

  const otherKinds = classes.flatMap((cls) =>
    LEDGER_STATE_KINDS.filter((kind) => kind !== cls.kind).map((kind) => [cls.name, kind, cls] as const)
  );

  it.each(otherKinds)('%s refuses the bytes of a %s', (_, kind, cls) => {
    const error = thrownBy(() => cls.fromBytes('v9', bytesOf[kind].v9));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({ kind: cls.kind, era: 'v9', reason: 'tag-mismatch' });
  });

  it('refuses bytes shorter than the tag', () => {
    const error = thrownBy(() => SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9.subarray(0, 10)));

    expect(error).toMatchObject({ reason: 'tag-mismatch' });
  });

  it.each(everyClass)('%s refuses a value that is not a Uint8Array', (name, cls) => {
    const notBytes: unknown = 'midnight:contract-state[v8]:';
    const error = thrownBy(() => Reflect.apply(cls.fromBytes, undefined, ['v9', notBytes]));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_LEDGER_STATE,
      kind: cls.kind,
      reason: 'not-bytes',
      message: `Cannot build a ${name}: the value is not a Uint8Array.`
    });
  });

  it.each(everyClass)('%s refuses an unknown ledger era', (_, cls) => {
    const unknownEra: unknown = 'v10';
    const error = thrownBy(() => Reflect.apply(cls.fromBytes, undefined, [unknownEra, bytesOf[cls.kind].v9]));

    expect(error).toBeInstanceOf(UnknownLedgerEraError);
  });

  it('keeps its own copy of the bytes', () => {
    const bytes = bytesOf.ContractState.v9.slice();
    const state = SerializedContractState.fromBytes('v9', bytes);

    bytes.fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('hands out a fresh copy on every serialize', () => {
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

    state.serialize().fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('keeps its own copy of bytes passed as a Buffer', () => {
    const buffer = Buffer.from(bytesOf.ContractState.v9);
    const state = SerializedContractState.fromBytes('v9', buffer);

    buffer.fill(0);

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('copies only the viewed bytes of a Buffer that starts inside a larger allocation', () => {
    const backing = Buffer.alloc(bytesOf.ContractState.v9.length + 8, 0xff);
    backing.set(bytesOf.ContractState.v9, 8);
    const view = backing.subarray(8);

    const state = SerializedContractState.fromBytes('v9', view);
    backing.fill(0);

    expect(view.byteOffset).toBe(backing.byteOffset + 8);
    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it.each(everyClass)('%s is frozen', (_, cls) => {
    expect(Object.isFrozen(cls.fromBytes('v9', bytesOf[cls.kind].v9))).toBe(true);
  });

  it.each(everyClass)('%s refuses a value constructed without fromBytes', (name, cls) => {
    const error = thrownBy(() => cls.construct(['v9', bytesOf[cls.kind].v9]));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_LEDGER_STATE,
      kind: cls.kind,
      reason: 'not-from-bytes',
      message: `A ${name} can only be made by ${name}.fromBytes.`
    });
  });
});

describe('the is guards', () => {
  it.each(everyClass)('%s accepts a value of its own class', (_, cls) => {
    expect(cls.is(cls.fromBytes('v9', bytesOf[cls.kind].v9))).toBe(true);
  });

  const otherClasses = classes.flatMap((cls) =>
    classes.filter((other) => other !== cls).map((other) => [cls.name, other.name, cls, other] as const)
  );

  it.each(otherClasses)('%s refuses a %s', (_, __, cls, other) => {
    expect(cls.is(other.fromBytes('v9', bytesOf[other.kind].v9))).toBe(false);
  });

  it.each(everyClass)('%s refuses a look-alike object', (_, cls) => {
    const lookAlike = {
      era: 'v9',
      serialize: () => bytesOf[cls.kind].v9,
      deserialize: () => undefined
    };

    expect(cls.is(lookAlike)).toBe(false);
  });

  it.each([null, undefined, 'midnight:contract-state[v8]:'])('refuses %s', (value) => {
    for (const cls of classes) {
      expect(cls.is(value)).toBe(false);
    }
  });

  it('refuses a value made by a second loaded copy of the module', async () => {
    vi.resetModules();
    const secondCopy = await import('../serialized-state');
    const fromSecondCopy = secondCopy.SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

    expect(secondCopy.SerializedContractState).not.toBe(SerializedContractState);
    expect(secondCopy.SerializedContractState.isSerializedContractState(fromSecondCopy)).toBe(true);
    expect(SerializedContractState.isSerializedContractState(fromSecondCopy)).toBe(false);
  });
});

describe('deserialize', () => {
  it('decodes with the decoder of its own era only', () => {
    const v8 = { deserialize: vi.fn(() => 'from v8') };
    const v9 = { deserialize: vi.fn(() => 'from v9') };
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

    const decoded = state.deserialize({ v8, v9 });

    expect(decoded).toBe('from v9');
    expect(v9.deserialize).toHaveBeenCalledWith(bytesOf.ContractState.v9);
    expect(v8.deserialize).not.toHaveBeenCalled();
  });

  it('gives an object of the runtime the caller passed', () => {
    expect(SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9).deserialize({ v9: ledger9.ContractState })).toBeInstanceOf(
      ledger9.ContractState
    );
    expect(
      SerializedLedgerParameters.fromBytes('v9', bytesOf.LedgerParameters.v9).deserialize({ v9: ledger9.LedgerParameters })
    ).toBeInstanceOf(ledger9.LedgerParameters);
    expect(
      SerializedZswapChainState.fromBytes('v9', bytesOf.ZswapChainState.v9).deserialize({ v9: ledger9.ZswapChainState })
    ).toBeInstanceOf(ledger9.ZswapChainState);
  });

  it('decodes zswap bytes with either era, because both write the same format', async () => {
    const ledger8 = await loadLedger8Protocol();
    const state = SerializedZswapChainState.fromBytes('v8', bytesOf.ZswapChainState.v9);

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
    const cls = classes.find((candidate) => candidate.kind === kind)!;
    const state = cls.fromBytes(era, bytesOf[kind][era]);

    const error = thrownBy(() => state.deserialize({ [otherEra]: { deserialize: () => 'wrong era' } }));

    expect(error).toBeInstanceOf(SerializedStateDecoderMissingError);
    expect(error).toMatchObject({ code: PROVIDER_ERROR_CODES.LEDGER_STATE_DECODER_MISSING, kind, era });
    expect(String(error)).toContain(packageName);
  });

  it('ignores a decoder inherited through the prototype', () => {
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);
    const inherited: { v9?: { deserialize(bytes: Uint8Array): string } } = Object.create({
      v9: { deserialize: () => 'inherited' }
    });

    expect(thrownBy(() => state.deserialize(inherited))).toBeInstanceOf(SerializedStateDecoderMissingError);
  });

  it('refuses a decoder with no deserialize function', () => {
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

    // @ts-expect-error the decoder has no deserialize
    expect(thrownBy(() => state.deserialize({ v9: {} }))).toBeInstanceOf(SerializedStateDecoderMissingError);
  });

  it.each([undefined, null])('refuses %s in place of the decoders', (decoders) => {
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

    // @ts-expect-error the decoders are missing
    const error = thrownBy(() => state.deserialize(decoders));

    expect(error).toBeInstanceOf(SerializedStateDecoderMissingError);
    expect(error).toMatchObject({ kind: 'ContractState', era: 'v9' });
  });

  it('reports a decoder failure as a coded error that keeps the failure as its cause', () => {
    const failure = new Error('bad body');
    const state = SerializedLedgerParameters.fromBytes('v9', bytesOf.LedgerParameters.v9);

    const error = thrownBy(() =>
      state.deserialize({
        v9: {
          deserialize: () => {
            throw failure;
          }
        }
      })
    );

    expect(error).toBeInstanceOf(SerializedStateDecodeFailedError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.LEDGER_STATE_DECODE_FAILED,
      category: 'INTEGRITY',
      kind: 'LedgerParameters',
      era: 'v9',
      cause: failure
    });
  });

  it('rethrows a coded error from the decoder unchanged', () => {
    const coded = new UnknownLedgerEraError('v10');
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

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
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

    state.deserialize({ v9: { deserialize: (bytes: Uint8Array) => bytes.fill(0) } });

    expect(state.serialize()).toEqual(bytesOf.ContractState.v9);
  });

  it('reports the decoder of another kind as a decode failure', () => {
    const state = SerializedContractState.fromBytes('v9', bytesOf.ContractState.v9);

    const error = thrownBy(() => state.deserialize({ v9: ledger9.LedgerParameters }));

    expect(error).toBeInstanceOf(SerializedStateDecodeFailedError);
    expect(error).toMatchObject({ kind: 'ContractState', era: 'v9' });
  });
});
