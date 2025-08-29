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

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Context from 'effect/Context';
import * as Config from 'effect/Config';
import * as Schema from 'effect/Schema';
import * as Layer from 'effect/Layer';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as SigningKey from './SigningKey.js';
import * as CoinPublicKey from './CoinPublicKey.js';
import * as NetworkId from './NetworkId.js';
import { type ConfigError } from 'effect/ConfigError';
import { identity } from 'effect';

/**
 * Provides accessors for retrieving configured keys.
 *
 * @category services
 */
export class Keys extends Context.Tag('@midnight-ntwrk/platform-js/Configuration#Keys')<
  Keys,
  Configuration.Keys
>() {}

/**
 * Provides an accessor for retrieving the configured {@link NetworkId.NetworkId | NetworkId}.
 *
 * @category services
 */
export class Network extends Context.Tag('@midnight-ntwrk/platform-js/Configuration#Network')<
  Network,
  NetworkId.NetworkId
>() {}

export declare namespace Configuration {
  /**
   * Accessors for retrieving keys.
   */
  export interface Keys {
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

const KeysConfig = Config.all([
  Schema.Config(
    'coinPublic',
    Schema.Union(
      Schema.String.pipe(Schema.fromBrand(CoinPublicKey.Hex)),
      Schema.String.pipe(Schema.fromBrand(CoinPublicKey.Bech32m))
    )
  ),
  Config.option(Schema.Config('signing', Schema.String.pipe(Schema.fromBrand(SigningKey.SigningKey))))
]).pipe(Config.nested('keys'));

const NetworkIdConfig = Config.option(Schema.Config('network', Schema.String));

const makeKeys: () => Layer.Layer<Keys, ConfigError>
  = () => Layer.effect(Keys, Effect.gen(function* () {
    const [coinPublic, signing] = yield* KeysConfig;

    return Keys.of({
      coinPublicKey: coinPublic,
      getSigningKey: () => signing
    });
  }));

const makeNetwork: () => Layer.Layer<Network, ConfigError>
  = () => Layer.effect(Network, Effect.gen(function* () {
    return Network.of(
        NetworkId.make(Option.match(yield* NetworkIdConfig, {
        onSome: identity,
        onNone: () => NetworkId.MainNet
      }))
    );
  }));

/**
 * Creates a platform independent configuration provider,
 *
 * @param json A JSON object from which configuration values can be read.
 * @returns A `ConfigProvider` that defaults to values present in `json`, but allows them to be overridden
 * via environment variables.
 * 
 * @category constructors
 */
export const configProvider: (json: unknown) => ConfigProvider.ConfigProvider
  = (json) => ConfigProvider.fromEnv({ pathDelim: '_'}).pipe(
    ConfigProvider.constantCase,
    ConfigProvider.orElse(() => ConfigProvider.fromJson(json))
  );

/**
 * A default layer that provides a collection of services that provide accessors, that in turn, access underlying
 * configured values.
 *
 * @see {@link Keys}
 * @see {@link Network}
 * 
 * @category layers
 */
export const layer = Layer.mergeAll(makeKeys(), makeNetwork());
