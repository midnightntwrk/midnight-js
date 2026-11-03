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
  deserializeTransactionAtStage,
  type LedgerTransactionTypes
} from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { ProtocolVersion, type WalletFacade, WalletTransaction } from '@midnightntwrk/wallet-sdk';
// From the same copy `loadWalletLedger8()` loads at runtime.
import type * as LedgerV8 from '@midnightntwrk/wallet-sdk/ledger/v8';
import * as WalletLedger9 from '@midnightntwrk/wallet-sdk/ledger/v9';
import { Either } from 'effect';
import * as Rx from 'rxjs';

import { FORK_SCHEDULE } from './wallet-configuration-mapper';

let walletLedger8Module: Promise<typeof LedgerV8> | undefined;

/**
 * The wallet SDK's own copy of the v8 ledger, reached through its `./ledger/v8`
 * subpath.
 *
 * Everything this file builds is handed to the SDK, so it must be built with the
 * SDK's copy — `ledger-v8` is installed twice and the two copies' classes refuse
 * each other.
 *
 * Lazy, and a failed load is not memoised: the next call retries rather than
 * serving the first rejection forever.
 *
 * @see docs/architecture/retained-era-coverage.md
 */
export const loadWalletLedger8 = (): Promise<typeof LedgerV8> =>
  (walletLedger8Module ??= import('@midnightntwrk/wallet-sdk/ledger/v8').catch((error: unknown) => {
    walletLedger8Module = undefined;
    throw new Error("the wallet SDK's ledger 8 module ('@midnightntwrk/wallet-sdk/ledger/v8') could not be loaded", {
      cause: error
    });
  }));

type VersionedWallet = Pick<WalletFacade, 'state'>;

/** The stages a transaction is handed to the wallet at. */
type WalletStage = 'Unbound' | 'Finalized';

type Serializable = { readonly serialize: () => Uint8Array };

type WalletDecoders = Readonly<Record<WalletStage, (bytes: Uint8Array) => Serializable>>;

const walletDecoders: Readonly<Record<LedgerVersion, () => Promise<WalletDecoders>>> = Object.freeze({
  v8: async () => {
    const { Transaction } = await loadWalletLedger8();
    return {
      Unbound: (bytes: Uint8Array) => Transaction.deserialize('signature', 'proof', 'pre-binding', bytes),
      Finalized: (bytes: Uint8Array) => Transaction.deserialize('signature', 'proof', 'binding', bytes)
    };
  },
  v9: () =>
    Promise.resolve({
      Unbound: (bytes: Uint8Array) => WalletLedger9.Transaction.deserialize('signature', 'proof', 'pre-binding', bytes),
      Finalized: (bytes: Uint8Array) => WalletLedger9.Transaction.deserialize('signature', 'proof', 'binding', bytes)
    })
});

const activeProtocolVersion = async (wallet: VersionedWallet): Promise<ProtocolVersion.ProtocolVersion> =>
  (await Rx.firstValueFrom(wallet.state())).activeProtocolVersion;

/**
 * The epoch the chain is in right now, which is the only one a wallet will
 * unwrap into.
 *
 * Derived from the wallet's own `activeProtocolVersion` rather than pinned to a
 * single era: below the fork version that is the retained epoch, from it the
 * current one, and a caller that hardcodes either is wrong on one side of the
 * boundary.
 */
const activeEpoch = async (wallet: VersionedWallet): Promise<ProtocolVersion.ProtocolVersion.Range> =>
  ProtocolVersion.epochOf(await activeProtocolVersion(wallet), FORK_SCHEDULE.v9);

/**
 * Hands a framework transaction to the wallet SDK.
 *
 * The transaction is serialized and decoded with the wallet SDK's own copy of
 * the era's ledger, then adopted at the chain's active protocol version: the
 * framework's object is never passed to the SDK, whose ledger copy may be a
 * different WASM instance.
 */
export const adoptInWallet = async <E extends LedgerVersion, S extends WalletStage>(
  wallet: VersionedWallet,
  era: E,
  stage: S,
  tx: LedgerTransactionTypes[E][S]
): Promise<WalletTransaction<S>> => {
  const decoders = await walletDecoders[era]();
  return WalletTransaction.adopt(stage, decoders[stage](tx.serialize()), await activeProtocolVersion(wallet));
};

/**
 * Reads a finalized wallet SDK handle back into the framework's ledger copy.
 *
 * The era is the one the transaction was handed over in, never re-derived from
 * the chain: a transaction does not change era while it is being balanced.
 */
export const finalizedFromWallet = async <E extends LedgerVersion>(
  wallet: VersionedWallet,
  era: E,
  handle: WalletTransaction<'Finalized'>
): Promise<LedgerTransactionTypes[E]['Finalized']> => {
  const unwrapped = WalletTransaction.unwrapWithin<Serializable>(handle, await activeEpoch(wallet));
  if (Either.isLeft(unwrapped)) {
    throw unwrapped.left;
  }
  return deserializeTransactionAtStage(era, 'Finalized', unwrapped.right.serialize());
};
