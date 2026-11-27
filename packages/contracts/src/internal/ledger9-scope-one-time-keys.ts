/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { InvalidArgumentError } from '@midnightntwrk/midnight-js-protocol/errors';
import { type CoinPublicKey, type EncPublicKey, type ZswapSecretKeys } from '@midnightntwrk/midnight-js-protocol/v9';
import { type NetworkId } from '@midnightntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '@midnightntwrk/midnight-js-utils';

/**
 * @internal The one-time keys a ledger 9 scope was given, with the coin public key of the wallet
 * the scope was opened with.
 */
export interface OneTimeKeys {
  readonly keys: ZswapSecretKeys;
  readonly scopeWalletCoinPublicKey: CoinPublicKey;
}

/**
 * Refuses one-time keys whose coin public key is a wallet's: the coins they spend again would be
 * the wallet's own. Both sides are compared in hex, so a key given in Bech32m is found too.
 */
const assertNotWalletKeys = (
  keyHex: string,
  networkId: NetworkId,
  walletCoinPublicKeys: readonly CoinPublicKey[]
): void => {
  if (walletCoinPublicKeys.some((walletKey) => parseCoinPublicKeyToHex(walletKey, networkId) === keyHex)) {
    throw new InvalidArgumentError(
      "The one-time keys given in 'spentHere' are a wallet's own, the wallet of the scope or of one of its " +
        'calls. Give keys made for this transaction alone.'
    );
  }
};

/**
 * The mapping of the one-time keys' coin public key to their own encryption public key, in hex, which
 * the scope adds to the mappings its coins are encrypted with, since it holds the keys. A mapping
 * given that maps their coin public key elsewhere is refused where every mapping is merged.
 *
 * @internal
 * @param oneTime The one-time keys and the scope's wallet key.
 * @param networkId The network keys given in Bech32m are read for.
 * @param callWalletCoinPublicKeys The coin public key of the wallet of each call of the scope.
 * @throws InvalidArgumentError if the keys are the scope's wallet's or a call's wallet's.
 */
export const oneTimeKeyMapping = (
  { keys, scopeWalletCoinPublicKey }: OneTimeKeys,
  networkId: NetworkId,
  callWalletCoinPublicKeys: readonly CoinPublicKey[]
): ReadonlyMap<CoinPublicKey, EncPublicKey> => {
  const keyHex = parseCoinPublicKeyToHex(keys.coinPublicKey, networkId);
  assertNotWalletKeys(keyHex, networkId, [scopeWalletCoinPublicKey, ...callWalletCoinPublicKeys]);
  return new Map([[keyHex, parseEncPublicKeyToHex(keys.encryptionPublicKey, networkId)]]);
};
