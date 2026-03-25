/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { WalletSeeds } from '@/wallet/wallet-seed';

vi.mock('@midnight-ntwrk/wallet-sdk-facade');
vi.mock('@midnight-ntwrk/wallet-sdk-unshielded-wallet');

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
