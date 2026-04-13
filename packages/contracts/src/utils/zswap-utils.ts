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

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type Recipient, type ZswapLocalState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type CoinPublicKey,
  type ContractAddress,
  type EncPublicKey,
  type QualifiedShieldedCoinInfo,
  type ShieldedCoinInfo,
  type UnprovenInput,
  type UnprovenOffer,
  type UnprovenOutput,
  type UnprovenTransient,
  type ZswapChainState,
  ZswapInput,
  ZswapOffer,
  ZswapOutput,
  ZswapTransient} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  assertDefined,
  assertIsContractAddress,
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex
} from '@midnight-ntwrk/midnight-js-utils';

// A default segment number to use when creating inputs and outputs. The Ledger has exposed this parameter
// now but we don't know what the value should be, and assume that everything first in segment '0'. This
// will change with work on Unshielded Tokens and I believe the Ledger will come with utility that will inform
// the segment numbers.
const DEFAULT_SEGMENT_NUMBER = 0;

/**
 * Resolves a CoinPublicKey to the corresponding EncPublicKey for output encryption.
 * Returns undefined if the key cannot be resolved.
 */
export type EncryptionPublicKeyResolver = (coinPublicKey: CoinPublicKey) => EncPublicKey | undefined;

/** Zero-initialized CoinPublicKey — the well-known shielded burn address from Compact's `shieldedBurnAddress()`. */
export const SHIELDED_BURN_COIN_PUBLIC_KEY: CoinPublicKey = '0'.repeat(64);

/**
 * Encryption key for burn outputs. Coins sent here are unspendable (null coin secret key),
 * so the specific key doesn't matter — but it must be a valid Jubjub curve point.
 * Derived via SHA-256("midnight:burn-encryption-key:{i}") with i=9 (first valid point).
 */
export const BURN_ENCRYPTION_PUBLIC_KEY: EncPublicKey = 'f5b9fa49d3c4f06582dab6ba45c85f6b1927873105b4c8cf363b9b57ca910f65';

/**
 * Creates a resolver that maps CoinPublicKey to EncPublicKey for output encryption.
 * Handles the wallet's own key, the well-known burn address, and optional additional mappings.
 */
export const createEncryptionPublicKeyResolver = (
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey,
  additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>
): EncryptionPublicKeyResolver => {
  const networkId = getNetworkId();
  const normalizedWalletCpk = parseCoinPublicKeyToHex(walletCoinPublicKey, networkId);
  const normalizedWalletEpk = parseEncPublicKeyToHex(walletEncryptionPublicKey, networkId);

  // Ensure additional mappings are normalized to hex as well, for consistent lookup.
  const normalizedAdditionalMappings = additionalCoinEncPublicKeyMappings
    ? new Map(
        Array.from(additionalCoinEncPublicKeyMappings, ([k, v]) => [
          parseCoinPublicKeyToHex(k, networkId),
          parseEncPublicKeyToHex(v, networkId)
        ])
      )
    : undefined;

  return (coinPublicKey: CoinPublicKey): EncPublicKey | undefined => {
    const normalizedCpk = parseCoinPublicKeyToHex(coinPublicKey, networkId);

    if (normalizedCpk === normalizedWalletCpk) {
      return normalizedWalletEpk;
    }

    if (normalizedCpk === SHIELDED_BURN_COIN_PUBLIC_KEY) {
      return BURN_ENCRYPTION_PUBLIC_KEY;
    }

    return normalizedAdditionalMappings?.get(normalizedCpk);
  };
};

export const checkKeys = (coinInfo: ShieldedCoinInfo): void =>
  Object.keys(coinInfo).forEach((key) => {
    if (key !== 'value' && key !== 'type' && key !== 'nonce') {
      throw new TypeError(`Key '${key}' should not be present in output data ${coinInfo}`);
    }
  });

export const serializeCoinInfo = (coinInfo: ShieldedCoinInfo): string => {
  checkKeys(coinInfo);
  return JSON.stringify({
    ...coinInfo,
    value: { __big_int_val__: coinInfo.value.toString() }
  });
};

export const serializeQualifiedShieldedCoinInfo = (coinInfo: QualifiedShieldedCoinInfo): string => {
  const { mt_index: _, ...rest } = coinInfo;
  return serializeCoinInfo(rest);
};

export const deserializeCoinInfo = (coinInfo: string): ShieldedCoinInfo => {
  const res = JSON.parse(coinInfo, (key: string, value: unknown) => {
    if (
      key === 'value' &&
      value != null &&
      typeof value === 'object' &&
      '__big_int_val__' in value &&
      typeof value.__big_int_val__ === 'string'
    ) {
      return BigInt(value.__big_int_val__);
    }
    return value;
  });
  checkKeys(res);
  return res;
};

export const createZswapOutput = (
  {
    coinInfo,
    recipient
  }: {
    coinInfo: ShieldedCoinInfo;
    recipient: Recipient;
  },
  encryptionPublicKeyResolver: EncryptionPublicKeyResolver,
  segmentNumber = 0
): UnprovenOutput => {
  if (!recipient.is_left) {
    return ZswapOutput.newContractOwned(coinInfo, segmentNumber, recipient.right);
  }
  const encryptionPublicKey = encryptionPublicKeyResolver(recipient.left);
  if (!encryptionPublicKey) {
    throw new Error(
      `Unable to resolve encryption public key for recipient ${recipient.left}. ` +
      `Provide a mapping via the encryptionPublicKeyResolver.`
    );
  }
  return ZswapOutput.new(coinInfo, segmentNumber, recipient.left, encryptionPublicKey);
};

const unprovenOfferFromCoinInfo = <U extends UnprovenInput | UnprovenOutput | UnprovenTransient>(
  [coinInfo, unproven]: [string, U],
  f: (u: U, type: string, value: bigint) => UnprovenOffer
): UnprovenOffer => {
  const { type, value } = deserializeCoinInfo(coinInfo);
  return f(unproven, type, value);
};

export const unprovenOfferFromMap = <U extends UnprovenInput | UnprovenOutput | UnprovenTransient>(
  map: Map<string, U>,
  f: (u: U, type: string, value: bigint) => UnprovenOffer
): UnprovenOffer | undefined => {
  if (map.size === 0) {
    return undefined;
  }

  const offers = Array.from(map, (entry) => unprovenOfferFromCoinInfo(entry, f));

  return offers.reduce((acc, curr) => acc.merge(curr));
};

export const zswapStateToOffer = (
  zswapLocalState: ZswapLocalState,
  encryptionPublicKeyOrResolver: EncPublicKey | EncryptionPublicKeyResolver,
  addressAndChainStateTuple?: { contractAddress: ContractAddress; zswapChainState: ZswapChainState }
): UnprovenOffer | undefined => {
  const resolver: EncryptionPublicKeyResolver =
    typeof encryptionPublicKeyOrResolver === 'function'
      ? encryptionPublicKeyOrResolver
      : () => encryptionPublicKeyOrResolver;

  const unprovenOutputs = new Map<string, UnprovenOutput>(
    zswapLocalState.outputs.map((output) => [
      serializeCoinInfo(output.coinInfo),
      createZswapOutput(output, resolver, DEFAULT_SEGMENT_NUMBER)
    ])
  );
  const unprovenInputs = new Map<string, UnprovenInput>();
  const unprovenTransients = new Map<string, UnprovenTransient>();
  const rehashedChainState = addressAndChainStateTuple?.zswapChainState.postBlockUpdate(new Date());
  zswapLocalState.inputs.forEach((qualifiedCoinInfo) => {
    const serializedCoinInfo =  serializeQualifiedShieldedCoinInfo(qualifiedCoinInfo);
    const unprovenOutput = unprovenOutputs.get(serializedCoinInfo);
    if (unprovenOutput) {
      unprovenTransients.set(
        serializedCoinInfo,
        ZswapTransient.newFromContractOwnedOutput(qualifiedCoinInfo, DEFAULT_SEGMENT_NUMBER, unprovenOutput)
      );
      unprovenOutputs.delete(serializedCoinInfo);
    } else {
      assertDefined(addressAndChainStateTuple, `Only outputs or transients are expected when no chain state is provided`);
      assertDefined(rehashedChainState, `Only outputs or transients are expected when no chain state is provided`);
      assertIsContractAddress(addressAndChainStateTuple.contractAddress);
      unprovenInputs.set(
        serializedCoinInfo,
        ZswapInput.newContractOwned(
          qualifiedCoinInfo,
          DEFAULT_SEGMENT_NUMBER,
          addressAndChainStateTuple.contractAddress,
          rehashedChainState
        )
      );
    }
  });

   const inputsOffer = unprovenOfferFromMap(unprovenInputs, ZswapOffer.fromInput);
   const outputsOffer = unprovenOfferFromMap(unprovenOutputs, ZswapOffer.fromOutput);
   const transientsOffer = unprovenOfferFromMap(unprovenTransients, ZswapOffer.fromTransient);

   const offers = [inputsOffer, outputsOffer, transientsOffer].filter(offer => offer != null);

   if (offers.length === 0) {
     return undefined;
   }

   if (offers.length === 1) {
     return offers[0];
   }

   return offers.reduce((acc, curr) => acc.merge(curr));
};

export const zswapStateToNewCoins = (receiverCoinPublicKey: CoinPublicKey, zswapState: ZswapLocalState): ShieldedCoinInfo[] =>
  zswapState.outputs
    .filter((output) => output.recipient.left === receiverCoinPublicKey)
    .map(({ coinInfo }) => coinInfo);

export const encryptionPublicKeyForZswapState = (
  zswapState: ZswapLocalState,
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey
): EncPublicKey => {
  const networkId = getNetworkId();
  const walletCoinPublicKeyLocal = parseCoinPublicKeyToHex(walletCoinPublicKey, networkId);
  const localCoinPublicKey = parseCoinPublicKeyToHex(zswapState.coinPublicKey, networkId);

  if (localCoinPublicKey !== walletCoinPublicKeyLocal) {
    throw new Error('Unable to lookup encryption public key (Unsupported coin)');
  }

  return parseEncPublicKeyToHex(walletEncryptionPublicKey, networkId);
};

/**
 * Creates an EncryptionPublicKeyResolver for a ZswapLocalState, validating that the
 * state's coin public key matches the wallet's. Handles the burn address and optional
 * additional recipient mappings.
 */
export const encryptionPublicKeyResolverForZswapState = (
  zswapState: ZswapLocalState,
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey,
  additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>
): EncryptionPublicKeyResolver => {
  const networkId = getNetworkId();
  const walletCpkHex = parseCoinPublicKeyToHex(walletCoinPublicKey, networkId);
  const localCpkHex = parseCoinPublicKeyToHex(zswapState.coinPublicKey, networkId);

  if (localCpkHex !== walletCpkHex) {
    throw new Error('Unable to lookup encryption public key (Unsupported coin)');
  }

  return createEncryptionPublicKeyResolver(
    walletCoinPublicKey,
    walletEncryptionPublicKey,
    additionalCoinEncPublicKeyMappings
  );
};
