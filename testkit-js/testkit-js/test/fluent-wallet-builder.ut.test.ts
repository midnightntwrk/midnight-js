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

import { logger } from '../src/logger';
import type { EnvironmentConfiguration } from '../src/test-environment/environment-configuration';
import { FluentWalletBuilder } from '../src/wallet/fluent-wallet-builder';
import { WalletSeeds } from '../src/wallet/wallet-seed';

const testEnvironment: EnvironmentConfiguration = {
  walletNetworkId: 'undeployed' as EnvironmentConfiguration['walletNetworkId'],
  networkId: 'undeployed',
  indexer: 'http://localhost:8088',
  indexerWS: 'ws://localhost:8088',
  node: 'http://localhost:9944',
  nodeWS: 'ws://localhost:9944',
  proofServer: 'http://localhost:6300',
  faucet: undefined
};

describe('[Unit tests] FluentWalletBuilder seed immutability', () => {
  it('WalletSeeds.generateRandom produces unique seeds each time', () => {
    const seeds1 = WalletSeeds.generateRandom();
    const seeds2 = WalletSeeds.generateRandom();

    expect(seeds1.masterSeed).not.toBe(seeds2.masterSeed);
  });

  it('WalletSeeds.fromMasterSeed is deterministic for the same seed', () => {
    const seed = 'a'.repeat(64);
    const seeds1 = WalletSeeds.fromMasterSeed(seed);
    const seeds2 = WalletSeeds.fromMasterSeed(seed);

    expect(seeds1.masterSeed).toBe(seeds2.masterSeed);
    expect(seeds1.shielded).toEqual(seeds2.shielded);
  });
});

describe('[Unit tests] FluentWalletBuilder seed logging', () => {
  it('withRandomSeed does not log the generated seed', () => {
    const info = vi.spyOn(logger, 'info');
    try {
      FluentWalletBuilder.forEnvironment(testEnvironment).withRandomSeed();

      const logged = info.mock.calls.flat().map(String).join('\n');
      // A master seed is 64 hex characters; it must never appear in a log line.
      expect(logged).not.toMatch(/[0-9a-f]{64}/);
    } finally {
      info.mockRestore();
    }
  });
});
