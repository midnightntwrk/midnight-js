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

import { ProtocolVersion, ProtocolVersionMismatchError, type WalletFacade } from '@midnightntwrk/wallet-sdk';
import * as Rx from 'rxjs';
import { describe, expect, it } from 'vitest';

import { FORK_SCHEDULE } from '../src/wallet/wallet-configuration-mapper';
import { adoptFinalized, adoptUnbound, unwrapFinalized } from '../src/wallet/wallet-transaction';

const LEDGER_V8_VERSION = ProtocolVersion.ProtocolVersion(FORK_SCHEDULE.v9 - 1n);

const walletAt = (activeProtocolVersion: ProtocolVersion.ProtocolVersion): Pick<WalletFacade, 'state'> =>
  ({ state: () => Rx.of({ activeProtocolVersion }) }) as unknown as Pick<WalletFacade, 'state'>;

const transaction = { serialize: () => new Uint8Array([1, 2, 3]) };

describe('[Unit tests] wallet transaction handles', () => {
  it('stamps an unbound transaction with the version the wallets are acting at', async () => {
    const wallet = walletAt(FORK_SCHEDULE.v9);

    const handle = await adoptUnbound(wallet, transaction as never);

    expect(handle.stage).toBe('Unbound');
    expect(handle.protocolVersion).toBe(FORK_SCHEDULE.v9);
  });

  it('stamps a finalized transaction with the version the wallets are acting at', async () => {
    const wallet = walletAt(FORK_SCHEDULE.v9);

    const handle = await adoptFinalized(wallet, transaction as never);

    expect(handle.stage).toBe('Finalized');
    expect(handle.protocolVersion).toBe(FORK_SCHEDULE.v9);
  });

  it('unwraps a handle authored in the ledger-v9 era', async () => {
    const wallet = walletAt(FORK_SCHEDULE.v9);
    const handle = await adoptFinalized(wallet, transaction as never);

    expect(unwrapFinalized(handle)).toBe(transaction);
  });

  it('refuses a handle authored before the ledger-v9 fork', async () => {
    const wallet = walletAt(LEDGER_V8_VERSION);
    const handle = await adoptFinalized(wallet, transaction as never);

    expect(() => unwrapFinalized(handle)).toThrow(ProtocolVersionMismatchError);
  });
});
