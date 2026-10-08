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

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  MaintenanceUpdate,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { MidnightConfig } from '@midnight-ntwrk/midnight-js-types';
import { afterEach, expect, it } from 'vitest';

import { unprovenTxFromContractUpdates } from '../governance/unproven-tx';
import { createUnprovenLedgerDeployTx } from '../internal/utils';

const CONFIG: MidnightConfig = { networkId: 'undeployed', ttlSeconds: 60 };

const builders: [string, () => Promise<UnprovenTransaction>][] = [
  [
    'deploy',
    async () =>
      createUnprovenLedgerDeployTx(
        new ContractState(),
        { outputs: [], inputs: [], coinPublicKey: sampleCoinPublicKey(), currentIndex: 0n },
        sampleEncryptionPublicKey(),
        CONFIG
      )[2]
  ],
  [
    'governance',
    () => unprovenTxFromContractUpdates(() => Promise.resolve(new MaintenanceUpdate(sampleContractAddress(), [], 1n)), CONFIG)
  ]
];

afterEach(() => {
  setNetworkId('undeployed');
});

it.each(builders)('builds a %s transaction for config.networkId and ignores a leftover global network id', async (_, build) => {
  setNetworkId('preview');

  const tx = await build();

  expect(/network_id: "([^"]*)"/.exec(tx.toString(false))?.[1]).toBe('undeployed');
});
