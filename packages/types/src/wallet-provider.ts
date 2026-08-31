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

import {
  type CoinPublicKey,
  type EncPublicKey,
  type FinalizedTransaction,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';

import { type UnboundTransaction,type VersionedUnboundTransaction } from './proof-provider';
import { unwrapV9 } from './unwrap-v9';
import { type VersionedTx } from './versioned';

/**
 * A balanced, signed transaction ready for submission: either the live v9
 * ledger object, or the serialized bytes of a v8-era transaction.
 */
export type VersionedFinalizedTransaction = VersionedTx<FinalizedTransaction>;

/**
 * Interface representing a WalletProvider that handles operations such as
 * transaction balancing and finalization, and provides access to cryptographic secret keys.
 */
export interface WalletProvider {

  /**
   * Balances and signs a transaction, readying it for submission.
   *
   * @param tx The version-tagged transaction to balance: `{ version: 'v9', tx }` for a live v9
   *           ledger object, `{ version: 'v8', txBytes }` for v8-era serialized bytes.
   * @param ttl Time-to-live for the balanced transaction. Implementation-defined when omitted;
   *            the testkit's `MidnightWalletProvider` defaults to one hour.
   * @returns The balanced, signed transaction, version-tagged. Narrow on `version` — or call
   *          `unwrapV9` — before reading the payload.
   * @throws V8PayloadUnsupportedError if the implementation does not handle the v8 arm.
   * @throws UntaggedPayloadError if `version` is missing or unrecognised.
   */
  balanceTx(tx: VersionedUnboundTransaction, ttl?: Date): Promise<VersionedFinalizedTransaction>;

  getCoinPublicKey(): CoinPublicKey;

  getEncryptionPublicKey(): EncPublicKey;
}

/**
 * A {@link WalletProvider} written against the v9 ledger runtime only — the
 * shape an implementation had before the seams became version-tagged.
 */
export interface V9WalletProvider {
  balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction>;
  getCoinPublicKey(): CoinPublicKey;
  getEncryptionPublicKey(): EncPublicKey;
}

/**
 * Lifts a v9-only wallet implementation into the version-tagged
 * {@link WalletProvider} interface.
 *
 * Use this rather than tagging by hand. `balanceTx`'s return type is covariant,
 * so an implementation still resolving a bare `FinalizedTransaction` no longer
 * satisfies `WalletProvider` — and because TypeScript reports the *parameter*
 * mismatch first, the compiler error names the 20-odd ledger methods
 * `V8TxBytes` lacks rather than the missing `version` tag. This adapter keeps
 * the tag out of implementation code entirely, so that error never arises.
 *
 * The returned provider serves the v9 arm only: it rejects a v8 payload with
 * `V8PayloadUnsupportedError` and an untagged one with `UntaggedPayloadError`.
 *
 * @param impl The v9-only wallet implementation to wrap.
 * @returns A {@link WalletProvider} that narrows inbound payloads and tags
 *          outbound ones.
 *
 * @example
 * ```typescript
 * const walletProvider = createWalletProvider({
 *   balanceTx: (tx, ttl) => wallet.balanceAndProveTransaction(tx, ttl),
 *   getCoinPublicKey: () => wallet.coinPublicKey,
 *   getEncryptionPublicKey: () => wallet.encryptionPublicKey
 * });
 * ```
 */
export const createWalletProvider = (impl: V9WalletProvider): WalletProvider => ({
  async balanceTx(tx: VersionedUnboundTransaction, ttl?: Date): Promise<VersionedFinalizedTransaction> {
    return { version: 'v9', tx: await impl.balanceTx(unwrapV9(tx, 'balanceTx'), ttl) };
  },
  getCoinPublicKey: () => impl.getCoinPublicKey(),
  getEncryptionPublicKey: () => impl.getEncryptionPublicKey()
});
