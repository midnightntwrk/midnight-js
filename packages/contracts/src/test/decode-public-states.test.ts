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
import { LedgerState, type PublicStatesRead } from '@midnight-ntwrk/midnight-js-types';
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
  contractState: LedgerState.fromBytes('v9', 'ContractState', tagged('v9', 'ContractState', 'state')),
  ledgerParameters: LedgerState.fromBytes('v9', 'LedgerParameters', tagged('v9', 'LedgerParameters', 'parameters')),
  zswapChainState: LedgerState.fromBytes('v9', 'ZswapChainState', tagged('v9', 'ZswapChainState', 'zswap'))
});

const rejectionOf = (act: () => unknown): unknown => {
  try {
    act();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the call to throw');
};

describe('decodeLedger9PublicStates', () => {
  beforeEach(() => {
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

  it('refuses a record whose contract state is not a LedgerState, the shape of a pre-5.0.0 provider', () => {
    const preFiveRecord = { ...ledger9Read(), contractState: { version: 'v9', state: new Uint8Array() } };

    // @ts-expect-error the contract state is the shape a pre-5.0.0 provider served
    const error = rejectionOf(() => decodeLedger9PublicStates(preFiveRecord, contractAddress, 'createUnprovenCallTx'));

    expect(error).toBeInstanceOf(UnrecognisedEraTagError);
  });

  it.each(['ledgerParameters', 'zswapChainState'] as const)(
    'refuses %s written by another era than the contract state, before decoding anything',
    (field) => {
      const ledger8Field = {
        ledgerParameters: LedgerState.fromBytes('v8', 'LedgerParameters', tagged('v8', 'LedgerParameters', 'parameters')),
        zswapChainState: LedgerState.fromBytes('v8', 'ZswapChainState', tagged('v8', 'ZswapChainState', 'zswap'))
      }[field];
      const read = { ...ledger9Read(), [field]: ledger8Field };

      const error = rejectionOf(() => decodeLedger9PublicStates(read, contractAddress, 'createUnprovenCallTx'));

      expect(error).toBeInstanceOf(PublicStatesEraMismatchError);
      expect(error).toMatchObject({
        code: 'MIDNIGHT_JS_C_PUBLIC_STATES_ERA_MISMATCH',
        contractAddress,
        field,
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
    expect(error).toMatchObject({ field: 'ledgerParameters', received: undefined });
  });
});
