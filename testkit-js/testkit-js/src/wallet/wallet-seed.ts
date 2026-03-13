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

import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { mnemonicToSeedSync } from '@scure/bip39';

export const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon diesel';

type Role = typeof Roles.Zswap | typeof Roles.NightExternal | typeof Roles.Dust;

const deriveKeyForRole = (seed: string, role: Role, account = 0, keyIndex = 0): Uint8Array => {
  if (!seed || seed.length === 0) {
    throw new Error('Seed cannot be empty');
  }

  const seedBuffer = Buffer.from(seed, 'hex');
  const hdWalletResult = HDWallet.fromSeed(seedBuffer);

  if (hdWalletResult.type !== 'seedOk') {
    throw new Error('Invalid seed: failed to create HD wallet');
  }

  const derivationResult = hdWalletResult.hdWallet
    .selectAccount(account)
    .selectRole(role)
    .deriveKeyAt(keyIndex);

  if (derivationResult.type === 'keyOutOfBounds') {
    throw new Error(`Key derivation out of bounds for role ${role} at index ${keyIndex}`);
  }

  return derivationResult.key;
};

export const getShieldedSeed = (seed: string): Uint8Array => {
  return deriveKeyForRole(seed, Roles.Zswap);
};

export const getUnshieldedSeed = (seed: string): Uint8Array => {
  return deriveKeyForRole(seed, Roles.NightExternal);
};

export const getDustSeed = (seed: string): Uint8Array => {
  return deriveKeyForRole(seed, Roles.Dust);
};

export class WalletSeeds {
  private constructor(
    readonly masterSeed: string,
    readonly shielded: Uint8Array,
    readonly unshielded: Uint8Array,
    readonly dust: Uint8Array
  ) {}

  static fromMasterSeed(seed: string): WalletSeeds {
    if (!seed || seed.length === 0) {
      throw new Error('Master seed cannot be empty');
    }

    return new WalletSeeds(
      seed,
      getShieldedSeed(seed),
      getUnshieldedSeed(seed),
      getDustSeed(seed)
    );
  }

  static generateRandom(): WalletSeeds {
    const randomSeed = Buffer.from(generateRandomSeed()).toString('hex');
    return WalletSeeds.fromMasterSeed(randomSeed);
  }

  static fromMnemonic(mnemonic: string): WalletSeeds {
    if (!mnemonic || mnemonic.trim().length === 0) {
      throw new Error('Mnemonic cannot be empty');
    }
    const seed = Buffer.from(mnemonicToSeedSync(mnemonic)).toString('hex');
    return WalletSeeds.fromMasterSeed(seed);
  }

  static testWallet(): WalletSeeds {
    return WalletSeeds.fromMnemonic(TEST_MNEMONIC);
  }
}
