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

import { LEDGER_STATE_TAGS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { InvalidSerializedStateError, type PublicStatesRead, SerializedState } from '@midnight-ntwrk/midnight-js-types';
import type * as MidnightJsUtils from '@midnight-ntwrk/midnight-js-utils';
import { UnrecognisedEraTagError } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Ledger8ContractStateUnsupportedError, PublicStatesEraMismatchError } from '../errors';
import { decodeLedger9PublicStates } from '../internal/era';
import { createMockContractAddress, publicStatesReadStub } from './test-mocks';

const decode = vi.hoisted(() => ({
  deserializeCompactContractState: vi.fn(),
  deserializeZswapChainState: vi.fn(),
  deserializeLedgerParameters: vi.fn()
}));

vi.mock('@midnight-ntwrk/midnight-js-utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MidnightJsUtils>()),
  ...decode
}));

const contractAddress = createMockContractAddress();
const CALLER = { caller: '@midnight-ntwrk/midnight-js-contracts:createUnprovenCallTx' };

const tagged = (era: LedgerVersion, kind: keyof typeof LEDGER_STATE_TAGS, body: string): Uint8Array =>
  new TextEncoder().encode(`${LEDGER_STATE_TAGS[kind][era]}:${body}`);

const ledger9Read = (): PublicStatesRead => ({
  protocolVersion: 2_000_000,
  contractState: SerializedState.fromBytes('v9', 'ContractState', tagged('v9', 'ContractState', 'state')),
  ledgerParameters: SerializedState.fromBytes('v9', 'LedgerParameters', tagged('v9', 'LedgerParameters', 'parameters')),
  zswapChainState: SerializedState.fromBytes('v9', 'ZswapChainState', tagged('v9', 'ZswapChainState', 'zswap'))
});

const rejectionOf = (act: () => unknown): unknown => {
  try {
    act();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the call to throw');
};

// What a SerializedState made by a second installed copy of the types package looks like to this copy:
// the same fields and methods, without this copy's private field.
const fromAnotherTypesCopy = <K extends keyof typeof LEDGER_STATE_TAGS>(state: SerializedState<K>) => ({
  era: state.era,
  kind: state.kind,
  serialize: () => state.serialize(),
  deserialize: () => {
    throw new Error('not called: the state is rebuilt from its bytes first');
  }
});

describe('decodeLedger9PublicStates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decode.deserializeCompactContractState.mockReturnValue('contract state');
    decode.deserializeLedgerParameters.mockReturnValue('ledger parameters');
    decode.deserializeZswapChainState.mockReturnValue('zswap chain state');
  });

  it('decodes each state from its own bytes and names the operation as the caller', () => {
    const read = ledger9Read();

    const states = decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx');

    expect(states).toEqual({
      contractState: 'contract state',
      ledgerParameters: 'ledger parameters',
      zswapChainState: 'zswap chain state'
    });
    expect(decode.deserializeCompactContractState).toHaveBeenCalledWith(read.contractState.serialize(), CALLER);
    expect(decode.deserializeLedgerParameters).toHaveBeenCalledWith(read.ledgerParameters.serialize(), CALLER);
    expect(decode.deserializeZswapChainState).toHaveBeenCalledWith(read.zswapChainState.serialize(), CALLER);
  });

  it('refuses a contract state written by the v8 ledger', () => {
    const error = rejectionOf(() => decodeLedger9PublicStates(publicStatesReadStub('v8'), contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(Ledger8ContractStateUnsupportedError);
  });

  it('refuses a record whose contract state is not a SerializedState, the shape of a pre-5.0.0 provider', () => {
    const preFiveRecord = { ...ledger9Read(), contractState: { version: 'v9', state: new Uint8Array() } };

    // @ts-expect-error the contract state is the shape a pre-5.0.0 provider served
    const error = rejectionOf(() => decodeLedger9PublicStates(preFiveRecord, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(UnrecognisedEraTagError);
  });

  it.each(['ledgerParameters', 'zswapChainState'] as const)(
    'refuses %s written by another era than the contract state, before decoding anything',
    (field) => {
      const ledger8Field = {
        ledgerParameters: SerializedState.fromBytes('v8', 'LedgerParameters', tagged('v8', 'LedgerParameters', 'parameters')),
        zswapChainState: SerializedState.fromBytes('v8', 'ZswapChainState', tagged('v8', 'ZswapChainState', 'zswap'))
      }[field];
      const read = { ...ledger9Read(), [field]: ledger8Field };

      const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

      expect(error).toBeInstanceOf(PublicStatesEraMismatchError);
      expect(error).toMatchObject({
        code: 'MIDNIGHT_JS_C_PUBLIC_STATES_ERA_MISMATCH',
        contractAddress,
        field,
        expected: 'v9',
        received: 'v8'
      });
      expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
    }
  );

  it('refuses a record served without its ledger parameters', () => {
    const { ledgerParameters: _omitted, ...withoutParameters } = ledger9Read();

    // @ts-expect-error a provider written in JavaScript can still leave the parameters out
    const error = rejectionOf(() => decodeLedger9PublicStates(withoutParameters, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(PublicStatesEraMismatchError);
    expect(error).toHaveProperty('received', undefined);
    expect(error).toMatchObject({ field: 'ledgerParameters' });
    expect(String(error)).toContain('ledgerParameters');
  });

  it('refuses a record served without its zswap chain state', () => {
    const { zswapChainState: _omitted, ...withoutZswap } = ledger9Read();

    // @ts-expect-error a provider written in JavaScript can still leave the zswap chain state out
    const error = rejectionOf(() => decodeLedger9PublicStates(withoutZswap, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(PublicStatesEraMismatchError);
    expect(error).toHaveProperty('received', undefined);
    expect(error).toMatchObject({ field: 'zswapChainState' });
    expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
  });

  it('decodes states made by a second installed copy of the types package, rebuilt from their bytes', () => {
    const own = ledger9Read();
    const read = {
      protocolVersion: own.protocolVersion,
      contractState: fromAnotherTypesCopy(own.contractState),
      ledgerParameters: fromAnotherTypesCopy(own.ledgerParameters),
      zswapChainState: fromAnotherTypesCopy(own.zswapChainState)
    };

    // @ts-expect-error the states are SerializedStates of another copy of the types package
    const states = decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx');

    expect(states).toEqual({
      contractState: 'contract state',
      ledgerParameters: 'ledger parameters',
      zswapChainState: 'zswap chain state'
    });
    expect(decode.deserializeCompactContractState).toHaveBeenCalledWith(own.contractState.serialize(), CALLER);
  });

  it('refuses a state from another copy of the types package whose bytes do not carry the tag of its era', () => {
    const read = {
      ...ledger9Read(),
      contractState: { era: 'v9', kind: 'ContractState', serialize: () => tagged('v8', 'ContractState', 'state') }
    };

    // @ts-expect-error the contract state is a look-alike of another copy of the types package
    const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({ kind: 'ContractState', era: 'v9', reason: 'tag-mismatch' });
    expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
  });

  it('refuses a state of another kind in the contract-state field by its tag', () => {
    const own = ledger9Read();
    const read = { ...own, contractState: fromAnotherTypesCopy(own.ledgerParameters) };

    // @ts-expect-error the contract-state field holds ledger parameters
    const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({ kind: 'ContractState', era: 'v9', reason: 'tag-mismatch' });
    expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
  });

  it('refuses a contract state of another kind in the ledger-parameters field by its tag', () => {
    const own = ledger9Read();
    const read = { ...own, ledgerParameters: own.contractState };

    // @ts-expect-error the ledger-parameters field holds a contract state
    const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({ kind: 'LedgerParameters', era: 'v9', reason: 'tag-mismatch' });
    expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
  });

  it.each(['ledgerParameters', 'zswapChainState'] as const)(
    'refuses %s served in a shape that is not a SerializedState as unrecognised, not as missing',
    (field) => {
      const read = { ...ledger9Read(), [field]: { version: 'v9', state: new Uint8Array() } };

      const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

      expect(error).toBeInstanceOf(UnrecognisedEraTagError);
      expect(error).toMatchObject({ context: 'createUnprovenCallTx', received: 'undefined' });
      expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
    }
  );

  it('refuses a look-alike state that names an era this build does not know', () => {
    const own = ledger9Read();
    const read = { ...own, contractState: { ...fromAnotherTypesCopy(own.contractState), era: 'v10' } };

    // @ts-expect-error the contract state names an era newer than this build
    const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(UnrecognisedEraTagError);
    expect(error).toMatchObject({ received: 'v10' });
    expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
  });

  it('refuses a look-alike state whose serialize does not return bytes', () => {
    const own = ledger9Read();
    const read = { ...own, contractState: { ...fromAnotherTypesCopy(own.contractState), serialize: () => 'not bytes' } };

    // @ts-expect-error the contract state serializes to a string
    const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(InvalidSerializedStateError);
    expect(error).toMatchObject({ kind: 'ContractState', era: 'v9', reason: 'not-bytes' });
    expect(decode.deserializeCompactContractState).not.toHaveBeenCalled();
  });
});
