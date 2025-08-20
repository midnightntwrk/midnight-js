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

import { fc } from '@fast-check/vitest';
import { type Recipient } from '@midnight-ntwrk/compact-runtime';
import { type CoinPublicKey, type QualifiedShieldedCoinInfo, type ShieldedCoinInfo, shieldedToken } from '@midnight-ntwrk/ledger';
import {
  createShieldedCoinInfo,
  nativeToken,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleRawTokenType,
  Transaction,
  ZswapChainState,
  ZswapOffer} from '@midnight-ntwrk/ledger';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';

import {
  createZswapOutput,
  deserializeCoinInfo,
  serializeCoinInfo,
  serializeQualifiedShieldedCoinInfo,
  zswapStateToNewCoins,
  zswapStateToOffer
} from '../../utils';

const arbitraryBytes = fc.uint8Array({ minLength: 32, maxLength: 32 });

const arbitraryValue = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

const arbitraryNativeCoinInfo = arbitraryValue.map((value) => createShieldedCoinInfo(nativeToken().raw, value));

const arbitraryHex = arbitraryBytes.map(toHex);

const arbitraryCoinPublicKey = fc.boolean().map(() => sampleCoinPublicKey());

const arbitraryContractAddress = fc.boolean().map(() => sampleContractAddress());

const arbitraryTokenType = fc.boolean().map(() => sampleRawTokenType());

const arbitraryCoinInfo = fc
  .tuple(arbitraryTokenType, arbitraryValue)
  .map(([tokenType, value]) => createShieldedCoinInfo(tokenType, value));

const arbitraryQualifiedShieldedCoinInfo = fc.record({
  mt_index: arbitraryValue,
  type: arbitraryTokenType,
  nonce: arbitraryHex,
  value: arbitraryValue
});

const arbitraryContractRecipient = fc.record({
  is_left: fc.constant(false),
  left: arbitraryCoinPublicKey,
  right: arbitraryContractAddress
});

const sampleOne = <T>(arbitrary: fc.Arbitrary<T>): T => fc.sample(arbitrary, 1)[0]!;

const arbitraryNonContractRecipient = fc.record({
  is_left: fc.constant(true),
  left: arbitraryCoinPublicKey,
  right: arbitraryContractAddress
});

const arbitraryRecipient = fc.oneof(arbitraryContractRecipient, arbitraryNonContractRecipient);

const randomOutputData = () =>
  sampleOne(
    fc.record({
      coinInfo: arbitraryCoinInfo,
      recipient: arbitraryNonContractRecipient
    })
  );

const randomQualifiedShieldedCoinInfo = () => sampleOne(arbitraryQualifiedShieldedCoinInfo);

const randomEncryptionPublicKey = () => sampleOne(arbitraryHex);

const randomCoinPublicKey = () => sampleOne(arbitraryCoinPublicKey);


const dropMtIndex = ({ mt_index: _, ...coin }: QualifiedShieldedCoinInfo) => coin;

const toOutputData = (recipient: Recipient, coinInfos: (QualifiedShieldedCoinInfo | ShieldedCoinInfo)[]) =>
  coinInfos.map((coinInfo) =>
    'mt_index' in coinInfo ? { recipient, coinInfo: dropMtIndex(coinInfo) } : { recipient, coinInfo }
  );

const distinctFrom = (coinInfos: (ShieldedCoinInfo | QualifiedShieldedCoinInfo)[]) => {
  const set = new Set(coinInfos.map(({ nonce }) => nonce));
  return (coinInfo: ShieldedCoinInfo) => !set.has(coinInfo.nonce);
};

const withZeroMtIndex = (coinInfos: ShieldedCoinInfo[]): QualifiedShieldedCoinInfo[] =>
  coinInfos.map((coin) => ({ ...coin, mt_index: 0n }));

describe('Zswap utilities', () => {
  test("instanceOf works on 'Uint8Array' and 'Buffer'", () => {
    expect(randomBytes(32) instanceof Uint8Array).toBe(true);
    expect(randomBytes(32) instanceof Buffer).toBe(true);
    expect(randomBytes(32).valueOf() instanceof Uint8Array).toBe(true);
    expect(randomBytes(32).valueOf() instanceof Buffer).toBe(true);
  });

  test("attempting to serialize a 'CoinInfo' with additional properties throws an error", () =>
    expect(() =>
      serializeCoinInfo({
        nonce: toHex(randomBytes(32)),
        type: toHex(randomBytes(32)),
        value: 0n,
        hello: 'darkness'
      } as ShieldedCoinInfo)
    ).toThrowError());

  test("attempting to deserialize a string representing a 'CoinInfo' with additional properties throws an error", () =>
    expect(() =>
      deserializeCoinInfo(
        JSON.stringify({
          value: { __big_int_val__: 0n.toString() },
          nonce: { __uint8Array_val__: toHex(randomBytes(32)) },
          color: { __uint8Array_val__: toHex(randomBytes(32)) },
          old: 'friend'
        })
      )
    ).toThrowError());

  test("serializing then deserializing 'CoinInfo' produces the original value", () =>
    fc.assert(
      fc.property(arbitraryCoinInfo, (coinInfo) => {
        expect(deserializeCoinInfo(serializeCoinInfo(coinInfo))).toEqual(coinInfo);
      })
    ));

  test("serializing 'QualifiedShieldedCoinInfo' then deserializing 'CoinInfo' produces the original value without 'mt_index'", () =>
    fc.assert(
      fc.property(arbitraryQualifiedShieldedCoinInfo, (qualifiedCoinInfo) => {
        expect(deserializeCoinInfo(serializeQualifiedShieldedCoinInfo(qualifiedCoinInfo))).toEqual(
          dropMtIndex(qualifiedCoinInfo)
        );
      })
    ));

  test("'QualifiedShieldedCoinInfo' and extracted 'CoinInfo' serialized strings are equal", () =>
    fc.assert(
      fc.property(arbitraryQualifiedShieldedCoinInfo, (qualifiedCoinInfo) => {
        expect(serializeCoinInfo(dropMtIndex(qualifiedCoinInfo))).toEqual(
          serializeQualifiedShieldedCoinInfo(qualifiedCoinInfo)
        );
      })
    ));

  test("Calling 'zswapStateToOffer' with no chain state and inputs throws error", () =>
    expect(() =>
      zswapStateToOffer(
        {
          currentIndex: 0n,
          coinPublicKey: randomCoinPublicKey(),
          inputs: [randomQualifiedShieldedCoinInfo()],
          outputs: [randomOutputData()]
        },
        randomEncryptionPublicKey()
      )
    ).toThrowError());

  const sum = (bs: (ShieldedCoinInfo | { recipient: Recipient; coinInfo: ShieldedCoinInfo })[]): bigint =>
    bs.reduce((prev, curr) => {
      if (typeof curr === 'object' && 'recipient' in curr && 'coinInfo' in curr) {
        return prev + curr.coinInfo.value;
      }
      return prev + curr.value;
    }, 0n);

  const zswapChainStateWithNonMatchingInputs = (recipient: Recipient, values: bigint[]) => {
    const nonMatchingInputs: QualifiedShieldedCoinInfo[] = [];
    const zswapChainState = values.reduce((prevZSwapChainState, value) => {
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, value);
      const output = createZswapOutput({ coinInfo, recipient }, randomEncryptionPublicKey());
      const proofErasedOffer = Transaction.fromParts(
        ZswapOffer.fromOutput(output, nativeToken().raw, value)
      ).eraseProofs().guaranteedOffer;
      if (proofErasedOffer) {
        const [newZswapChainState, mtIndices] = prevZSwapChainState.tryApply(proofErasedOffer);
        nonMatchingInputs.push({ ...coinInfo, mt_index: mtIndices.get(output.commitment)! });
        return newZswapChainState;
      }
      return prevZSwapChainState;
    }, new ZswapChainState());
    return { zswapChainState, nonMatchingInputs };
  };

  const arbitraryMatchingInputOutputPairs = (
    recipient: Recipient,
    preExistingCoins: (QualifiedShieldedCoinInfo | ShieldedCoinInfo)[]
  ): fc.Arbitrary<[QualifiedShieldedCoinInfo[], { recipient: Recipient; coinInfo: ShieldedCoinInfo }[]]> =>
    fc.array(arbitraryNativeCoinInfo.filter(distinctFrom(preExistingCoins))).map((matchingOutputsNoRecipient) => [
      withZeroMtIndex(matchingOutputsNoRecipient), // matching inputs
      toOutputData(recipient, matchingOutputsNoRecipient) // matching outputs
    ]);

  // Helper types for better readability
  type ZswapScenarioData = {
    zswapChainState: ZswapChainState;
    expectedInputCount: number;
    expectedInputsSum: bigint;
    expectedOutputCount: number;
    expectedOutputsSum: bigint;
    expectedTransientCount: number;
    zswapState: {
      currentIndex: bigint;
      coinPublicKey: CoinPublicKey;
      inputs: QualifiedShieldedCoinInfo[];
      outputs: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[];
    };
    params?: {
      contractAddress: CoinPublicKey;
      zswapChainState: ZswapChainState;
    };
  };

  const createZswapScenarioData = (
    recipient: Recipient,
    values: bigint[],
    nonMatchingOutputsNoRecipient: ShieldedCoinInfo[],
    matchingInputs: QualifiedShieldedCoinInfo[],
    matchingOutputs: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[],
    useParams: boolean,
    zswapChainState: ZswapChainState,
    nonMatchingInputs: QualifiedShieldedCoinInfo[]
  ): ZswapScenarioData => {
    const nonMatchingOutputs = toOutputData(recipient, nonMatchingOutputsNoRecipient);

    return {
      zswapChainState,
      expectedInputCount: useParams ? nonMatchingInputs.length : 0,
      expectedInputsSum: useParams ? sum(nonMatchingInputs) : 0n,
      expectedOutputCount: nonMatchingOutputsNoRecipient.length,
      expectedOutputsSum: sum(nonMatchingOutputs),
      expectedTransientCount: matchingOutputs.length,
      zswapState: {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: useParams ? nonMatchingInputs.concat(matchingInputs) : matchingInputs,
        outputs: nonMatchingOutputs.concat(matchingOutputs)
      },
      params: useParams
        ? {
            contractAddress: recipient.right,
            zswapChainState
          }
        : undefined
    };
  };

  const arbitraryZswapScenario: fc.Arbitrary<ZswapScenarioData> = fc
    // TODO: Generalize to arbitrary recipients to capture scenarios where no inputs are created.
    .tuple(arbitraryContractRecipient, fc.array(arbitraryValue))
    .chain(([recipient, values]) => {
      const { nonMatchingInputs, zswapChainState } = zswapChainStateWithNonMatchingInputs(recipient, values);

      return fc
        .array(arbitraryNativeCoinInfo.filter(distinctFrom(nonMatchingInputs)))
        .chain((nonMatchingOutputsNoRecipient) =>
          arbitraryMatchingInputOutputPairs(recipient, nonMatchingOutputsNoRecipient.concat(nonMatchingInputs))
            .chain(([matchingInputs, matchingOutputs]) =>
              fc.boolean().map((useParams) =>
                createZswapScenarioData(
                  recipient,
                  values,
                  nonMatchingOutputsNoRecipient,
                  matchingInputs,
                  matchingOutputs,
                  useParams,
                  zswapChainState,
                  nonMatchingInputs
                )
              )
            )
        );
    });

  test('expected number of inputs, outputs, and transients are created', () =>
    fc.assert(
      fc.property(
        arbitraryZswapScenario,
        ({
          expectedInputCount, // number of inputs expected to be produced
          expectedInputsSum, // sum of the value of all expected inputs produced
          expectedOutputCount, // number of outputs expected to be produced
          expectedOutputsSum, // sum of the value of all expected outputs produced
          expectedTransientCount, // number of transients expected to be produced
          zswapState, // state of zswap witnesses consistent with the above data
          params
        }) => {
          const unprovenOffer = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), params);

          if (unprovenOffer) {
            expect(unprovenOffer.outputs.length).toBe(expectedOutputCount);
            expect(unprovenOffer.inputs.length).toBe(expectedInputCount);
            expect(unprovenOffer.transients.length).toBe(expectedTransientCount);

            const delta = unprovenOffer.deltas.get(nativeToken().raw);
            if (params) {
              const expectedDelta = expectedInputsSum - expectedOutputsSum;
              if (expectedInputCount > 0 && expectedOutputCount > 0 && expectedDelta !== 0n) {
                expect(delta).toBe(expectedDelta);
              } else if (expectedInputCount > 0 && expectedInputsSum !== 0n) {
                expect(delta).toBe(expectedInputsSum);
              } else if (expectedOutputCount > 0 && expectedOutputsSum !== 0n) {
                expect(delta).toBe(-expectedOutputsSum);
              } else {
                expect(delta).toBeUndefined();
              }
            } else if (expectedOutputCount > 0) {
              expect(delta).toBe(-expectedOutputsSum);
            } else {
              expect(delta).toBeUndefined();
            }
          } else {
            expect(expectedInputCount).toBe(0);
            expect(expectedOutputCount).toBe(0);
            expect(expectedTransientCount).toBe(0);
          }
        }
      )
    ));

  test('zswapStateToNewCoins returns only coins meant for provided wallet', () => {
    type ScenarioData = {
      walletCoinPublicKey: CoinPublicKey;
      outputsForWallet: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[];
      outputsNotForWallet: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[];
    }
    const arbitraryScenario = arbitraryCoinPublicKey.chain((walletCoinPublicKey) =>
      fc.record<ScenarioData>({
        walletCoinPublicKey: fc.constant(walletCoinPublicKey),
        outputsForWallet: fc.array(arbitraryCoinInfo).map((coins) =>
          coins.map((coinInfo) => ({
            coinInfo,
            recipient: {
              is_left: true,
              left: walletCoinPublicKey,
              right: sampleContractAddress()
            }
          }))
        ),
        outputsNotForWallet: fc
          .array(fc.tuple(arbitraryCoinInfo, arbitraryRecipient))
          .map((coinsAndRecipients) => coinsAndRecipients.map(([coinInfo, recipient]) => ({ coinInfo, recipient })))
      })
    );

    fc.assert(
      fc.property(arbitraryScenario, (data) => {
        const zswapState = {
          currentIndex: 0n,
          coinPublicKey: data.walletCoinPublicKey,
          inputs: [],
          outputs: [...data.outputsForWallet, ...data.outputsNotForWallet]
        };
        const newCoins = zswapStateToNewCoins(data.walletCoinPublicKey, zswapState);
        const expected = data.outputsForWallet.map((output) => output.coinInfo);
        expect(newCoins).toEqual(expected);
      })
    );
  });
});
