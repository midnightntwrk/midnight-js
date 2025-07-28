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
import { CoinPublicKey as CoinPubliicKey_, SigningKey } from '@midnight-ntwrk/compact-runtime';
import * as CoinPublicKey from './CoinPublicKey';

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
  Config.option(Schema.Config('signing', Schema.String))
]).pipe(Config.nested('keys'));

export declare namespace KeyConfiguration {
  export interface Service {
    /**
     * Retrieves the current user's ZSwap public key.
     */
    coinPublicKey(): CoinPublicKey.CoinPublicKey;

    /**
     * Retrieves a signing key.
     *
     * @remarks
     * A signing key is used to create a Contract Maintenance Authority (CMA) when initializing a new contract.
     * It is used to create a verifying key that is included in the contract deployment data that will
     * eventually be stored on the Midnight network.
     *
     * If `Option.None` is returned, a new singing key is sampled and used for the CMA instead. Returning the same
     * signing key is useful when that key is to be used to maintain different contracts.
     */
    signingKey(): Option.Option<SigningKey>;
  }
}

/**
 * A default {@link KeyConfiguration} implementation that retrieves keys from a configuration provider over
 * {@link KeyConfig}.
 *
 * @category layers
 */
export const live = Layer.effect(
  KeyConfiguration,
  Effect.gen(function* () {
    const [coinPublic, signing] = yield* KeyConfig;

    return KeyConfiguration.of({
      coinPublicKey: () => coinPublic,
      signingKey: () => signing
    });
  })
);
