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
import { CURRENT_LEDGER_VERSION, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { erasServedBy, narrowToEraArm, type RetainedEraHandlers } from './era-arms';
import { type UnboundTransaction,type VersionedUnboundTransaction } from './proof-provider';
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
   * The ledger eras THIS INSTANCE serves. See
   * {@link ProofProvider.supportedEras} — the field means the same on all three
   * transaction seams, and all three are read together before an operation
   * starts.
   */
  readonly supportedEras: readonly LedgerVersion[];

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
 * Balances a CURRENT-era transaction, which crosses this seam as a live ledger
 * object.
 */
export type CurrentEraBalancer = (tx: UnboundTransaction, ttl?: Date) => Promise<FinalizedTransaction>;

/**
 * Balances a RETAINED-era transaction, which crosses this seam as serialized
 * bytes in both directions.
 */
export type RetainedEraBalancer = (txBytes: Uint8Array, ttl?: Date) => Promise<Uint8Array>;

/**
 * The per-era arms {@link createWalletProviderFromArms} assembles a
 * {@link WalletProvider} from.
 *
 * The two key readers sit beside the arms rather than inside one: a coin public
 * key and an encryption public key are properties of the wallet, not of the era
 * a transaction belongs to, and duplicating them per era would invite two
 * answers to one question.
 */
export interface WalletProviderArms {
  /** Required: every wallet balances the current era. */
  readonly currentEra: CurrentEraBalancer;
  /** Optional, one entry per retained era this wallet balances. */
  readonly retainedEras?: RetainedEraHandlers<RetainedEraBalancer>;
  readonly getCoinPublicKey: () => CoinPublicKey;
  readonly getEncryptionPublicKey: () => EncPublicKey;
}

/**
 * Assembles a {@link WalletProvider} from one arm per ledger era it serves.
 *
 * The counterpart to `createProofProviderFromArms`, with the same guarantees:
 * `supportedEras` is computed from the arms supplied, the tag never appears in
 * implementation code, and an answer is always tagged as the era the request
 * carried.
 *
 * @param arms The current-era arm, any retained arms, and the two key readers.
 * @returns A {@link WalletProvider} routing each request to its era's arm.
 */
export const createWalletProviderFromArms = (arms: WalletProviderArms): WalletProvider => ({
  supportedEras: erasServedBy(arms.retainedEras),

  async balanceTx(tx: VersionedUnboundTransaction, ttl?: Date): Promise<VersionedFinalizedTransaction> {
    const request = narrowToEraArm(tx, 'balanceTx', arms.retainedEras);
    if (request.era === CURRENT_LEDGER_VERSION) {
      return { version: CURRENT_LEDGER_VERSION, tx: await arms.currentEra(request.tx, ttl) };
    }
    return { version: request.era, txBytes: await request.handler(request.txBytes, ttl) };
  },

  getCoinPublicKey: () => arms.getCoinPublicKey(),
  getEncryptionPublicKey: () => arms.getEncryptionPublicKey()
});

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
 * The returned provider serves the v9 arm only — `supportedEras` says so — and
 * that is permanent rather than a gap: it lifts a v9-only implementation. It
 * rejects a v8 payload with `V8PayloadUnsupportedError` and an untagged one with
 * `UntaggedPayloadError`. To serve a retained era as well, use
 * {@link createWalletProviderFromArms}.
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
export const createWalletProvider = (impl: V9WalletProvider): WalletProvider =>
  createWalletProviderFromArms({
    currentEra: (tx, ttl) => impl.balanceTx(tx, ttl),
    getCoinPublicKey: () => impl.getCoinPublicKey(),
    getEncryptionPublicKey: () => impl.getEncryptionPublicKey()
  });

