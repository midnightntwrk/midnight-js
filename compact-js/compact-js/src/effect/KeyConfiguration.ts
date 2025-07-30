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

import { Effect, Context, Layer, Option, Config, Schema } from 'effect';
import * as CoinPublicKey from './CoinPublicKey';
import * as SigningKey from './SigningKey';

/**
 * Provides utilities for accessing keys.
 *
 * @category services
 */
export class KeyConfiguration extends Context.Tag('@midnight-ntwrk/compact-js/KeyConfiguration')<
  KeyConfiguration,
  KeyConfiguration.Service
>() {}

/**
 * @category config
 */
export const KeyConfig = Config.all([
  Schema.Config(
    'coinPublic',
    Schema.Union(
      Schema.String.pipe(Schema.fromBrand(CoinPublicKey.Hex)),
      Schema.String.pipe(Schema.fromBrand(CoinPublicKey.Bech32m))
    )
  ),
  Config.option(Schema.Config('signing', Schema.String.pipe(Schema.fromBrand(SigningKey.SigningKey))))
]).pipe(Config.nested('keys'));

export declare namespace KeyConfiguration {
  export interface Service {
    /**
     * Gets the current user's Zswap public key.
     *
     * @category keys
     */
    readonly coinPublicKey: CoinPublicKey.CoinPublicKey;

    /**
     * Gets a signing key.
     *
     * @remarks
     * A signing key is required when creating Contract Maintenance Authority (CMA) instances when initializing
     * new contracts. If `Option.None` is returned, then a new singing key is sampled and used for the CMA
     * instead. Returning the same signing key is useful when that key is to be used to maintain multiple contracts.
     *
     * @category keys
     */
    getSigningKey(): Option.Option<SigningKey.SigningKey>;
  }
}

/**
 * A default {@link KeyConfiguration} implementation that retrieves keys from a configuration provider over
 * {@link KeyConfig}.
 *
 * @category layers
 */
export const layer = Layer.effect(
  KeyConfiguration,
  Effect.gen(function* () {
    const [coinPublic, signing] = yield* KeyConfig;

    return KeyConfiguration.of({
      coinPublicKey: coinPublic,
      getSigningKey: () => signing
    });
  })
);
