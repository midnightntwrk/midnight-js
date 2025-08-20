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

import { type Recipient, type ZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import {
  type CoinPublicKey,
  type ContractAddress,
  type EncPublicKey,
  type QualifiedShieldedCoinInfo,
  type ShieldedCoinInfo,
  type ZswapChainState,
} from '@midnight-ntwrk/ledger';
import { ZswapInput, ZswapOffer, ZswapOutput, ZswapTransient } from '@midnight-ntwrk/ledger';
import { getLedgerNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type UnprovenInput,
  type UnprovenOffer,
  type UnprovenOutput,
  type UnprovenTransient
} from '@midnight-ntwrk/midnight-js-types';
import {
  assertDefined,
  assertIsContractAddress,
  fromHex,
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex
} from '@midnight-ntwrk/midnight-js-utils';

// A default segment number to use when creating inputs and outputs. The Ledger has exposed this parameter
// now but we don't know what the value should be, and assume that everything first in segment '0'. This
// will change with work on Unshielded Tokens and I believe the Ledger will come with utility that will inform
// the segment numbers.
const DEFAULT_SEGMENT_NUMBER = 0;

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
    if (
      (key === 'color' || key === 'nonce') &&
      value != null &&
      typeof value === 'object' &&
      '__uint8Array_val__' in value &&

      typeof value.__uint8Array_val__ === 'string'
    ) {

      return fromHex(value.__uint8Array_val__);
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
  encryptionPublicKey: EncPublicKey,
  segmentNumber = 0
): UnprovenOutput =>
  // TBD need to confirm segment number and wallet encryptionPublicKey usage.
  recipient.is_left
    ? ZswapOutput.new(coinInfo, segmentNumber, recipient.left, encryptionPublicKey)
    : ZswapOutput.newContractOwned(coinInfo, segmentNumber, recipient.right);

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

  const offers = Array.from(map, (entry) => unprovenOfferFromCoinInfo(entry, f)).filter((offer) => offer != null);

  if (offers.length === 0) {
    return undefined;
  }

  return offers.reduce((acc, curr) => acc.merge(curr));
};

export const zswapStateToOffer = (
  zswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey,
  params?: { contractAddress: ContractAddress; zswapChainState: ZswapChainState }
): UnprovenOffer | undefined => {
  const unprovenOutputs = new Map<string, UnprovenOutput>(
    zswapLocalState.outputs.map((output) => [
      serializeCoinInfo(output.coinInfo),
      createZswapOutput(output, encryptionPublicKey, DEFAULT_SEGMENT_NUMBER)
    ])
  );
  const unprovenInputs = new Map<string, UnprovenInput>();
  const unprovenTransients = new Map<string, UnprovenTransient>();
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
      assertDefined(params, `Only outputs or transients are expected when no chain state is provided`);
      assertIsContractAddress(params.contractAddress);
      unprovenInputs.set(
        serializedCoinInfo,
        ZswapInput.newContractOwned(
          qualifiedCoinInfo,
          DEFAULT_SEGMENT_NUMBER,
          params.contractAddress,
          params.zswapChainState
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
  const networkId = getLedgerNetworkId();
  const walletCoinPublicKeyLocal = parseCoinPublicKeyToHex(walletCoinPublicKey, networkId);
  const localCoinPublicKey = parseCoinPublicKeyToHex(zswapState.coinPublicKey, networkId);

  if (localCoinPublicKey !== walletCoinPublicKeyLocal) {
    throw new Error('Unable to lookup encryption public key (Unsupported coin)');
  }

  return parseEncPublicKeyToHex(walletEncryptionPublicKey, networkId);
};
