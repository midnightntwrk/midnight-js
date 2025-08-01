/*
 * This file is part of compact-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { Brand } from 'effect';

/**
 * @category keys
 */
export type CoinPublicKey = CoinPublicKey.Bech32m | CoinPublicKey.Hex;

export declare namespace CoinPublicKey {
  /**
   * A user public key capable of receiving Zswap coins, formatted as a hex-encoded 35-byte string.
   *
   * @category keys
   */
  export type Hex = Brand.Branded<string, 'CoinPublicKeyHex'>;

  /**
   * A user public key capable of receiving Zswap coins, formatted as a string using the Bech32m encoding scheme.
   *
   * @category keys
   */
  export type Bech32m = Brand.Branded<string, 'CoinPublicKeyBech32m'>;
}

/**
 * A user public key capable of receiving Zswap coins, formatted as a hex-encoded 35-byte string.
 *
 * @category keys
 */
export const Hex = Brand.nominal<CoinPublicKey.Hex>();

/**
 * A user public key capable of receiving Zswap coins, formatted as a string using the Bech32m encoding scheme.
 *
 * @category keys
 */
export const Bech32m = Brand.nominal<CoinPublicKey.Bech32m>();

export const asHex: (self: CoinPublicKey | string) => CoinPublicKey.Hex = (self) => {
  if (Hex.is(self)) return self;
  if (Bech32m.is(self)) {
    return /* TODO: convert */ Hex(self);
  }
  return Hex(self);
};

export const asBech32m: (self: CoinPublicKey | string) => CoinPublicKey.Bech32m = (self) => {
  if (Bech32m.is(self)) return self;
  if (Hex.is(self)) {
    return /* TODO: convert */ Bech32m(self);
  }
  return Bech32m(self);
};

export const make: (value: string) => CoinPublicKey = (value) => {
  // TODO: if value is hex use asHex, otherwise use asBech32m.
  return asHex(value);
};

