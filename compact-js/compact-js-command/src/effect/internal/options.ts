/*
 * This file is part of midnight-js.
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

import { Effect, ConfigProvider, Schema, Option } from 'effect';
import { type Command, Options } from '@effect/cli';
import * as CoinPublicKey from '@midnight-ntwrk/platform-js/effect/CoinPublicKey';
import * as SigningKey from '@midnight-ntwrk/platform-js/effect/SigningKey';
import { Path } from '@effect/platform';

/** @internal */
export const config = Options.file('config').pipe(
  Options.withAlias('c'),
  Options.optional
);

/** @internal */
export const coinPublicKey = Options.text('coin-public').pipe(
  Options.withAlias('p'),
  Options.withDescription('A user public key capable of receiving Zswap coins, hex or Bech32m encoded.'),
  Options.withSchema(Schema.Union(
    Schema.String.pipe(Schema.fromBrand(CoinPublicKey.Hex)),
    Schema.String.pipe(Schema.fromBrand(CoinPublicKey.Bech32m))
  )),
  Options.optional
);

/** @internal */
export const signingKey = Options.text('signing').pipe(
  Options.withAlias('s'),
  Options.withDescription('A public BIP-340 signing key, hex encoded.'),
  Options.withSchema(Schema.String.pipe(Schema.fromBrand(SigningKey.SigningKey))),
  Options.optional
);

/** @internal */
export const outputFilePath = Options.file('output').pipe(
  Options.withAlias('o'),
  Options.withDescription('A file path of where the generated \'Intent\' data should be written.'),
  Options.withDefault('output.bin')
);

/** @internal */
export const outputPrivateStateFilePath = Options.file('output-ps').pipe(
  Options.withDescription('A file path of where the generated \'PrivateState\' data should be written.'),
  Options.withDefault('output.ps.json')
);

/** @internal */
export const network = Options.text('network').pipe(
  Options.withAlias('n'),
  Options.withDescription('Optional network identifier. Defaults to the Midnight \'MainNet\' if not specified.'),
  Options.optional
);

/** @internal */
export const stateFilePath = Options.file('state-file-path').pipe(
  Options.withDescription('A file path of where the current onchain (or ledger), state data can be read.')
);

/** @internal */
export const privateStateFilePath = Options.file('ps-state-file-path').pipe(
  Options.withDescription('A file path of where the current private state data can be read.')
);

export type ConfigOptionInput = Command.Command.ParseConfig<{
  config: typeof config;
}>;

/**
 * All the options that contribute to the underlying `ConfigurationProvider`.
 *
 * @see {@link asConfigProvider}
 * @internal
 */
export type AllConfigurableOptionInputs = Command.Command.ParseConfig<{
  coinPublicKey: typeof coinPublicKey,
  signingKey: typeof signingKey,
  network: typeof network
}>;

const DEFAULT_CONFIG_FILENAME = 'contract.config.ts';

export const getConfigFilePath: (optionInputs: ConfigOptionInput) => Effect.Effect<string, never, Path.Path> =
  ({ config }) => Option.match(config, { // eslint-disable-line @typescript-eslint/no-shadow
    onSome: (cfg) => Effect.succeed(cfg),
    onNone: () => Path.Path.pipe(Effect.map((path) => path.resolve(DEFAULT_CONFIG_FILENAME)))
  });

export const asConfigProvider: (optionInputs: Partial<AllConfigurableOptionInputs>) => ConfigProvider.ConfigProvider =
  (optionInputs) => ConfigProvider.fromJson({
    keys: {
      coinPublic: Option.getOrUndefined(optionInputs.coinPublicKey ?? Option.none()),
      signing: Option.getOrUndefined(optionInputs.signingKey ?? Option.none())
    },
    network: Option.getOrUndefined(optionInputs.network ?? Option.none())
  });
