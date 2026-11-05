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

import type { CoinPublicKey, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { LEDGER_ERAS, type LedgerEra } from '@midnight-ntwrk/midnight-js-protocol/version';

import { dispatch, type Route, sealAnswer, type TransactionAnswers } from './internal/dispatch';
import { assertFunction, readEraEntries } from './internal/read-era-entries';
import type { FinalizedTx, LedgerTransaction, TransactionAnswer, UnboundTx } from './ledger-transaction';

/**
 * Interface representing a WalletProvider that handles operations such as
 * transaction balancing and finalization, and provides access to cryptographic secret keys.
 */
export interface WalletProvider {
  /**
   * The ledger eras THIS INSTANCE serves. See
   * {@link ProofProvider.supportedEras} — the field means the same on all three
   * transaction providers, and all three are read together before an operation
   * starts.
   */
  readonly supportedEras: readonly LedgerEra[];

  /**
   * Balances and signs a transaction, readying it for submission.
   *
   * @param tx The unbound transaction handle to balance.
   * @param ttl Expiry for the intent the wallet adds while balancing. The framework always passes
   *            a `Date` `providers.config.ttlSeconds` after balancing starts; honour it rather than a
   *            TTL of your own. Implementation-defined when omitted; the testkit's
   *            `MidnightWalletProvider` defaults to one hour.
   * @returns The balanced, signed transaction handle, in the SAME era as `tx`.
   * @throws InvalidTransactionHandleError if `tx` is not an unbound handle of this package.
   * @throws ProviderEraUnsupportedError if the implementation does not serve the handle's era.
   * @throws InvalidTransactionHandleError if the balanced transaction is not a transaction object
   *         or bytes (`not-a-transaction`), or is not a Finalized transaction of the handle's era
   *         (`header-mismatch`).
   */
  balanceTx(tx: UnboundTx, ttl?: Date): Promise<FinalizedTx>;

  getCoinPublicKey(): CoinPublicKey;

  getEncryptionPublicKey(): EncPublicKey;
}

/**
 * The per-era handlers and key readers {@link createWalletProviderFromHandlers}
 * assembles a {@link WalletProvider} from: one key per ledger era, a handler for
 * an era the wallet balances and `undefined` for one it does not.
 *
 * A handler receives the handle of its own era. It passes `tx.serialize()` to a
 * wallet, or decodes the handle with its own ledger copy. It answers with a
 * transaction object of any ledger copy, or with its bytes. Bytes are decoded
 * once, so a corrupt body is refused at `balanceTx`.
 *
 * The two key readers sit beside the handlers rather than inside one: they are
 * properties of the wallet, not of the era a transaction belongs to.
 */
export type WalletProviderHandlers = {
  readonly [E in LedgerEra]:
    | ((tx: LedgerTransaction<'Unbound', E>, ttl?: Date) => Promise<TransactionAnswer>)
    | undefined;
} & {
  readonly getCoinPublicKey: () => CoinPublicKey;
  readonly getEncryptionPublicKey: () => EncPublicKey;
};

/**
 * Assembles a {@link WalletProvider} from one handler per ledger era.
 *
 * The counterpart to `createProofProviderFromHandlers`, with the same guarantees:
 * `supportedEras` is computed from the handlers given, each handle is routed to
 * its own era's handler, and the answer is sealed in that same era.
 *
 * Every handler and both key readers are called with `handlers` as `this`.
 *
 * @param handlers One entry per ledger era, and the two key readers.
 * @returns A {@link WalletProvider} routing each handle to its era's handler.
 * @throws UnusableEraEntryError if an era entry is neither `undefined` nor a
 *         function. Raised at construction.
 * @throws InvalidArgumentError if `handlers` is not an object, has no key for a
 *         ledger era, serves no era (every entry `undefined`), or a key reader is
 *         not a function. Raised at construction.
 */
export const createWalletProviderFromHandlers = (handlers: WalletProviderHandlers): WalletProvider => {
  const served = readEraEntries('balanceTx', handlers, 'handler');
  const { getCoinPublicKey, getEncryptionPublicKey } = handlers;
  assertFunction('balanceTx', 'getCoinPublicKey', getCoinPublicKey);
  assertFunction('balanceTx', 'getEncryptionPublicKey', getEncryptionPublicKey);
  const supportedEras = Object.freeze(LEDGER_ERAS.filter((era) => served[era] !== undefined));
  const route: Route<'Unbound', [Date?], TransactionAnswers, FinalizedTx> = {
    method: 'balanceTx',
    stage: 'Unbound',
    handlers: served,
    receiver: handlers,
    supportedEras,
    answer: (era, balanced) => sealAnswer(era, 'Finalized', balanced, 'balanceTx')
  };
  return {
    supportedEras,
    balanceTx: (tx, ttl) => dispatch(route, tx, [ttl]),
    getCoinPublicKey: () => Reflect.apply(getCoinPublicKey, handlers, []),
    getEncryptionPublicKey: () => Reflect.apply(getEncryptionPublicKey, handlers, [])
  };
};

/**
 * A {@link WalletProvider} written against the v9 ledger runtime only.
 */
export interface Ledger9WalletProvider {
  balanceTx(tx: LedgerTransaction<'Unbound', 'v9'>, ttl?: Date): Promise<TransactionAnswer>;
  getCoinPublicKey(): CoinPublicKey;
  getEncryptionPublicKey(): EncPublicKey;
}

/**
 * Lifts a v9-only wallet implementation into the {@link WalletProvider}
 * interface, sealing the answer on the way out.
 *
 * The returned provider serves v9 only — `supportedEras` says so — and refuses
 * a v8 handle with `ProviderEraUnsupportedError`. To serve v8 as well, use
 * {@link createWalletProviderFromHandlers}.
 *
 * @param impl The v9-only wallet implementation to wrap.
 * @returns A {@link WalletProvider} serving v9.
 *
 * @example
 * ```typescript
 * // The wallet runs its own copy of the ledger, so the transaction crosses as bytes.
 * const walletProvider = createLedger9WalletProvider({
 *   balanceTx: (tx, ttl) => wallet.balanceTransaction(tx.serialize(), ttl),
 *   getCoinPublicKey: () => wallet.coinPublicKey,
 *   getEncryptionPublicKey: () => wallet.encryptionPublicKey
 * });
 * ```
 */
export const createLedger9WalletProvider = (impl: Ledger9WalletProvider): WalletProvider =>
  createWalletProviderFromHandlers({
    v8: undefined,
    v9: (tx, ttl) => impl.balanceTx(tx, ttl),
    getCoinPublicKey: () => impl.getCoinPublicKey(),
    getEncryptionPublicKey: () => impl.getEncryptionPublicKey()
  });
