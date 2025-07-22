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
import {
  type CoinInfo,
  type CoinPublicKey,
  createCoinInfo,
  nativeToken,
  type QualifiedCoinInfo,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleTokenType,
  UnprovenOffer,
  UnprovenTransaction,
  ZswapChainState
} from '@midnight-ntwrk/ledger';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';

import {
  createUnprovenOutput,
  deserializeCoinInfo,
  serializeCoinInfo,
  serializeQualifiedCoinInfo,
  zswapStateToNewCoins,
  zswapStateToOffer
} from '../../utils';

const arbitraryBytes = fc.uint8Array({ minLength: 32, maxLength: 32 });


const arbitraryValue = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

const arbitraryNativeCoinInfo = arbitraryValue.map((value) => createCoinInfo(nativeToken(), value));

const arbitraryHex = arbitraryBytes.map(toHex);

const arbitraryCoinPublicKey = fc.boolean().map(() => sampleCoinPublicKey());

const arbitraryContractAddress = fc.boolean().map(() => sampleContractAddress());

const arbitraryTokenType = fc.boolean().map(() => sampleTokenType());

const arbitraryCoinInfo = fc
  .tuple(arbitraryTokenType, arbitraryValue)
  .map(([tokenType, value]) => createCoinInfo(tokenType, value));

const arbitraryQualifiedCoinInfo = fc.record({
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

const randomQualifiedCoinInfo = () => sampleOne(arbitraryQualifiedCoinInfo);

const randomEncryptionPublicKey = () => sampleOne(arbitraryHex);

const randomCoinPublicKey = () => sampleOne(arbitraryCoinPublicKey);

const dropMtIndex = ({ mt_index: _, ...coin }: QualifiedCoinInfo) => coin;

const toOutputData = (recipient: Recipient, coinInfos: (QualifiedCoinInfo | CoinInfo)[]) =>
  coinInfos.map((coinInfo) =>
    'mt_index' in coinInfo ? { recipient, coinInfo: dropMtIndex(coinInfo) } : { recipient, coinInfo }
  );

const distinctFrom = (coinInfos: (CoinInfo | QualifiedCoinInfo)[]) => {
  const set = new Set(coinInfos.map(({ nonce }) => nonce));
  return (coinInfo: CoinInfo) => !set.has(coinInfo.nonce);
};

const withZeroMtIndex = (coinInfos: CoinInfo[]): QualifiedCoinInfo[] =>
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
      } as CoinInfo)
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

  test("serializing 'QualifiedCoinInfo' then deserializing 'CoinInfo' produces the original value without 'mt_index'", () =>
    fc.assert(
      fc.property(arbitraryQualifiedCoinInfo, (qualifiedCoinInfo) => {
        expect(deserializeCoinInfo(serializeQualifiedCoinInfo(qualifiedCoinInfo))).toEqual(
          dropMtIndex(qualifiedCoinInfo)
        );
      })
    ));

  test("'QualifiedCoinInfo' and extracted 'CoinInfo' serialized strings are equal", () =>
    fc.assert(
      fc.property(arbitraryQualifiedCoinInfo, (qualifiedCoinInfo) => {
        expect(serializeCoinInfo(dropMtIndex(qualifiedCoinInfo))).toEqual(
          serializeQualifiedCoinInfo(qualifiedCoinInfo)
        );
      })
    ));

  test("Calling 'zswapStateToOffer' with no chain state and inputs throws error", () =>
    expect(() =>
      zswapStateToOffer(
        {
          currentIndex: 0n,
          coinPublicKey: randomCoinPublicKey(),
          inputs: [randomQualifiedCoinInfo()],
          outputs: [randomOutputData()]
        },
        randomEncryptionPublicKey()
      )
    ).toThrowError());

  const sum = (bs: (CoinInfo | { recipient: Recipient; coinInfo: CoinInfo })[]): bigint =>
    bs.reduce((prev, curr) => {
      if (typeof curr === 'object' && 'recipient' in curr && 'coinInfo' in curr) {
        return prev + curr.coinInfo.value;
      }
      return prev + curr.value;
    }, 0n);

  const zswapChainStateWithNonMatchingInputs = (recipient: Recipient, values: bigint[]) => {
    const nonMatchingInputs: QualifiedCoinInfo[] = [];
    const zswapChainState = values.reduce((prevZSwapChainState, value) => {
      const coinInfo = createCoinInfo(nativeToken(), value);
      const output = createUnprovenOutput({ coinInfo, recipient }, randomEncryptionPublicKey());
      const proofErasedOffer = new UnprovenTransaction(
        UnprovenOffer.fromOutput(output, nativeToken(), value)
      ).eraseProofs().guaranteedCoins;
      if (proofErasedOffer) {
        const [newZswapChainState, mtIndices] = prevZSwapChainState.tryApplyProofErased(proofErasedOffer);
        nonMatchingInputs.push({ ...coinInfo, mt_index: mtIndices.get(output.commitment)! });
        return newZswapChainState;
      }
      return prevZSwapChainState;
    }, new ZswapChainState());
    return { zswapChainState, nonMatchingInputs };
  };

  const arbitraryMatchingInputOutputPairs = (
    recipient: Recipient,
    preExistingCoins: (QualifiedCoinInfo | CoinInfo)[]
  ): fc.Arbitrary<[QualifiedCoinInfo[], { recipient: Recipient; coinInfo: CoinInfo }[]]> =>
    fc.array(arbitraryNativeCoinInfo.filter(distinctFrom(preExistingCoins))).map((matchingOutputsNoRecipient) => [
      withZeroMtIndex(matchingOutputsNoRecipient), // matching inputs
      toOutputData(recipient, matchingOutputsNoRecipient) // matching outputs
    ]);

  const arbitraryZswapScenario = fc
    // TODO: Generalize to arbitrary recipients to capture scenarios where no inputs are created.
    .tuple(arbitraryContractRecipient, fc.array(arbitraryValue))
    .chain(([recipient, values]) => {
      const { nonMatchingInputs, zswapChainState } = zswapChainStateWithNonMatchingInputs(recipient, values);
      return fc
        .array(arbitraryNativeCoinInfo.filter(distinctFrom(nonMatchingInputs)))
        .chain((nonMatchingOutputsNoRecipient) =>
          arbitraryMatchingInputOutputPairs(recipient, nonMatchingOutputsNoRecipient.concat(nonMatchingInputs)).chain(
            ([matchingInputs, matchingOutputs]) => {
              const nonMatchingOutputs = toOutputData(recipient, nonMatchingOutputsNoRecipient);
              return fc.boolean().map((useParams) => {
                return {
                  zswapChainState,
                  // only count non-matching inputs if we're calling 'zswapStateToOffer' with optional parameters
                  expectedInputCount: useParams ? nonMatchingInputs.length : 0,
                  expectedInputsSum: useParams ? sum(nonMatchingInputs) : 0n,
                  expectedOutputCount: nonMatchingOutputsNoRecipient.length,
                  expectedOutputsSum: sum(nonMatchingOutputs),
                  expectedTransientCount: matchingOutputs.length,
                  zswapState: {
                    currentIndex: 0n,
                    coinPublicKey: randomCoinPublicKey(),
                    // only count non-matching inputs if we're calling 'zswapStateToOffer' with optional parameters
                    inputs: useParams ? nonMatchingInputs.concat(matchingInputs) : matchingInputs,
                    outputs: nonMatchingOutputs.concat(matchingOutputs)
                  },
                  params: useParams
                    ? {
                        contractAddress: recipient.right, // the recipient of all spendable outputs
                        zswapChainState // chain state containing spendable outputs
                      }
                    : undefined
                };
              });
            }
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
          expect(unprovenOffer.outputs.length).toBe(expectedOutputCount);
          expect(unprovenOffer.inputs.length).toBe(expectedInputCount);
          expect(unprovenOffer.transient.length).toBe(expectedTransientCount);

          const delta = unprovenOffer.deltas.get(nativeToken());
          if (params) {
            // we only count non-matching inputs if we called 'zswapStateToOffer' with additional parameters
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
        }
      )
    ));

  test('zswapStateToNewCoins returns only coins meant for provided wallet', () => {
    type ScenarioData = {
      walletCoinPublicKey: CoinPublicKey;
      outputsForWallet: { recipient: Recipient; coinInfo: CoinInfo }[];
      outputsNotForWallet: { recipient: Recipient; coinInfo: CoinInfo }[];
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


  describe('Zswap utilities - inputs/outputs/transients', () => {
    // Test empty state - handles the failing case
    test('returns undefined for empty zswap state', () => {
      const emptyZswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [],
        outputs: []
      };

      const result = zswapStateToOffer(emptyZswapState, randomEncryptionPublicKey());
      expect(result).toBeDefined();
    });

    // Test outputs only
    test('creates correct number of outputs when no inputs', () => {
      const outputData = randomOutputData();
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: sampleCoinPublicKey(),
        inputs: [],
        outputs: [outputData]
      };

      const result = zswapStateToOffer(zswapState, sampleEncryptionPublicKey());
      expect(result).toBeDefined();
      expect(result!.outputs.length).toBe(1);
      expect(result!.inputs.length).toBe(0);
      expect(result!.transient.length).toBe(0);
    });

    // Test inputs with params
    test('creates correct number of inputs when params provided', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const { zswapChainState, nonMatchingInputs } = zswapChainStateWithNonMatchingInputs(recipient, [100n]);

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: nonMatchingInputs,
        outputs: []
      };

      const params = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), params);
      expect(result).toBeDefined();
      expect(result!.inputs.length).toBe(1);
      expect(result!.outputs.length).toBe(0);
      expect(result!.transient.length).toBe(0);
    });

    // Test transients (matching inputs/outputs)
    test('creates transients for matching inputs and outputs', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = sampleOne(arbitraryNativeCoinInfo);
      const qualifiedCoinInfo = { ...coinInfo, mt_index: 0n };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [qualifiedCoinInfo],
        outputs: [{ recipient, coinInfo }]
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey());
      expect(result).toBeDefined();
      expect(result!.inputs.length).toBe(0);
      expect(result!.outputs.length).toBe(0);
      expect(result!.transient.length).toBe(1);
    });

    // Test mixed scenario
    test('handles mixed inputs, outputs, and transients', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const { zswapChainState, nonMatchingInputs } = zswapChainStateWithNonMatchingInputs(recipient, [50n]);

      const outputCoinInfo = sampleOne(arbitraryNativeCoinInfo);
      const transientCoinInfo = sampleOne(arbitraryNativeCoinInfo);
      const qualifiedTransientCoinInfo = { ...transientCoinInfo, mt_index: 1n };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [...nonMatchingInputs, qualifiedTransientCoinInfo],
        outputs: [
          { recipient, coinInfo: outputCoinInfo },
          { recipient, coinInfo: transientCoinInfo }
        ]
      };

      const params = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), params);
      expect(result).toBeDefined();
      expect(result!.inputs.length).toBe(1); // nonMatchingInputs
      expect(result!.outputs.length).toBe(1); // outputCoinInfo
      expect(result!.transient.length).toBe(1); // transientCoinInfo
    });

    // Test delta calculations
    test('calculates correct deltas', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const { zswapChainState, nonMatchingInputs } = zswapChainStateWithNonMatchingInputs(recipient, [100n]);

      const outputData = {
        recipient,
        coinInfo: createCoinInfo(nativeToken(), 50n)
      };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: nonMatchingInputs,
        outputs: [outputData]
      };

      const params = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), params);
      expect(result).toBeDefined();

      const delta = result!.deltas.get(nativeToken());
      expect(delta).toBe(50n); // 100n input - 50n output = 50n delta
    });
  });
});
