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

import { fc } from '@fast-check/vitest';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type Recipient } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type CoinPublicKey,
  createShieldedCoinInfo,
  nativeToken,
  type QualifiedShieldedCoinInfo,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleRawTokenType,
  type ShieldedCoinInfo,
  shieldedToken,
  Transaction,
  ZswapChainState,
  ZswapOffer} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';
import { beforeAll, expect } from 'vitest';

import {
  BURN_ENCRYPTION_PUBLIC_KEY,
  createEncryptionPublicKeyResolver,
  createZswapOutput,
  deserializeCoinInfo,
  type EncryptionPublicKeyResolver,
  encryptionPublicKeyResolverForZswapState,
  serializeCoinInfo,
  serializeQualifiedShieldedCoinInfo,
  SHIELDED_BURN_COIN_PUBLIC_KEY,
  zswapStateToNewCoins,
  zswapStateToOffer
} from '../../utils';

const arbitraryBytes = fc.uint8Array({ minLength: 32, maxLength: 32 });

const arbitraryValue = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

const arbitraryPositiveValue = fc.bigInt({ min: 1n, max: (1n << 64n) - 1n });

const arbitraryNativeCoinInfo = arbitraryValue.map((value) => createShieldedCoinInfo(nativeToken().raw, value));

const arbitraryPositiveNativeCoinInfo = arbitraryPositiveValue.map((value) => createShieldedCoinInfo(nativeToken().raw, value));

const arbitraryHex = arbitraryBytes.map(toHex);

const arbitraryCoinPublicKey = fc.boolean().map(() => sampleCoinPublicKey());

const arbitraryContractAddress = fc.boolean().map(() => sampleContractAddress());

const arbitraryTokenType = fc.boolean().map(() => sampleRawTokenType());

const arbitraryCoinInfo = fc
  .tuple(arbitraryTokenType, arbitraryValue)
  .map(([tokenType, value]) => createShieldedCoinInfo(tokenType, value));

const arbitraryPositiveCoinInfo = fc
  .tuple(arbitraryTokenType, arbitraryPositiveValue)
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
      coinInfo: arbitraryPositiveCoinInfo,
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
  beforeAll(() => {
    setNetworkId('testnet');
  });

  test("should work with instanceof on 'Uint8Array' and 'Buffer'", () => {
    expect(randomBytes(32) instanceof Uint8Array).toBe(true);
    expect(randomBytes(32) instanceof Buffer).toBe(true);
    expect(randomBytes(32).valueOf() instanceof Uint8Array).toBe(true);
    expect(randomBytes(32).valueOf() instanceof Buffer).toBe(true);
  });

  test("should throw error when attempting to serialize a 'CoinInfo' with additional properties", () =>
    expect(() =>
      serializeCoinInfo({
        nonce: toHex(randomBytes(32)),
        type: toHex(randomBytes(32)),
        value: 0n,
        hello: 'darkness'
      } as ShieldedCoinInfo)
    ).toThrowError());

  test("should throw error when attempting to deserialize a string representing a 'CoinInfo' with additional properties", () =>
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

  test("should produce the original value when serializing then deserializing 'CoinInfo'", () =>
    fc.assert(
      fc.property(arbitraryCoinInfo, (coinInfo) => {
        expect(deserializeCoinInfo(serializeCoinInfo(coinInfo))).toEqual(coinInfo);
      })
    ));

  test('serializeCoinInfo produces plain string fields for type and nonce, not __uint8Array_val__ wrappers', () =>
    fc.assert(
      fc.property(arbitraryCoinInfo, (coinInfo) => {
        const serialized = serializeCoinInfo(coinInfo);
        const parsed = JSON.parse(serialized);
        expect(typeof parsed.type).toBe('string');
        expect(typeof parsed.nonce).toBe('string');
        expect(parsed).not.toHaveProperty('color');
        expect(parsed.value).toHaveProperty('__big_int_val__');
      })
    ));

  test("should produce the original value without 'mt_index' when serializing 'QualifiedShieldedCoinInfo' then deserializing 'CoinInfo'", () =>
    fc.assert(
      fc.property(arbitraryQualifiedShieldedCoinInfo, (qualifiedCoinInfo) => {
        expect(deserializeCoinInfo(serializeQualifiedShieldedCoinInfo(qualifiedCoinInfo))).toEqual(
          dropMtIndex(qualifiedCoinInfo)
        );
      })
    ));

  test("should have equal serialized strings for 'QualifiedShieldedCoinInfo' and extracted 'CoinInfo'", () =>
    fc.assert(
      fc.property(arbitraryQualifiedShieldedCoinInfo, (qualifiedCoinInfo) => {
        expect(serializeCoinInfo(dropMtIndex(qualifiedCoinInfo))).toEqual(
          serializeQualifiedShieldedCoinInfo(qualifiedCoinInfo)
        );
      })
    ));

  test("should throw error when calling 'zswapStateToOffer' with no chain state and inputs", () =>
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
      const constantResolver: EncryptionPublicKeyResolver = () => randomEncryptionPublicKey();
      const output = createZswapOutput({ coinInfo, recipient }, constantResolver);
      const proofErasedOffer = Transaction.fromParts(
        getNetworkId(), ZswapOffer.fromOutput(output, nativeToken().raw, value)
      ).eraseProofs().guaranteedOffer;
      if (proofErasedOffer) {
        const [newZswapChainState, mtIndices] = prevZSwapChainState.tryApply(proofErasedOffer);
        nonMatchingInputs.push({ ...coinInfo, mt_index: mtIndices.get(output.commitment)! });
        return newZswapChainState;
      }
      return prevZSwapChainState;
    }, new ZswapChainState());
    const zswapChainStateUpdated = zswapChainState.postBlockUpdate(new Date());
    return { zswapChainState: zswapChainStateUpdated, nonMatchingInputs };
  };

  const arbitraryMatchingInputOutputPairs = (
    recipient: Recipient,
    preExistingCoins: (QualifiedShieldedCoinInfo | ShieldedCoinInfo)[]
  ): fc.Arbitrary<[QualifiedShieldedCoinInfo[], { recipient: Recipient; coinInfo: ShieldedCoinInfo }[]]> =>
    fc.array(arbitraryPositiveNativeCoinInfo.filter(distinctFrom(preExistingCoins)), { minLength: 0 }).map((matchingOutputsNoRecipient) => [
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
    addressAndChainStateTuple?: {
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
    useAddressAndChainStateTuple: boolean,
    zswapChainState: ZswapChainState,
    nonMatchingInputs: QualifiedShieldedCoinInfo[]
  ): ZswapScenarioData => {
    const nonMatchingOutputs = toOutputData(recipient, nonMatchingOutputsNoRecipient);

    return {
      zswapChainState,
      expectedInputCount: useAddressAndChainStateTuple ? nonMatchingInputs.length : 0,
      expectedInputsSum: useAddressAndChainStateTuple ? sum(nonMatchingInputs) : 0n,
      expectedOutputCount: nonMatchingOutputsNoRecipient.length,
      expectedOutputsSum: sum(nonMatchingOutputs),
      expectedTransientCount: matchingOutputs.length,
      zswapState: {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: useAddressAndChainStateTuple ? nonMatchingInputs.concat(matchingInputs) : matchingInputs,
        outputs: nonMatchingOutputs.concat(matchingOutputs)
      },
      addressAndChainStateTuple: useAddressAndChainStateTuple
        ? {
            contractAddress: recipient.right,
            zswapChainState
          }
        : undefined
    };
  };

  const arbitraryZswapScenario: fc.Arbitrary<ZswapScenarioData> = fc
    // TODO: Generalize to arbitrary recipients to capture scenarios where no inputs are created.
    .tuple(arbitraryContractRecipient, fc.array(arbitraryPositiveValue, { minLength: 0 }))
    .chain(([recipient, values]) => {
      const { nonMatchingInputs, zswapChainState } = zswapChainStateWithNonMatchingInputs(recipient, values);

      return fc
        .array(arbitraryPositiveNativeCoinInfo.filter(distinctFrom(nonMatchingInputs)), { minLength: 1 })
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

  test('should create expected number of inputs, outputs, and transients [@slow]', () =>
    fc.assert(
      fc.property(
        arbitraryZswapScenario,
        ({
          expectedInputCount,
          expectedInputsSum,
          expectedOutputCount,
          expectedOutputsSum,
          expectedTransientCount,
          zswapState,
          addressAndChainStateTuple
        }) => {
          const unprovenOffer = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), addressAndChainStateTuple);
          expect(unprovenOffer).toBeDefined();
          expect(unprovenOffer!.outputs.length).toBe(expectedOutputCount);
          expect(unprovenOffer!.inputs.length).toBe(expectedInputCount);
          expect(unprovenOffer!.transients.length).toBe(expectedTransientCount);

          const delta = unprovenOffer!.deltas.get(nativeToken().raw);
          if (addressAndChainStateTuple) {
            const expectedDelta = expectedInputsSum - expectedOutputsSum;
            if (expectedInputCount > 0 && expectedOutputCount > 0) {
              if (expectedDelta !== 0n) {
                expect(delta).toBe(expectedDelta);
              } else {
                expect(delta).toBeUndefined();
              }
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

  test('should return only coins meant for provided wallet in zswapStateToNewCoins', () => {
    type ScenarioData = {
      walletCoinPublicKey: CoinPublicKey;
      outputsForWallet: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[];
      outputsNotForWallet: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[];
    }
    const arbitraryScenario = arbitraryCoinPublicKey.chain((walletCoinPublicKey) =>
      fc.record<ScenarioData>({
        walletCoinPublicKey: fc.constant(walletCoinPublicKey),
        outputsForWallet: fc.array(arbitraryPositiveCoinInfo, { minLength: 1 }).map((coins) =>
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
          .array(fc.tuple(arbitraryPositiveCoinInfo, arbitraryRecipient), { minLength: 0 })
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

  describe('Edge cases for inputs, outputs, and transients', () => {
    test('should return undefined offer for empty zswap state - changed in ledger 6', () => {
      const emptyZswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [],
        outputs: []
      };

      const result = zswapStateToOffer(emptyZswapState, randomEncryptionPublicKey());
      expect(result).toBeUndefined();
    });

    test('should create correct number of outputs when no inputs', () => {
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
      expect(result!.transients.length).toBe(0);
    });

    test('should create correct number of inputs when addressAndChainStateTuple provided', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const { zswapChainState, nonMatchingInputs } = zswapChainStateWithNonMatchingInputs(recipient, [100n]);

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: nonMatchingInputs,
        outputs: []
      };

      const addressAndChainStateTuple = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), addressAndChainStateTuple);
      expect(result).toBeDefined();
      expect(result!.inputs.length).toBe(1);
      expect(result!.outputs.length).toBe(0);
      expect(result!.transients.length).toBe(0);
    });

    test('should handle inputs from chain state that has not been explicitly rehashed', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, 100n);
      const constantResolver: EncryptionPublicKeyResolver = () => randomEncryptionPublicKey();
      const output = createZswapOutput({ coinInfo, recipient }, constantResolver);
      const proofErasedOffer = Transaction.fromParts(
        getNetworkId(), ZswapOffer.fromOutput(output, nativeToken().raw, 100n)
      ).eraseProofs().guaranteedOffer!;
      const [chainStateNoRehash, mtIndices] = new ZswapChainState().tryApply(proofErasedOffer);
      const qualifiedCoin = { ...coinInfo, mt_index: mtIndices.get(output.commitment)! };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [qualifiedCoin],
        outputs: []
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), {
        contractAddress: recipient.right,
        zswapChainState: chainStateNoRehash
      });
      expect(result).toBeDefined();
      expect(result!.inputs.length).toBe(1);
    });

    test('should handle mixed inputs, outputs, and transients', () => {
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

      const addressAndChainStateTuple = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), addressAndChainStateTuple);
      expect(result).toBeDefined();
      expect(result!.inputs.length).toBe(1); // nonMatchingInputs
      expect(result!.outputs.length).toBe(1); // outputCoinInfo
      expect(result!.transients.length).toBe(1); // transientCoinInfo
    });

    test('offers can be applied', () => {
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

      const addressAndChainStateTuple = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const offer = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), addressAndChainStateTuple);
      expect(offer).toBeDefined();
      const [newZswapChainState, commitments] = zswapChainState.tryApply(offer!);
      expect(newZswapChainState).not.toBe(zswapChainState);
      expect(commitments.size).toBe(2);
    });

    test('should handle zero value outputs correctly', () => {
      const zeroValueOutput = {
        recipient: sampleOne(arbitraryContractRecipient),
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 0n)
      };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [],
        outputs: [zeroValueOutput]
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey());

      expect(result!.outputs.length).toBe(1);
      expect(result!.inputs.length).toBe(0);
      expect(result!.transients.length).toBe(0);
      expect(result!.deltas.get(nativeToken().raw), result!.toString()).toBe(undefined);
    });

    test('should handle zero value inputs with addressAndChainStateTuple correctly', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const { zswapChainState } = zswapChainStateWithNonMatchingInputs(recipient, [0n]);
      const zeroValueInput = { ...createShieldedCoinInfo(nativeToken().raw, 0n), mt_index: 0n };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [zeroValueInput],
        outputs: []
      };

      const addressAndChainStateTuple = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), addressAndChainStateTuple);

      expect(result!.inputs.length).toBe(1);
      expect(result!.outputs.length).toBe(0);
      expect(result!.transients.length).toBe(0);
      expect(result!.deltas.get(nativeToken().raw), result!.toString()).toBe(undefined);
    });

    test('should create transient for single matching input-output pair', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const qualifiedInput = { ...coinInfo, mt_index: 0n };
      const output = { recipient, coinInfo };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [qualifiedInput],
        outputs: [output]
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey());

      expect(result!.inputs.length).toBe(0);
      expect(result!.outputs.length).toBe(0);
      expect(result!.transients.length).toBe(1);
      expect(result!.deltas.get(nativeToken().raw)).toBeUndefined();
    });

    test('should create transient with zero delta for zero value matching pair', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 0n);
      const qualifiedInput = { ...coinInfo, mt_index: 0n };
      const output = { recipient, coinInfo };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [qualifiedInput],
        outputs: [output]
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey());

      expect(result!.inputs.length).toBe(0);
      expect(result!.outputs.length).toBe(0);
      expect(result!.transients.length).toBe(1);
      expect(result!.deltas.get(nativeToken().raw), result!.toString()).toBeUndefined();
    });

    test('should produce negative delta for only outputs without addressAndChainStateTuple', () => {
      const output = {
        recipient: sampleOne(arbitraryContractRecipient),
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 50n)
      };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: [],
        outputs: [output]
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey());

      expect(result!.outputs.length).toBe(1);
      expect(result!.inputs.length).toBe(0);
      expect(result!.transients.length).toBe(0);
      expect(result!.deltas.get(nativeToken().raw)).toBe(-50n);
    });

    test('should produce positive delta for only inputs with addressAndChainStateTuple', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const { zswapChainState, nonMatchingInputs } = zswapChainStateWithNonMatchingInputs(recipient, [75n]);

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: nonMatchingInputs,
        outputs: []
      };

      const addressAndChainStateTuple = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), addressAndChainStateTuple);

      expect(result!.inputs.length).toBe(1);
      expect(result!.outputs.length).toBe(0);
      expect(result!.transients.length).toBe(0);
      expect(result!.deltas.get(nativeToken().raw)).toBe(75n);
    });

    // reference: PM-19382
    test('should produce undefined delta for balanced inputs and outputs with addressAndChainStateTuple', () => {
      const recipient = sampleOne(arbitraryContractRecipient);
      const { zswapChainState, nonMatchingInputs } = zswapChainStateWithNonMatchingInputs(recipient, [100n]);

      const output = {
        recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 100n)
      };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: randomCoinPublicKey(),
        inputs: nonMatchingInputs,
        outputs: [output]
      };

      const addressAndChainStateTuple = {
        contractAddress: recipient.right,
        zswapChainState
      };

      const result = zswapStateToOffer(zswapState, randomEncryptionPublicKey(), addressAndChainStateTuple);

      expect(result).toBeDefined();
      expect(result!.inputs.length).toBe(1);
      expect(result!.outputs.length).toBe(1);
      expect(result!.transients.length).toBe(0);
      expect(result!.deltas.get(nativeToken().raw), result!.toString()).toBe(undefined);
    });
  });

  describe('createEncryptionPublicKeyResolver', () => {
    test('should return wallet encryption key for wallet coin public key', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);

      expect(resolver(walletCpk)).toBe(walletEpk);
    });

    test('should return burn encryption key for burn address', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);

      expect(resolver(SHIELDED_BURN_COIN_PUBLIC_KEY)).toBe(BURN_ENCRYPTION_PUBLIC_KEY);
    });

    test('should return additional mapping for known third-party key', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const thirdPartyCpk = sampleCoinPublicKey();
      const thirdPartyEpk = sampleEncryptionPublicKey();
      const mappings = new Map([[thirdPartyCpk, thirdPartyEpk]]);
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk, mappings);

      expect(resolver(thirdPartyCpk)).toBe(thirdPartyEpk);
    });

    test('should return undefined for unknown coin public key', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);
      const unknownCpk = sampleCoinPublicKey();

      expect(resolver(unknownCpk)).toBeUndefined();
    });
  });

  describe('createZswapOutput with resolver', () => {
    test('should use burn encryption key for burn address recipient', () => {
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const burnRecipient: Recipient = {
        is_left: true,
        left: SHIELDED_BURN_COIN_PUBLIC_KEY,
        right: sampleContractAddress()
      };
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);

      const output = createZswapOutput({ coinInfo, recipient: burnRecipient }, resolver);
      expect(output).toBeDefined();
    });

    test('should use wallet encryption key for wallet recipient', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const walletRecipient: Recipient = {
        is_left: true,
        left: walletCpk,
        right: sampleContractAddress()
      };
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);

      const output = createZswapOutput({ coinInfo, recipient: walletRecipient }, resolver);
      expect(output).toBeDefined();
    });

    test('should throw for unknown recipient when resolver returns undefined', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const unknownCpk = sampleCoinPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const unknownRecipient: Recipient = {
        is_left: true,
        left: unknownCpk,
        right: sampleContractAddress()
      };
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);

      expect(() => createZswapOutput({ coinInfo, recipient: unknownRecipient }, resolver)).toThrowError(
        /Unable to resolve encryption public key/
      );
    });

    test('should not require encryption key for contract-owned outputs', () => {
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const contractRecipient: Recipient = {
        is_left: false,
        left: sampleCoinPublicKey(),
        right: sampleContractAddress()
      };
      const resolver: EncryptionPublicKeyResolver = () => undefined;

      const output = createZswapOutput({ coinInfo, recipient: contractRecipient }, resolver);
      expect(output).toBeDefined();
    });
  });

  describe('zswapStateToOffer with resolver', () => {
    test('should handle mixed wallet and burn outputs', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);

      const walletOutput = {
        recipient: { is_left: true, left: walletCpk, right: sampleContractAddress() } as Recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 50n)
      };
      const burnOutput = {
        recipient: { is_left: true, left: SHIELDED_BURN_COIN_PUBLIC_KEY, right: sampleContractAddress() } as Recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 50n)
      };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [walletOutput, burnOutput]
      };

      const result = zswapStateToOffer(zswapState, resolver);
      expect(result).toBeDefined();
      expect(result!.outputs.length).toBe(2);
    });

    test('should maintain backward compatibility with plain EncPublicKey string', () => {
      const output = randomOutputData();
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: sampleCoinPublicKey(),
        inputs: [],
        outputs: [output]
      };

      const result = zswapStateToOffer(zswapState, sampleEncryptionPublicKey());
      expect(result).toBeDefined();
      expect(result!.outputs.length).toBe(1);
    });
  });

  describe('encryptionPublicKeyResolverForZswapState', () => {
    test('should return a resolver when coin public keys match', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: []
      };

      const resolver = encryptionPublicKeyResolverForZswapState(zswapState, walletCpk, walletEpk);
      expect(resolver(walletCpk)).toBe(walletEpk);
      expect(resolver(SHIELDED_BURN_COIN_PUBLIC_KEY)).toBe(BURN_ENCRYPTION_PUBLIC_KEY);
    });

    test('should throw when coin public keys do not match', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const differentCpk = sampleCoinPublicKey();
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: differentCpk,
        inputs: [],
        outputs: []
      };

      expect(() => encryptionPublicKeyResolverForZswapState(zswapState, walletCpk, walletEpk)).toThrowError(
        /Unsupported coin/
      );
    });
  });
});
