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

import { type Command, Options } from '@effect/cli';
import { Path } from '@effect/platform';
import * as CoinPublicKey from '@midnight-ntwrk/platform-js/effect/CoinPublicKey';
import * as SigningKey from '@midnight-ntwrk/platform-js/effect/SigningKey';
import { ConfigProvider, Effect, Option,Schema } from 'effect';

/** @internal */
export const config = Options.file('config', { exists: 'either' }).pipe(
  Options.withAlias('c'),
  Options.withDefault('contract.config.ts'),
  Options.mapEffect((filePath) => Path.Path.pipe(Effect.map((path) => path.resolve(filePath))))
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
export const outputFilePath = Options.file('output', { exists: 'either' }).pipe(
  Options.withAlias('o'),
  Options.withDescription('A file path of where the generated \'Intent\' data should be written.'),
  Options.withDefault('output.bin'),
  Options.mapEffect((filePath) => Path.Path.pipe(Effect.map((path) => path.resolve(filePath))))
);

/** @internal */
export const outputPrivateStateFilePath = Options.file('output-ps', { exists: 'either' }).pipe(
  Options.withDescription('A file path of where the generated \'PrivateState\' data should be written.'),
  Options.withDefault('output.ps.json'),
  Options.mapEffect((filePath) => Path.Path.pipe(Effect.map((path) => path.resolve(filePath))))
);

/** @internal */
export const outputZswapLocalStateFilePath = Options.file('output-zswap', { exists: 'either' }).pipe(
  Options.withDescription('A file path of where the generated \'ZswapLocalState\' data should be written.'),
  Options.withDefault('zswap.json'),
  Options.mapEffect((filePath) => Path.Path.pipe(Effect.map((path) => path.resolve(filePath))))
);

/** @internal */
export const network = Options.text('network').pipe(
  Options.withAlias('n'),
  Options.withDescription('Optional network identifier. Defaults to the Midnight \'MainNet\' if not specified.'),
  Options.optional
);

/** @internal */
export const stateFilePath = Options.file('state-file-path', { exists: 'either' }).pipe(
  Options.withDescription('A file path of where the current onchain (or ledger), state data can be read.'),
  Options.mapEffect((filePath) => Path.Path.pipe(Effect.map((path) => path.resolve(filePath))))
);

/** @internal */
export const privateStateFilePath = Options.file('ps-state-file-path', { exists: 'either' }).pipe(
  Options.withDescription('A file path of where the current private state data can be read.'),
  Options.mapEffect((filePath) => Path.Path.pipe(Effect.map((path) => path.resolve(filePath))))
);

/** @internal */
export const zswapLocalStateFilePath = Options.file('zswap-state-file-path', { exists: 'either' }).pipe(
  Options.withDescription('A file path of where the current Zswap local state data can be read.'),
  Options.optional,
  Options.mapEffect((_) => Option.match(_, {
    onSome: (filePath) => Path.Path.pipe(Effect.map((path) => Option.some(path.resolve(filePath)))),
    onNone: () => Effect.succeed(Option.none())
  }))
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

export const asConfigProvider: (configurableOptions: Partial<AllConfigurableOptionInputs>) => ConfigProvider.ConfigProvider =
  (configurableOptions) => ConfigProvider.fromJson({
    keys: {
      coinPublic: Option.getOrUndefined(configurableOptions.coinPublicKey ?? Option.none()),
      signing: Option.getOrUndefined(configurableOptions.signingKey ?? Option.none())
    },
    network: Option.getOrUndefined(configurableOptions.network ?? Option.none())
  });
