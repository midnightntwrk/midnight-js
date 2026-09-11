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

import type { FinalizedTransaction, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expectTypeOf, it } from 'vitest';

import type { RetainedEraHandlers } from '../era-arms';
import { createMidnightProviderFromArms, type MidnightProvider } from '../midnight-provider';
import { createProofProviderFromArms, type ProofProvider, type UnboundTransaction } from '../proof-provider';
import { createWalletProviderFromArms, type WalletProvider } from '../wallet-provider';

// These are compile-level tests: the property under test is that the file
// type-checks, and for the `@ts-expect-error` cases that it does NOT without
// the suppression. Vitest's typecheck pass is what turns tsc diagnostics
// against this file into test failures.

const stubUnbound = (): UnboundTransaction => ({}) as UnboundTransaction;
const stubFinalized = (): FinalizedTransaction => ({}) as FinalizedTransaction;

const keyReaders = {
  getCoinPublicKey: () => 'coin-pk' as never,
  getEncryptionPublicKey: () => 'enc-pk' as never
};

describe('RetainedEraHandlers', () => {
  // The keying is what makes "raz a dobrze" a type-level fact rather than a
  // convention: the current era is EXCLUDED from the key set, so a handler
  // registered against it is a build failure — and a further era becomes
  // registrable on its own, with no change to this type.
  it('keys every era except the current one', () => {
    expectTypeOf<keyof RetainedEraHandlers<string>>().toEqualTypeOf<Exclude<LedgerVersion, 'v9'>>();
  });
});

describe('createProofProviderFromArms', () => {
  it('accepts a retained arm for a retained era', () => {
    expectTypeOf(
      createProofProviderFromArms({
        currentEra: async () => stubUnbound(),
        retainedEras: { v8: async (bytes: Uint8Array) => bytes }
      })
    ).toExtend<ProofProvider>();
  });

  it('refuses a retained arm registered for the current era', () => {
    createProofProviderFromArms({
      currentEra: async () => stubUnbound(),
      // @ts-expect-error the current era is not a retained era: it crosses the
      // seam as a live ledger object, not as bytes.
      retainedEras: { v9: async (bytes: Uint8Array) => bytes }
    });
  });

  it('declares its eras against the shared era vocabulary', () => {
    expectTypeOf<ProofProvider['supportedEras']>().toEqualTypeOf<readonly LedgerVersion[]>();
  });

  it('refuses a declaration outside the era vocabulary', () => {
    const provider: ProofProvider = {
      // @ts-expect-error 'v7' is not a ledger era this framework knows.
      supportedEras: ['v7'],
      proveTx: async () => ({ version: 'v9', tx: stubUnbound() })
    };
    expectTypeOf(provider).toExtend<ProofProvider>();
  });
});

describe('createWalletProviderFromArms', () => {
  it('refuses a retained arm registered for the current era', () => {
    createWalletProviderFromArms({
      currentEra: async () => stubFinalized(),
      // @ts-expect-error see the proof-provider case above.
      retainedEras: { v9: async (bytes: Uint8Array) => bytes },
      ...keyReaders
    });
  });

  it('declares its eras against the shared era vocabulary', () => {
    expectTypeOf<WalletProvider['supportedEras']>().toEqualTypeOf<readonly LedgerVersion[]>();
  });
});

describe('createMidnightProviderFromArms', () => {
  it('refuses a retained arm registered for the current era', () => {
    createMidnightProviderFromArms({
      currentEra: async () => 'tx-id' as TransactionId,
      // @ts-expect-error see the proof-provider case above.
      retainedEras: { v9: async () => 'tx-id' as TransactionId }
    });
  });

  it('declares its eras against the shared era vocabulary', () => {
    expectTypeOf<MidnightProvider['supportedEras']>().toEqualTypeOf<readonly LedgerVersion[]>();
  });
});
