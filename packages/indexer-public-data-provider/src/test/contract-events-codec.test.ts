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
import { describe, expect, it } from 'vitest';

import { type RawContractEvent, toVersionedLogItem } from '../contract-events-codec';

const envelope = (overrides: Partial<{ id: number; protocolVersion: number; version: number }> = {}) => ({
  id: overrides.id ?? 1,
  raw: '0xrr',
  maxId: 100,
  protocolVersion: overrides.protocolVersion ?? 11,
  version: overrides.version ?? 1,
  contractAddress: '0xc0ffee',
  transactionId: 7,
});

describe('toVersionedLogItem', () => {
  describe('ShieldedSpendEvent', () => {
    it('decodes into ShieldedSpend with nullifier', () => {
      const raw = { __typename: 'ShieldedSpendEvent' as const, ...envelope(), nullifier: '0xn1' };
      const r = toVersionedLogItem(raw);
      expect(r.ok).toBe(true);
      if (r.ok && r.item.event_type === 'ShieldedSpend') {
        expect(r.item.data.nullifier).toBe('0xn1');
        expect(r.item.id).toBe(1);
        expect(r.item.protocolVersion).toBe(11);
      } else {
        throw new Error('expected ShieldedSpend');
      }
    });
  });

  describe('ShieldedReceiveEvent', () => {
    it('decodes with ciphertext + receivingContractAddress both set', () => {
      const raw = {
        __typename: 'ShieldedReceiveEvent' as const, ...envelope(),
        commitment: '0xc1', ciphertext: '0xct', receivingContractAddress: '0xrc',
      };
      const r = toVersionedLogItem(raw);
      expect(r.ok).toBe(true);
      if (r.ok && r.item.event_type === 'ShieldedReceive') {
        expect(r.item.data.commitment).toBe('0xc1');
        expect(r.item.data.ciphertext).toBe('0xct');
        expect(r.item.data.receivingContractAddress).toBe('0xrc');
      } else {
        throw new Error('expected ShieldedReceive');
      }
    });
    it('decodes with ciphertext + receivingContractAddress null', () => {
      const raw = {
        __typename: 'ShieldedReceiveEvent' as const, ...envelope(),
        commitment: '0xc1', ciphertext: null, receivingContractAddress: null,
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'ShieldedReceive') {
        expect(r.item.data.ciphertext).toBeNull();
        expect(r.item.data.receivingContractAddress).toBeNull();
      } else {
        throw new Error('expected ShieldedReceive');
      }
    });
  });

  describe('ShieldedMintEvent', () => {
    it('preserves Uint<128> max precision via BigInt', () => {
      const max128 = (1n << 128n) - 1n;
      const raw = {
        __typename: 'ShieldedMintEvent' as const, ...envelope(),
        commitment: '0xc1', domainSep: '0xd1', amount: max128.toString(),
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'ShieldedMint') {
        expect(r.item.data.amount).toBe(max128);
      } else {
        throw new Error('expected ShieldedMint');
      }
    });
    it('decodes null amount', () => {
      const raw = {
        __typename: 'ShieldedMintEvent' as const, ...envelope(),
        commitment: '0xc1', domainSep: '0xd1', amount: null,
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'ShieldedMint') {
        expect(r.item.data.amount).toBeNull();
      } else {
        throw new Error('expected ShieldedMint');
      }
    });
  });

  describe('ShieldedBurnEvent', () => {
    it('decodes with nullifier + bigint amount', () => {
      const raw = {
        __typename: 'ShieldedBurnEvent' as const, ...envelope(),
        nullifier: '0xn1', amount: '100',
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'ShieldedBurn') {
        expect(r.item.data.nullifier).toBe('0xn1');
        expect(r.item.data.amount).toBe(100n);
      } else {
        throw new Error('expected ShieldedBurn');
      }
    });
  });

  describe('UnshieldedSpendEvent', () => {
    it('flattens sender object based on kind=USER', () => {
      const raw = {
        __typename: 'UnshieldedSpendEvent' as const, ...envelope(),
        sender: { kind: 'USER' as const, userAddress: '0xua', contractAddress: null },
        domainSep: '0xd', tokenType: '0xtt', amountRequired: '5',
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'UnshieldedSpend') {
        expect(r.item.data.sender).toBe('0xua');
        expect(r.item.data.amount).toBe(5n);
      } else {
        throw new Error('expected UnshieldedSpend');
      }
    });
    it('flattens sender object based on kind=CONTRACT', () => {
      const raw = {
        __typename: 'UnshieldedSpendEvent' as const, ...envelope(),
        sender: { kind: 'CONTRACT' as const, userAddress: null, contractAddress: '0xca' },
        domainSep: '0xd', tokenType: '0xtt', amountRequired: '5',
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'UnshieldedSpend') {
        expect(r.item.data.sender).toBe('0xca');
      } else {
        throw new Error('expected UnshieldedSpend');
      }
    });
  });

  describe('UnshieldedReceiveEvent', () => {
    it('decodes recipient + bigint amount', () => {
      const raw = {
        __typename: 'UnshieldedReceiveEvent' as const, ...envelope(),
        recipient: { kind: 'USER' as const, userAddress: '0xua', contractAddress: null },
        domainSep: '0xd', tokenType: '0xtt', amountRequired: '7',
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'UnshieldedReceive') {
        expect(r.item.data.recipient).toBe('0xua');
        expect(r.item.data.amount).toBe(7n);
      } else {
        throw new Error('expected UnshieldedReceive');
      }
    });
  });

  describe('UnshieldedMintEvent', () => {
    it('decodes domainSep, tokenType, amount', () => {
      const raw = {
        __typename: 'UnshieldedMintEvent' as const, ...envelope(),
        domainSep: '0xd', tokenType: '0xtt', amountRequired: '11',
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'UnshieldedMint') {
        expect(r.item.data.amount).toBe(11n);
      } else {
        throw new Error('expected UnshieldedMint');
      }
    });
  });

  describe('UnshieldedBurnEvent', () => {
    it('decodes sender + tokenType + amount (no domainSep)', () => {
      const raw = {
        __typename: 'UnshieldedBurnEvent' as const, ...envelope(),
        sender: { kind: 'USER' as const, userAddress: '0xua', contractAddress: null },
        tokenType: '0xtt', amountRequired: '13',
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'UnshieldedBurn') {
        expect(r.item.data.sender).toBe('0xua');
        expect(r.item.data.amount).toBe(13n);
      } else {
        throw new Error('expected UnshieldedBurn');
      }
    });
  });

  describe('PausedEvent / UnpausedEvent', () => {
    it.each(['PausedEvent', 'UnpausedEvent'] as const)('decodes %s with empty data', (typename) => {
      const raw = { __typename: typename, ...envelope() } as RawContractEvent;
      const r = toVersionedLogItem(raw);
      if (r.ok) {
        expect(Object.keys(r.item.data)).toHaveLength(0);
      } else {
        throw new Error('expected ok');
      }
    });
  });

  describe('MiscContractEvent', () => {
    it('decodes hex name + payload without further parsing', () => {
      const raw = {
        __typename: 'MiscContractEvent' as const, ...envelope({ version: 0 }),
        name: '0xnn', payload: '0xpp',
      };
      const r = toVersionedLogItem(raw);
      if (r.ok && r.item.event_type === 'Misc') {
        expect(r.item.data.name).toBe('0xnn');
        expect(r.item.data.payload).toBe('0xpp');
      } else {
        throw new Error('expected Misc');
      }
    });
  });

  describe('poison-event handling', () => {
    it('returns ok=false for unknown __typename, preserving id', () => {
      const raw = {
        __typename: 'BogusEvent', ...envelope({ id: 99 }),
      } as unknown as RawContractEvent;
      const r = toVersionedLogItem(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.failure.reason).toBe('unknownTypename');
        expect(r.failure.id).toBe(99);
        expect(r.failure.typename).toBe('BogusEvent');
      }
    });

    it('returns ok=false for non-numeric amount on UnshieldedMintEvent', () => {
      const raw = {
        __typename: 'UnshieldedMintEvent' as const, ...envelope({ id: 17 }),
        domainSep: '0xd', tokenType: '0xtt', amountRequired: 'not-a-number',
      };
      const r = toVersionedLogItem(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.failure.reason).toBe('malformedPayload');
        expect(r.failure.id).toBe(17);
        expect(r.failure.typename).toBe('UnshieldedMintEvent');
        expect(r.failure.message).toMatch(/amount/);
      }
    });

    it('returns ok=false for missing sender address when kind=USER but userAddress=null', () => {
      const raw = {
        __typename: 'UnshieldedSpendEvent' as const, ...envelope({ id: 21 }),
        sender: { kind: 'USER' as const, userAddress: null, contractAddress: null },
        domainSep: '0xd', tokenType: '0xtt', amountRequired: '5',
      };
      const r = toVersionedLogItem(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.failure.reason).toBe('malformedPayload');
        expect(r.failure.id).toBe(21);
      }
    });

    it('decodes successfully for unknown protocolVersion (no enforcement in phase 1)', () => {
      const raw = {
        __typename: 'PausedEvent' as const, ...envelope({ protocolVersion: 99 }),
      };
      const r = toVersionedLogItem(raw);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.item.protocolVersion).toBe(99);
      }
    });
  });
});
