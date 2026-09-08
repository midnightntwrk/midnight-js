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
import { type UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import {
  type FinalizedTx,
  ProtocolVersion,
  type UnboundTx,
  type WalletFacade,
  WalletTransaction
} from '@midnightntwrk/wallet-sdk';
import { Either } from 'effect';
import * as Rx from 'rxjs';

import { FORK_SCHEDULE } from './wallet-configuration-mapper';

type VersionedWallet = Pick<WalletFacade, 'state'>;

const LEDGER_V9_EPOCH = ProtocolVersion.epochOf(FORK_SCHEDULE.v9, FORK_SCHEDULE.v9);

const activeProtocolVersion = async (wallet: VersionedWallet): Promise<ProtocolVersion.ProtocolVersion> =>
  (await Rx.firstValueFrom(wallet.state())).activeProtocolVersion;

export const adoptUnbound = async (wallet: VersionedWallet, tx: UnboundTransaction): Promise<UnboundTx> =>
  WalletTransaction.adopt('Unbound', tx, await activeProtocolVersion(wallet));

export const adoptFinalized = async (wallet: VersionedWallet, tx: FinalizedTransaction): Promise<FinalizedTx> =>
  WalletTransaction.adopt('Finalized', tx, await activeProtocolVersion(wallet));

export const unwrapFinalized = (handle: FinalizedTx): FinalizedTransaction => {
  const unwrapped = WalletTransaction.unwrapWithin<FinalizedTransaction>(handle, LEDGER_V9_EPOCH);
  if (Either.isLeft(unwrapped)) {
    throw unwrapped.left;
  }
  return unwrapped.right;
};
