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

export type CoinPublicKey = CoinPublicKey.Bech32m | CoinPublicKey.Hex;

export declare namespace CoinPublicKey {
  export type Hex = Brand.Branded<string, 'CoinPublicKeyHex'>;

  export type Bech32m = Brand.Branded<string, 'CoinPublicKeyBech32m'>;
}

export const Hex = Brand.nominal<CoinPublicKey.Hex>();

export const Bech32m = Brand.nominal<CoinPublicKey.Bech32m>();

export const make: (value: string) => CoinPublicKey = (value) => {
  return asHex(value);
};

export const asHex: (self: CoinPublicKey.Bech32m | string) => CoinPublicKey.Hex = (self) => {
  if (Bech32m.is(self)) {
    return /* convert */ Hex(self);
  }
  return Hex(self);
};

export const asBech32m: (self: CoinPublicKey.Hex | string) => CoinPublicKey.Bech32m = (self) => {
  if (Hex.is(self)) {
    return /* convert */ Bech32m(self);
  }
  return Bech32m(self);
};
