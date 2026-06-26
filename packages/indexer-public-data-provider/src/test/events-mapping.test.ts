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

import type { ContractEvent } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, test } from 'vitest';

import { IndexerDataError } from '../errors';
import { type ContractEventNode, toContractEvent } from '../events-mapping';

const ADDRESS = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

const base = {
  id: 7,
  maxId: 42,
  version: 1,
  contractAddress: ADDRESS,
  transactionId: 99,
  raw: 'deadbeef'
};

const expectedBase = {
  id: 7,
  maxId: 42,
  version: 1,
  contractAddress: ADDRESS,
  transactionId: 99,
  raw: 'deadbeef'
};

const userAddress = { kind: 'USER' as const, userAddress: 'aabb', contractAddress: null };
const contractAddr = { kind: 'CONTRACT' as const, userAddress: null, contractAddress: 'ccdd' };

describe('toContractEvent - full mapping per variant', () => {
  const cases: { name: string; node: ContractEventNode; expected: ContractEvent }[] = [
    {
      name: 'ShieldedSpendEvent',
      node: { __typename: 'ShieldedSpendEvent', ...base, nullifier: 'n0' },
      expected: { eventType: 'ShieldedSpend', ...expectedBase, nullifier: 'n0' }
    },
    {
      name: 'ShieldedReceiveEvent - all fields present',
      node: {
        __typename: 'ShieldedReceiveEvent',
        ...base,
        commitment: 'c0',
        ciphertext: 'ct0',
        receivingContractAddress: 'rca0'
      },
      expected: {
        eventType: 'ShieldedReceive',
        ...expectedBase,
        commitment: 'c0',
        ciphertext: 'ct0',
        receivingContractAddress: 'rca0'
      }
    },
    {
      name: 'ShieldedMintEvent - amount present',
      node: { __typename: 'ShieldedMintEvent', ...base, commitment: 'c0', domainSep: 'd0', shieldedAmount: '100' },
      expected: { eventType: 'ShieldedMint', ...expectedBase, commitment: 'c0', domainSep: 'd0', amount: '100' }
    },
    {
      name: 'ShieldedBurnEvent - amount present',
      node: { __typename: 'ShieldedBurnEvent', ...base, nullifier: 'n0', shieldedAmount: '50' },
      expected: { eventType: 'ShieldedBurn', ...expectedBase, nullifier: 'n0', amount: '50' }
    },
    {
      name: 'UnshieldedSpendEvent - user sender',
      node: { __typename: 'UnshieldedSpendEvent', ...base, sender: userAddress, domainSep: 'd0', tokenType: 't0', amount: '1' },
      expected: {
        eventType: 'UnshieldedSpend',
        ...expectedBase,
        sender: { kind: 'user', value: 'aabb' },
        domainSep: 'd0',
        tokenType: 't0',
        amount: '1'
      }
    },
    {
      name: 'UnshieldedReceiveEvent - contract recipient',
      node: { __typename: 'UnshieldedReceiveEvent', ...base, recipient: contractAddr, domainSep: 'd0', tokenType: 't0', amount: '2' },
      expected: {
        eventType: 'UnshieldedReceive',
        ...expectedBase,
        recipient: { kind: 'contract', value: 'ccdd' },
        domainSep: 'd0',
        tokenType: 't0',
        amount: '2'
      }
    },
    {
      name: 'UnshieldedMintEvent',
      node: { __typename: 'UnshieldedMintEvent', ...base, domainSep: 'd0', tokenType: 't0', amount: '3' },
      expected: { eventType: 'UnshieldedMint', ...expectedBase, domainSep: 'd0', tokenType: 't0', amount: '3' }
    },
    {
      name: 'UnshieldedBurnEvent',
      node: { __typename: 'UnshieldedBurnEvent', ...base, sender: userAddress, tokenType: 't0', amount: '4' },
      expected: { eventType: 'UnshieldedBurn', ...expectedBase, sender: { kind: 'user', value: 'aabb' }, tokenType: 't0', amount: '4' }
    },
    {
      name: 'PausedEvent',
      node: { __typename: 'PausedEvent', ...base },
      expected: { eventType: 'Paused', ...expectedBase }
    },
    {
      name: 'UnpausedEvent',
      node: { __typename: 'UnpausedEvent', ...base },
      expected: { eventType: 'Unpaused', ...expectedBase }
    },
    {
      name: 'MiscContractEvent',
      node: { __typename: 'MiscContractEvent', ...base, name: 'MyEvent', payload: 'p0' },
      expected: { eventType: 'Misc', ...expectedBase, name: 'MyEvent', payload: 'p0' }
    }
  ];

  test.each(cases)('maps $name to the full ContractEvent', ({ node, expected }) => {
    expect(toContractEvent(node)).toEqual(expected);
  });

  test('covers all 11 variants (exhaustiveness against compact-js LogEventType set)', () => {
    const mapped = cases.map((c) => c.expected.eventType).sort();
    const expectedTypes = [
      'ShieldedSpend',
      'ShieldedReceive',
      'ShieldedMint',
      'ShieldedBurn',
      'UnshieldedSpend',
      'UnshieldedReceive',
      'UnshieldedMint',
      'UnshieldedBurn',
      'Paused',
      'Unpaused',
      'Misc'
    ].sort();
    expect(mapped).toEqual(expectedTypes);
  });
});

describe('toContractEvent - nullable fields normalize to undefined', () => {
  test('ShieldedReceive absent ciphertext/receivingContractAddress map to undefined, not null', () => {
    const node: ContractEventNode = {
      __typename: 'ShieldedReceiveEvent',
      ...base,
      commitment: 'c0',
      ciphertext: null,
      receivingContractAddress: null
    };
    const result = toContractEvent(node);
    expect(result).toEqual({ eventType: 'ShieldedReceive', ...expectedBase, commitment: 'c0' });
    expect('ciphertext' in result && result.ciphertext).toBeUndefined();
  });

  test('ShieldedMint absent amount maps to undefined', () => {
    const node: ContractEventNode = {
      __typename: 'ShieldedMintEvent',
      ...base,
      commitment: 'c0',
      domainSep: 'd0',
      shieldedAmount: null
    };
    expect(toContractEvent(node)).toEqual({ eventType: 'ShieldedMint', ...expectedBase, commitment: 'c0', domainSep: 'd0' });
  });

  test('ShieldedBurn absent amount maps to undefined', () => {
    const node: ContractEventNode = { __typename: 'ShieldedBurnEvent', ...base, nullifier: 'n0', shieldedAmount: null };
    expect(toContractEvent(node)).toEqual({ eventType: 'ShieldedBurn', ...expectedBase, nullifier: 'n0' });
  });
});

describe('toContractEvent - amount precision and raw passthrough', () => {
  test('16-byte max-value amount round-trips as the exact string (no Number coercion)', () => {
    const bigAmount = (2n ** 128n - 1n).toString();
    const node: ContractEventNode = {
      __typename: 'UnshieldedMintEvent',
      ...base,
      domainSep: 'd0',
      tokenType: 't0',
      amount: bigAmount
    };
    const result = toContractEvent(node);
    expect(result.eventType === 'UnshieldedMint' && result.amount).toBe(bigAmount);
  });

  test('raw is carried verbatim, including odd values', () => {
    const node: ContractEventNode = { __typename: 'PausedEvent', ...base, raw: '0xODD-not-validated' };
    expect(toContractEvent(node).raw).toBe('0xODD-not-validated');
  });
});

describe('toContractEvent - AddressOrContract narrowing', () => {
  test('USER kind narrows to { kind: user, value: userAddress }', () => {
    const node: ContractEventNode = {
      __typename: 'UnshieldedSpendEvent',
      ...base,
      sender: { kind: 'USER', userAddress: 'aabb', contractAddress: null },
      domainSep: 'd0',
      tokenType: 't0',
      amount: '1'
    };
    const result = toContractEvent(node);
    expect(result.eventType === 'UnshieldedSpend' && result.sender).toEqual({ kind: 'user', value: 'aabb' });
  });

  test('CONTRACT kind narrows to { kind: contract, value: contractAddress }', () => {
    const node: ContractEventNode = {
      __typename: 'UnshieldedSpendEvent',
      ...base,
      sender: { kind: 'CONTRACT', userAddress: null, contractAddress: 'ccdd' },
      domainSep: 'd0',
      tokenType: 't0',
      amount: '1'
    };
    const result = toContractEvent(node);
    expect(result.eventType === 'UnshieldedSpend' && result.sender).toEqual({ kind: 'contract', value: 'ccdd' });
  });

  test('throws when the kind-selected address field is null', () => {
    const node: ContractEventNode = {
      __typename: 'UnshieldedSpendEvent',
      ...base,
      sender: { kind: 'USER', userAddress: null, contractAddress: null },
      domainSep: 'd0',
      tokenType: 't0',
      amount: '1'
    };
    expect(() => toContractEvent(node)).toThrow(IndexerDataError);
  });

  test('throws unknown-address-kind (not missing-field) for an unrecognized kind value', () => {
    const node: ContractEventNode = {
      __typename: 'UnshieldedSpendEvent',
      ...base,
      sender: { kind: '%future added value', userAddress: 'aabb', contractAddress: null },
      domainSep: 'd0',
      tokenType: 't0',
      amount: '1'
    };
    expect(() => toContractEvent(node)).toThrow(IndexerDataError);
    let caught: IndexerDataError | undefined;
    try {
      toContractEvent(node);
    } catch (e) {
      caught = e as IndexerDataError;
    }
    expect(caught?.context).toEqual({
      kind: 'unknown-address-kind',
      typename: 'UnshieldedSpendEvent',
      field: 'sender',
      value: '%future added value'
    });
  });
});

describe('toContractEvent - negative', () => {
  test('unknown __typename throws IndexerDataError', () => {
    const node = { __typename: 'GremlinEvent', ...base } as unknown as ContractEventNode;
    expect(() => toContractEvent(node)).toThrow(IndexerDataError);
  });

  test('missing required field throws rather than producing a half-built event', () => {
    const node = { __typename: 'ShieldedSpendEvent', ...base, nullifier: null } as unknown as ContractEventNode;
    expect(() => toContractEvent(node)).toThrow(IndexerDataError);
  });
});
