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
import { sampleCoinPublicKey, sampleEncryptionPublicKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { expect, it } from 'vitest';

import { createUnprovenLedgerDeployTx } from '../internal/utils';

it('builds for config.networkId and ignores a leftover global network id', () => {
  setNetworkId('preview');

  const [, , tx] = createUnprovenLedgerDeployTx(
    new ContractState(),
    { outputs: [], inputs: [], coinPublicKey: sampleCoinPublicKey(), currentIndex: 0n },
    sampleEncryptionPublicKey(),
    { networkId: 'undeployed', ttlSeconds: 60 }
  );

  expect(/network_id: "([^"]*)"/.exec(tx.toString(false))?.[1]).toBe('undeployed');
});
