/*
 * This file is part of platform-js.
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
import * as Either from 'effect/Either';
import * as Hex_ from './Hex.js';

/**
 * A user public key capable of receiving Zswap coins.
 *
 * @remarks
 * `CoinPublicKey` is a 'branded' string type that represents a public key encoded either as a sequence of
 * hexadecimal characters, or as a string formatted according to the Bech32m encoding scheme.
 * 
 * @see {@link CoinPublicKey.Hex}
 * @see {@link CoinPublicKey.Bech32m}
 * @category keys
 */
export type CoinPublicKey = CoinPublicKey.Bech32m | CoinPublicKey.Hex;

export declare namespace CoinPublicKey {
  /**
   * A user public key capable of receiving Zswap coins, formatted as a hex-encoded string.
   *
   * @category keys
   */
  export type Hex = Brand.Branded<string, 'CoinPublicKeyHex'>;

  /**
   * A user public key capable of receiving Zswap coins, formatted as a string according to the Bech32m encoding
   * scheme.
   *
   * @category keys
   */
  export type Bech32m = Brand.Branded<string, 'CoinPublicKeyBech32m'>;
}

/**
 * Creates a coin public key from a plain hex-encoded source string ({@link Hex_.PlainHex | PlainHex}).
 *
 * @category constructors
 */
export const Hex = Brand.all(
  Brand.nominal<CoinPublicKey.Hex>(),
  Hex_.PlainHex
);

/**
 * Create a coin public key from a source string formatted according to the Bech32m encoding scheme.
 *
 * @category constructors
 */
export const Bech32m = Brand.nominal<CoinPublicKey.Bech32m>();

/**
 * Creates a hex-encoded coin public key from a given source.
 *
 * @param self A source string that should become a {@link CoinPublicKey.Hex}, or a {@link CoinPublicKey} that
 * should become a {@link CoinPublicKey.Hex}.
 * @returns A {@link CoinPublicKey.Hex}.
 *
 * @category constructors
 */
export const asHex: (self: CoinPublicKey | string) => CoinPublicKey.Hex = (self) => {
  if (Hex.is(self)) return self;
  if (Bech32m.is(self)) {
    return /* TODO: convert */ Hex(self);
  }
  return Hex(self);
};

/**
 * Creates a Bech32m formatted coin public key from a given source.
 *
 * @param self A source string that should become a {@link CoinPublicKey.Bech32m}, or a {@link CoinPublicKey} that
 * should become a {@link CoinPublicKey.Bech32m}.
 * @returns A {@link CoinPublicKey.Bech32m}.
 *
 * @category constructors
 */
export const asBech32m: (self: CoinPublicKey | string) => CoinPublicKey.Bech32m = (self) => {
  if (Bech32m.is(self)) return self;
  if (Hex.is(self)) {
    return /* TODO: convert */ Bech32m(self);
  }
  return Bech32m(self);
};

/**
 * Create a coin public key from a source string.
 *
 * @param value The string value that is become a {@link CoinPublicKey}.
 * @returns A {@link CoinPublicKey} that is an instance of {@link CoinPublicKey.Hex} if `value` could be
 * parsed as a hex-encoded string; otherwise as an instance of {@link CoinPublicKey.Bech32m}.
 *
 * @category constructors
 */
export const make: (value: string) => CoinPublicKey = (value) => {
  return Either.match(Hex_.parseHex(value), {
    onRight: (_) => Hex(value),
    onLeft: (_) => Bech32m(value)
  });
};
