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

import { NetworkId } from '@midnightntwrk/wallet-sdk';
import { pino } from 'pino';

import type { EnvironmentConfiguration } from '../src/test-environment/environment-configuration';
import { MidnightWalletProvider } from '../src/wallet/midnight-wallet-provider';

const MASTER_SEED = 'ab'.repeat(32);
const WALLET_ADDRESS = 'test-address-value';

// Isolate build() from real wallet construction: the builder is stubbed to
// return fixed seeds, and the initial shielded state to a fixed address.
// (Literals live inside the factories: vi.mock is hoisted above the consts.)
vi.mock('../src/wallet/fluent-wallet-builder', () => ({
  FluentWalletBuilder: class {
    static forEnvironment(): unknown {
      return new this();
    }

    withSeed(): this {
      return this;
    }

    withRandomSeed(): this {
      return this;
    }

    async buildWithoutStarting(): Promise<unknown> {
      return {
        wallet: { shielded: {} },
        seeds: { masterSeed: 'ab'.repeat(32), shielded: new Uint8Array(32), dust: new Uint8Array(32) },
        keystore: {}
      };
    }
  }
}));

vi.mock('../src/wallet/wallet-utils', () => ({
  getInitialShieldedState: async () => ({ address: { coinPublicKeyString: () => 'test-address-value' } }),
  waitForFunds: async () => 0n
}));

const testEnvironment: EnvironmentConfiguration = {
  walletNetworkId: NetworkId.NetworkId.Undeployed,
  networkId: 'undeployed',
  indexer: 'http://localhost:8088',
  indexerWS: 'ws://localhost:8088',
  node: 'http://localhost:9944',
  nodeWS: 'ws://localhost:9944',
  proofServer: 'http://localhost:6300',
  faucet: undefined
};

describe('[Unit tests] MidnightWalletProvider.build seed logging', () => {
  it('logs the wallet address but never the wallet seed', async () => {
    const lines: string[] = [];
    const recordingLogger = pino(
      { level: 'info' },
      {
        write: (chunk: string) => {
          lines.push(chunk);
        }
      }
    );

    await MidnightWalletProvider.build(recordingLogger, testEnvironment, MASTER_SEED);

    const logged = lines.join('\n');
    expect(logged).toContain(WALLET_ADDRESS);
    expect(logged).not.toContain(MASTER_SEED);
  });
});
