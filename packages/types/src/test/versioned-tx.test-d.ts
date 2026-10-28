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

import type { CoinPublicKey, ContractAddress, EncPublicKey, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expectTypeOf, it } from 'vitest';

import type { PublicDataProvider } from '../public-data-provider';
import type { FinalizedTxRead } from '../versioned';
import type { WalletProvider } from '../wallet-provider';

// Compile-level tests, verified by vitest's typecheck pass for this package.

describe('WalletProvider key readers', () => {
  it('stay untouched by the transaction handle', () => {
    expectTypeOf<WalletProvider['getCoinPublicKey']>().toEqualTypeOf<() => CoinPublicKey>();
    expectTypeOf<WalletProvider['getEncryptionPublicKey']>().toEqualTypeOf<() => EncPublicKey>();
  });
});

// Reverting either signature to `Promise<Ledger9FinalizedTxData>` still type-checks
// everywhere, because `Ledger9FinalizedTxData` is assignable to the union that
// consumes it, so nothing else would notice.
describe('read-surface provider members', () => {
  it('watchForTxData resolves a version-tagged finalized record', () => {
    expectTypeOf<PublicDataProvider['watchForTxData']>().toEqualTypeOf<
      (txId: TransactionId) => Promise<FinalizedTxRead>
    >();
  });

  it('watchForDeployTxData resolves a version-tagged finalized record', () => {
    expectTypeOf<PublicDataProvider['watchForDeployTxData']>().toEqualTypeOf<
      (contractAddress: ContractAddress) => Promise<FinalizedTxRead>
    >();
  });
});
