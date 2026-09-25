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

import { type FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type ProviderSeam,
  UntaggedPayloadError,
  type VersionedFinalizedTransaction,
  type VersionedUnboundTransaction
} from '@midnight-ntwrk/midnight-js-types';
import {
  type FinalizedTx,
  ProtocolVersion,
  type UnboundTx,
  type WalletFacade,
  WalletTransaction
} from '@midnightntwrk/wallet-sdk';
// Type-only, from the same copy `retainedLedger()` loads at runtime.
import type * as RetainedLedger from '@midnightntwrk/wallet-sdk/ledger/v8';
import { Either } from 'effect';
import * as Rx from 'rxjs';

import { FORK_SCHEDULE } from './wallet-configuration-mapper';

let retainedLedgerModule: Promise<typeof RetainedLedger> | undefined;

/**
 * The ledger-v8 module retained payloads are deserialized with: the wallet SDK's
 * own copy, reached through its `./ledger/v8` subpath.
 *
 * `ledger-v8` is installed twice, under both npm scopes, and the two copies'
 * classes refuse each other. Everything this file builds is handed to the SDK, so
 * it must be built with the SDK's copy.
 *
 * Lazy: a caller that never carries a retained payload never loads the WASM.
 *
 * @see docs/architecture/retained-era-coverage.md
 */
export const retainedLedger = (): Promise<typeof RetainedLedger> =>
  (retainedLedgerModule ??= import('@midnightntwrk/wallet-sdk/ledger/v8'));

type VersionedWallet = Pick<WalletFacade, 'state'>;

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

const unwrapWithinActive = <T>(handle: WalletTransaction, accepted: ProtocolVersion.ProtocolVersion.Range): T => {
  const unwrapped = WalletTransaction.unwrapWithin<T>(handle, accepted);
  if (Either.isLeft(unwrapped)) {
    throw unwrapped.left;
  }
  return unwrapped.right;
};

/**
 * Establishes that a payload carries a version discriminant at all.
 *
 * `unwrapV9` used to do this on the way past, and removing it to serve both eras
 * would otherwise turn the likeliest migration mistake -- a consumer built
 * against the pre-5.0.0 seam handing over a bare transaction -- from a coded,
 * actionable error into a `TypeError` raised somewhere inside the wallet SDK.
 */
const assertTagged = (payload: unknown, seam: ProviderSeam): void => {
  if (typeof payload !== 'object' || payload === null) {
    throw new UntaggedPayloadError(seam, payload);
  }
  const version = (payload as { version?: unknown }).version;
  if (version !== 'v8' && version !== 'v9') {
    throw new UntaggedPayloadError(seam, payload);
  }
};

/**
 * Adopts either era's unbound payload.
 *
 * The retained arm arrives as serialized bytes rather than a live object (ADR
 * 0007), so it is deserialized here. Its markers are `signature`/`proof`/
 * `pre-binding`: proving has already run -- `proveTx` returned `proven.serialize()`
 * -- and binding is precisely what balancing is about to add.
 */
export const adoptVersionedUnbound = async (
  wallet: VersionedWallet,
  payload: VersionedUnboundTransaction
): Promise<UnboundTx> => {
  assertTagged(payload, 'balanceTx');
  const active = await activeProtocolVersion(wallet);
  if (payload.version === 'v9') {
    return WalletTransaction.adopt('Unbound', payload.tx, active);
  }
  const v8 = await retainedLedger();
  return WalletTransaction.adopt(
    'Unbound',
    v8.Transaction.deserialize('signature', 'proof', 'pre-binding', payload.txBytes),
    active
  );
};

/** Adopts either era's finalized payload, for submission. */
export const adoptVersionedFinalized = async (
  wallet: VersionedWallet,
  payload: VersionedFinalizedTransaction
): Promise<FinalizedTx> => {
  assertTagged(payload, 'submitTx');
  const active = await activeProtocolVersion(wallet);
  if (payload.version === 'v9') {
    return WalletTransaction.adopt('Finalized', payload.tx, active);
  }
  const v8 = await retainedLedger();
  return WalletTransaction.adopt(
    'Finalized',
    v8.Transaction.deserialize('signature', 'proof', 'binding', payload.txBytes),
    active
  );
};

/**
 * Unwraps a finalized handle back into the era it came in as.
 *
 * The era is taken from the payload that entered the seam, never re-derived from
 * the chain: the seam's contract is that what comes out is tagged as what went
 * in, and a transaction does not change era while it is being balanced.
 */
export const unwrapVersionedFinalized = async (
  wallet: VersionedWallet,
  version: VersionedUnboundTransaction['version'],
  handle: FinalizedTx
): Promise<VersionedFinalizedTransaction> => {
  const accepted = await activeEpoch(wallet);
  if (version === 'v9') {
    return { version: 'v9', tx: unwrapWithinActive<FinalizedTransaction>(handle, accepted) };
  }
  return {
    version: 'v8',
    txBytes: unwrapWithinActive<RetainedLedger.FinalizedTransaction>(handle, accepted).serialize()
  };
};
