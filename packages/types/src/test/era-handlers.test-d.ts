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

import type { LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { CoinPublicKey, EncPublicKey, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expectTypeOf, it } from 'vitest';

import type { FinalizedTx, UnboundTx, UnprovenTx } from '../ledger-transaction';
import { createMidnightProviderFromHandlers, type MidnightProvider, type MidnightProviderHandlers } from '../midnight-provider';
import {
  createProofProviderFromHandlers,
  type ProofProvider,
  type ProofProviderHandlers,
  type ProveTxConfig
} from '../proof-provider';
import { createWalletProviderFromHandlers, type WalletProvider, type WalletProviderHandlers } from '../wallet-provider';

// Compile-level tests: the property under test is that this file type-checks,
// and for the `@ts-expect-error` cases that it does NOT without the suppression.

declare const ledger8Unbound: LedgerTransactionTypes['v8']['Unbound'];
declare const ledger9Unbound: LedgerTransactionTypes['v9']['Unbound'];

const keyReaders = {
  getCoinPublicKey: (): CoinPublicKey => 'coin-pk',
  getEncryptionPublicKey: (): EncPublicKey => 'enc-pk'
};

describe('provider methods', () => {
  it('carry handles from stage to stage', () => {
    expectTypeOf<ProofProvider['proveTx']>().toEqualTypeOf<
      (tx: UnprovenTx, proveTxConfig?: ProveTxConfig) => Promise<UnboundTx>
    >();
    expectTypeOf<WalletProvider['balanceTx']>().toEqualTypeOf<(tx: UnboundTx, ttl?: Date) => Promise<FinalizedTx>>();
    expectTypeOf<MidnightProvider['submitTx']>().toEqualTypeOf<(tx: FinalizedTx) => Promise<TransactionId>>();
  });

  it('declare their eras against the shared era vocabulary', () => {
    expectTypeOf<ProofProvider['supportedEras']>().toEqualTypeOf<readonly LedgerVersion[]>();
    expectTypeOf<WalletProvider['supportedEras']>().toEqualTypeOf<readonly LedgerVersion[]>();
    expectTypeOf<MidnightProvider['supportedEras']>().toEqualTypeOf<readonly LedgerVersion[]>();
  });
});

describe('per-era handlers', () => {
  it('type each era handler against that era ledger classes', () => {
    expectTypeOf<NonNullable<ProofProviderHandlers['v8']>>().parameter(0).toEqualTypeOf<
      LedgerTransactionTypes['v8']['Unproven']
    >();
    expectTypeOf<NonNullable<ProofProviderHandlers['v9']>>().returns.toEqualTypeOf<
      Promise<LedgerTransactionTypes['v9']['Unbound']>
    >();
    expectTypeOf<NonNullable<WalletProviderHandlers['v8']>>().returns.toEqualTypeOf<
      Promise<LedgerTransactionTypes['v8']['Finalized']>
    >();
    expectTypeOf<NonNullable<MidnightProviderHandlers['v9']>>().parameter(0).toEqualTypeOf<
      LedgerTransactionTypes['v9']['Finalized']
    >();
  });

  it('refuses a handler answering in the other era', () => {
    createProofProviderFromHandlers({
      // @ts-expect-error a v8 handler answers with a v8 transaction
      v8: async () => ledger9Unbound,
      v9: async () => ledger9Unbound
    });
  });

  it('requires a key for every era', () => {
    // @ts-expect-error the v8 key is missing; an unserved era is written as undefined
    createProofProviderFromHandlers({ v9: async () => ledger9Unbound });
    // @ts-expect-error the v8 key is missing
    createWalletProviderFromHandlers({ v9: undefined, ...keyReaders });
    // @ts-expect-error the v9 key is missing
    createMidnightProviderFromHandlers({ v8: async () => 'tx-id' });
  });

  it('accepts an era written as undefined', () => {
    expectTypeOf(
      createProofProviderFromHandlers({ v8: async () => ledger8Unbound, v9: undefined })
    ).toEqualTypeOf<ProofProvider>();
  });
});
