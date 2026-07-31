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

import { fc } from '@fast-check/vitest';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type Recipient } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type AlignedValue,
  type CoinCommitment,
  coinCommitment,
  type CoinPublicKey,
  type ContractAddress,
  createShieldedCoinInfo,
  nativeToken,
  type PartitionedTranscript,
  type QualifiedShieldedCoinInfo,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleRawTokenType,
  type ShieldedCoinInfo,
  shieldedToken,
  Transaction,
  type Transcript,
  ZswapChainState,
  ZswapInput,
  ZswapOffer,
  ZswapOutput
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { parseEncPublicKeyToHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';
import { beforeAll, expect, vi } from 'vitest';

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
  ZSWAP_MERKLE_ROOT_RETENTION_SECONDS,
  zswapCallsToNewCoins,
  zswapCallsToSegmentedOffer,
  zswapStateToNewCoins,
  zswapStateToOffer,
  zswapStateToSegmentedOffer} from '../../utils';

const arbitraryBytes = fc.uint8Array({ minLength: 32, maxLength: 32 });

const arbitraryValue = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

const arbitraryPositiveValue = fc.bigInt({ min: 1n, max: (1n << 64n) - 1n });

const arbitraryNativeCoinInfo = arbitraryValue.map((value) => createShieldedCoinInfo(nativeToken().raw, value));

const arbitraryPositiveNativeCoinInfo = arbitraryPositiveValue.map((value) =>
  createShieldedCoinInfo(nativeToken().raw, value)
);

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
    ).toThrow());

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
    ).toThrow());

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
    ).toThrow());

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
        getNetworkId(),
        ZswapOffer.fromOutput(output, nativeToken().raw, value)
      ).eraseProofs().guaranteedOffer;
      if (proofErasedOffer) {
        const [newZswapChainState, mtIndices] = prevZSwapChainState.tryApply(proofErasedOffer);
        nonMatchingInputs.push({ ...coinInfo, mt_index: mtIndices.get(output.commitment)! });
        return newZswapChainState;
      }
      return prevZSwapChainState;
    }, new ZswapChainState());
    const zswapChainStateUpdated = zswapChainState.postBlockUpdate(new Date(), ZSWAP_MERKLE_ROOT_RETENTION_SECONDS);
    return { zswapChainState: zswapChainStateUpdated, nonMatchingInputs };
  };

  const arbitraryMatchingInputOutputPairs = (
    recipient: Recipient,
    preExistingCoins: (QualifiedShieldedCoinInfo | ShieldedCoinInfo)[]
  ): fc.Arbitrary<[QualifiedShieldedCoinInfo[], { recipient: Recipient; coinInfo: ShieldedCoinInfo }[]]> =>
    fc
      .array(arbitraryPositiveNativeCoinInfo.filter(distinctFrom(preExistingCoins)), { minLength: 0 })
      .map((matchingOutputsNoRecipient) => [
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
          arbitraryMatchingInputOutputPairs(recipient, nonMatchingOutputsNoRecipient.concat(nonMatchingInputs)).chain(
            ([matchingInputs, matchingOutputs]) =>
              fc
                .boolean()
                .map((useParams) =>
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
      ),
      { numRuns: 25 }
    ));

  test('should return only coins meant for provided wallet in zswapStateToNewCoins', () => {
    type ScenarioData = {
      walletCoinPublicKey: CoinPublicKey;
      outputsForWallet: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[];
      outputsNotForWallet: { recipient: Recipient; coinInfo: ShieldedCoinInfo }[];
    };
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
        getNetworkId(),
        ZswapOffer.fromOutput(output, nativeToken().raw, 100n)
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

      expect(() => createZswapOutput({ coinInfo, recipient: unknownRecipient }, resolver)).toThrow(
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

      expect(() => encryptionPublicKeyResolverForZswapState(zswapState, walletCpk, walletEpk)).toThrow(
        /Unsupported coin/
      );
    });
  });

  describe('createEncryptionPublicKeyResolver precedence', () => {
    // These two tests encode the security property at the heart of #745:
    // the fixed wallet/burn keys must win even if a DApp-supplied mapping
    // tries to substitute them, otherwise a malicious mapping could redirect
    // the wallet's own outputs.
    test('wallet key takes precedence over additional-mapping override for the wallet cpk', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const maliciousEpk = sampleEncryptionPublicKey();
      // A DApp-supplied mapping that attempts to hijack the wallet's own key.
      const mappings = new Map([[walletCpk, maliciousEpk]]);
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk, mappings);

      const expectedWalletEpk = parseEncPublicKeyToHex(walletEpk, getNetworkId());
      const maliciousNormalized = parseEncPublicKeyToHex(maliciousEpk, getNetworkId());
      expect(resolver(walletCpk)).toBe(expectedWalletEpk);
      expect(resolver(walletCpk)).not.toBe(maliciousNormalized);
    });

    test('burn encryption key takes precedence over additional-mapping override for the burn cpk', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const maliciousEpk = sampleEncryptionPublicKey();
      const mappings = new Map([[SHIELDED_BURN_COIN_PUBLIC_KEY, maliciousEpk]]);
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk, mappings);

      expect(resolver(SHIELDED_BURN_COIN_PUBLIC_KEY)).toBe(BURN_ENCRYPTION_PUBLIC_KEY);
    });
  });

  describe('ledger-assumed invariants underlying zswapStateToSegmentedOffer', () => {
    it('coinCommitment(coin, cpk) equals ZswapOutput.new(coin, anySegment, ...).commitment for segments 0 and 1', () => {
      // Arrange
      const cpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
      // Act
      const commitmentFromHelper = coinCommitment(coin, cpk);
      const commitmentSeg0 = ZswapOutput.new(coin, 0, cpk, epk).commitment;
      const commitmentSeg1 = ZswapOutput.new(coin, 1, cpk, epk).commitment;
      // Assert
      expect(commitmentFromHelper).toBe(commitmentSeg0);
      expect(commitmentFromHelper).toBe(commitmentSeg1);
    });

    it('ZswapOutput.newContractOwned(coin, segment, addr).commitment is segment-independent', () => {
      // Arrange
      const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
      const contractAddress = sampleContractAddress();
      // Act
      const commitmentSeg0 = ZswapOutput.newContractOwned(coin, 0, contractAddress).commitment;
      const commitmentSeg1 = ZswapOutput.newContractOwned(coin, 1, contractAddress).commitment;
      // Assert
      expect(commitmentSeg0).toBe(commitmentSeg1);
    });

    it('ZswapInput.newContractOwned(coin, segment, addr, state).nullifier is segment-independent', () => {
      // Arrange
      const contractRecipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const constantResolver: EncryptionPublicKeyResolver = () => randomEncryptionPublicKey();
      const output = createZswapOutput({ coinInfo, recipient: contractRecipient }, constantResolver);
      const seedTx = Transaction.fromParts(
        getNetworkId(),
        ZswapOffer.fromOutput(output, coinInfo.type, coinInfo.value)
      ).eraseProofs();
      const [chainState, mtIndices] = new ZswapChainState().tryApply(seedTx.guaranteedOffer!);
      const rehashedChainState = chainState.postBlockUpdate(new Date(), ZSWAP_MERKLE_ROOT_RETENTION_SECONDS);
      const qualifiedCoin: QualifiedShieldedCoinInfo = { ...coinInfo, mt_index: mtIndices.get(output.commitment)! };
      // Act
      const nullifierSeg0 = ZswapInput.newContractOwned(qualifiedCoin, 0, contractRecipient.right, rehashedChainState).nullifier;
      const nullifierSeg1 = ZswapInput.newContractOwned(qualifiedCoin, 1, contractRecipient.right, rehashedChainState).nullifier;
      // Assert
      expect(nullifierSeg0).toBe(nullifierSeg1);
    });
  });

  describe('zswapStateToSegmentedOffer', () => {
    const makeTranscript = (
      claimedShieldedReceives: CoinCommitment[],
      claimedShieldedSpends: CoinCommitment[],
      claimedNullifiers: string[] = []
    ): Transcript<AlignedValue> => ({
      gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
      effects: {
        claimedNullifiers,
        claimedShieldedReceives,
        claimedShieldedSpends,
        claimedContractCalls: [],
        shieldedMints: new Map(),
        unshieldedInputs: new Map(),
        unshieldedOutputs: new Map(),
        unshieldedMints: new Map(),
        claimedUnshieldedSpends: new Map()
      },
      program: ['new', { noop: { n: 5 } }]
    });

    it('returns { guaranteed: undefined, fallible: undefined } for an empty zswap state', () => {
      // Arrange
      const cpk = sampleCoinPublicKey();
      const zswapState = { currentIndex: 0n, coinPublicKey: cpk, inputs: [], outputs: [] };
      const partitioned: PartitionedTranscript = [undefined, undefined];
      // Act
      const result = zswapStateToSegmentedOffer(zswapState, randomEncryptionPublicKey(), undefined, partitioned);
      // Assert
      expect(result).toEqual({ guaranteed: undefined, fallible: undefined });
    });

    it('places a user-bound output into the fallible offer when its commitment is in partitionedTranscript[1].claimedShieldedReceives', () => {
      // Arrange
      const recipientCpk = sampleCoinPublicKey();
      const walletCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 4967n);
      const commitment = coinCommitment(coinInfo, recipientCpk);
      const partitioned: PartitionedTranscript = [
        makeTranscript([], []),
        makeTranscript([commitment], [])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: sampleContractAddress() } }]
      };
      // Act
      const result = zswapStateToSegmentedOffer(zswapState, () => epk, undefined, partitioned);
      // Assert
      expect(result.guaranteed).toBeUndefined();
      expect(result.fallible).toBeDefined();
      expect(result.fallible!.outputs.length).toBe(1);
      expect(result.fallible!.outputs[0]!.commitment).toBe(commitment);
    });

    it('places a user-bound output into the guaranteed offer when its commitment is in partitionedTranscript[0].claimedShieldedReceives', () => {
      // Arrange
      const recipientCpk = sampleCoinPublicKey();
      const walletCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const commitment = coinCommitment(coinInfo, recipientCpk);
      const partitioned: PartitionedTranscript = [
        makeTranscript([commitment], []),
        makeTranscript([], [])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: sampleContractAddress() } }]
      };
      // Act
      const result = zswapStateToSegmentedOffer(zswapState, () => epk, undefined, partitioned);
      // Assert
      expect(result.fallible).toBeUndefined();
      expect(result.guaranteed).toBeDefined();
      expect(result.guaranteed!.outputs.length).toBe(1);
      expect(result.guaranteed!.outputs[0]!.commitment).toBe(commitment);
    });

    it('splits two outputs into separate segments when one commitment is in [0] and the other is in [1]', () => {
      // Arrange
      const recipientCpk = sampleCoinPublicKey();
      const walletCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const guaranteedCoin = createShieldedCoinInfo(nativeToken().raw, 100n);
      const fallibleCoin = createShieldedCoinInfo(nativeToken().raw, 200n);
      const gCommitment = coinCommitment(guaranteedCoin, recipientCpk);
      const fCommitment = coinCommitment(fallibleCoin, recipientCpk);
      const partitioned: PartitionedTranscript = [
        makeTranscript([gCommitment], []),
        makeTranscript([fCommitment], [])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [
          { coinInfo: guaranteedCoin, recipient: { is_left: true, left: recipientCpk, right: sampleContractAddress() } },
          { coinInfo: fallibleCoin, recipient: { is_left: true, left: recipientCpk, right: sampleContractAddress() } }
        ]
      };
      // Act
      const result = zswapStateToSegmentedOffer(zswapState, () => epk, undefined, partitioned);
      // Assert
      expect(result.guaranteed).toBeDefined();
      expect(result.fallible).toBeDefined();
      expect(result.guaranteed!.outputs.map((o) => o.commitment)).toEqual([gCommitment]);
      expect(result.fallible!.outputs.map((o) => o.commitment)).toEqual([fCommitment]);
    });

    it('throws when both transcript halves are defined and the commitment matches neither', () => {
      // Arrange
      const recipientCpk = sampleCoinPublicKey();
      const walletCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const partitioned: PartitionedTranscript = [makeTranscript([], []), makeTranscript([], [])];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: sampleContractAddress() } }]
      };
      // Act + Assert
      expect(() => zswapStateToSegmentedOffer(zswapState, () => epk, undefined, partitioned)).toThrow(
        /not present in either segment/
      );
    });

    it('falls back to the guaranteed offer when at least one transcript half is undefined (no-transcript callers)', () => {
      // Arrange
      const recipientCpk = sampleCoinPublicKey();
      const walletCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 100n);
      const partitioned: PartitionedTranscript = [undefined, undefined];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: sampleContractAddress() } }]
      };
      // Act
      const result = zswapStateToSegmentedOffer(zswapState, () => epk, undefined, partitioned);
      // Assert
      const expectedCommitment = coinCommitment(coinInfo, recipientCpk);
      expect(result.guaranteed).toBeDefined();
      expect(result.fallible).toBeUndefined();
      expect(result.guaranteed!.outputs.length).toBe(1);
      expect(result.guaranteed!.outputs[0]!.commitment).toBe(expectedCommitment);
    });

    it('routes a contract-owned output to the fallible offer when its commitment is in partitionedTranscript[1]', () => {
      // Arrange
      const walletCpk = sampleCoinPublicKey();
      const contractAddress = sampleContractAddress();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 300n);
      const probeCommitment = ZswapOutput.newContractOwned(coinInfo, 0, contractAddress).commitment;
      const partitioned: PartitionedTranscript = [
        makeTranscript([], []),
        makeTranscript([probeCommitment], [])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [{ coinInfo, recipient: { is_left: false, left: sampleCoinPublicKey(), right: contractAddress } }]
      };
      // Act
      const result = zswapStateToSegmentedOffer(zswapState, randomEncryptionPublicKey(), undefined, partitioned);
      // Assert
      expect(result.guaranteed).toBeUndefined();
      expect(result.fallible).toBeDefined();
      expect(result.fallible!.outputs.length).toBe(1);
      expect(result.fallible!.outputs[0]!.commitment).toBe(probeCommitment);
    });

    const seedChainStateWithCoin = (
      coinInfo: ShieldedCoinInfo,
      contractRecipient: Recipient
    ): { chainState: ZswapChainState; qualifiedCoin: QualifiedShieldedCoinInfo } => {
      const constantResolver: EncryptionPublicKeyResolver = () => randomEncryptionPublicKey();
      const output = createZswapOutput({ coinInfo, recipient: contractRecipient }, constantResolver);
      const seedTx = Transaction.fromParts(
        getNetworkId(),
        ZswapOffer.fromOutput(output, coinInfo.type, coinInfo.value)
      ).eraseProofs();
      const [chainState, mtIndices] = new ZswapChainState().tryApply(seedTx.guaranteedOffer!);
      const qualifiedCoin = { ...coinInfo, mt_index: mtIndices.get(output.commitment)! };
      return { chainState, qualifiedCoin };
    };

    const probeNullifier = (
      qualifiedCoin: QualifiedShieldedCoinInfo,
      chainState: ZswapChainState,
      contractAddress: ContractAddress
    ): string =>
      ZswapInput.newContractOwned(
        qualifiedCoin,
        0,
        contractAddress,
        chainState.postBlockUpdate(new Date(), ZSWAP_MERKLE_ROOT_RETENTION_SECONDS)
      ).nullifier;

    it('routes a wallet-owned input to the fallible offer when its nullifier is in partitionedTranscript[1].claimedNullifiers', () => {
      // Arrange
      const walletCpk = sampleCoinPublicKey();
      const contractRecipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, 500n);
      const { chainState, qualifiedCoin } = seedChainStateWithCoin(coinInfo, contractRecipient);
      const nullifier = probeNullifier(qualifiedCoin, chainState, contractRecipient.right);
      const partitioned: PartitionedTranscript = [
        makeTranscript([], [], []),
        makeTranscript([], [], [nullifier])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [qualifiedCoin],
        outputs: []
      };
      // Act
      const result = zswapStateToSegmentedOffer(
        zswapState,
        randomEncryptionPublicKey(),
        { contractAddress: contractRecipient.right, zswapChainState: chainState },
        partitioned
      );
      // Assert
      expect(result.guaranteed).toBeUndefined();
      expect(result.fallible).toBeDefined();
      expect(result.fallible!.inputs.length).toBe(1);
      expect(result.fallible!.inputs[0]!.nullifier).toBe(nullifier);
    });

    it('routes a wallet-owned input to the guaranteed offer when its nullifier is in partitionedTranscript[0].claimedNullifiers', () => {
      // Arrange — same coin/state as the fallible case, but with the nullifier listed in segment 0.
      const walletCpk = sampleCoinPublicKey();
      const contractRecipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, 500n);
      const { chainState, qualifiedCoin } = seedChainStateWithCoin(coinInfo, contractRecipient);
      const nullifier = probeNullifier(qualifiedCoin, chainState, contractRecipient.right);
      const partitioned: PartitionedTranscript = [
        makeTranscript([], [], [nullifier]),
        makeTranscript([], [], [])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [qualifiedCoin],
        outputs: []
      };
      // Act
      const result = zswapStateToSegmentedOffer(
        zswapState,
        randomEncryptionPublicKey(),
        { contractAddress: contractRecipient.right, zswapChainState: chainState },
        partitioned
      );
      // Assert
      expect(result.fallible).toBeUndefined();
      expect(result.guaranteed).toBeDefined();
      expect(result.guaranteed!.inputs.length).toBe(1);
      expect(result.guaranteed!.inputs[0]!.nullifier).toBe(nullifier);
    });

    it('throws when both transcript halves are defined and the input nullifier matches neither', () => {
      // Arrange — chain state and coin valid, but transcript omits the nullifier.
      const walletCpk = sampleCoinPublicKey();
      const contractRecipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, 500n);
      const { chainState, qualifiedCoin } = seedChainStateWithCoin(coinInfo, contractRecipient);
      const partitioned: PartitionedTranscript = [makeTranscript([], [], []), makeTranscript([], [], [])];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [qualifiedCoin],
        outputs: []
      };
      // Act + Assert
      expect(() =>
        zswapStateToSegmentedOffer(
          zswapState,
          randomEncryptionPublicKey(),
          { contractAddress: contractRecipient.right, zswapChainState: chainState },
          partitioned
        )
      ).toThrow(/Shielded nullifier .* not present in either segment/);
    });

    it('routes a user-bound output via claimedShieldedSpends (union with receives matches ledger v8)', () => {
      // Arrange — user-bound outputs land in claimedShieldedSpends per ledger v8;
      // the routing must accept that field (not just claimedShieldedReceives).
      const recipientCpk = sampleCoinPublicKey();
      const walletCpk = sampleCoinPublicKey();
      const epk = sampleEncryptionPublicKey();
      const coinInfo = createShieldedCoinInfo(nativeToken().raw, 250n);
      const commitment = coinCommitment(coinInfo, recipientCpk);
      const partitioned: PartitionedTranscript = [
        makeTranscript([], [], []),
        makeTranscript([], [commitment], [])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [{ coinInfo, recipient: { is_left: true, left: recipientCpk, right: sampleContractAddress() } }]
      };
      // Act
      const result = zswapStateToSegmentedOffer(zswapState, () => epk, undefined, partitioned);
      // Assert
      expect(result.guaranteed).toBeUndefined();
      expect(result.fallible).toBeDefined();
      expect(result.fallible!.outputs.map((o) => o.commitment)).toEqual([commitment]);
    });

    it('pairs a matching input and output into a same-segment transient', () => {
      // Arrange — output commitment in fallible receives, input nullifier in fallible nullifiers.
      const walletCpk = sampleCoinPublicKey();
      const contractRecipient = sampleOne(arbitraryContractRecipient);
      const coinInfo = createShieldedCoinInfo(shieldedToken().raw, 750n);
      const { chainState, qualifiedCoin } = seedChainStateWithCoin(coinInfo, contractRecipient);
      const nullifier = probeNullifier(qualifiedCoin, chainState, contractRecipient.right);
      const outputCommitment = ZswapOutput.newContractOwned(coinInfo, 0, contractRecipient.right).commitment;
      const partitioned: PartitionedTranscript = [
        makeTranscript([], [], []),
        makeTranscript([outputCommitment], [], [nullifier])
      ];
      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [qualifiedCoin],
        outputs: [{ coinInfo, recipient: { is_left: false, left: sampleCoinPublicKey(), right: contractRecipient.right } }]
      };
      // Act
      const result = zswapStateToSegmentedOffer(
        zswapState,
        randomEncryptionPublicKey(),
        { contractAddress: contractRecipient.right, zswapChainState: chainState },
        partitioned
      );
      // Assert
      expect(result.guaranteed).toBeUndefined();
      expect(result.fallible).toBeDefined();
      expect(result.fallible!.inputs.length).toBe(0);
      expect(result.fallible!.outputs.length).toBe(0);
      expect(result.fallible!.transients.length).toBe(1);
    });
  });

  describe('zswapStateToOffer resolver invocation', () => {
    test('invokes resolver per non-contract output recipient with the recipient cpk and returns the correct key per recipient', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const baseResolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);
      const spy = vi.fn(baseResolver);

      const walletOutput = {
        recipient: { is_left: true, left: walletCpk, right: sampleContractAddress() } as Recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 10n)
      };
      const burnOutput = {
        recipient: { is_left: true, left: SHIELDED_BURN_COIN_PUBLIC_KEY, right: sampleContractAddress() } as Recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 20n)
      };
      // Contract-owned output — the resolver must NOT be consulted for this branch.
      const contractOutput = {
        recipient: { is_left: false, left: sampleCoinPublicKey(), right: sampleContractAddress() } as Recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 30n)
      };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [walletOutput, burnOutput, contractOutput]
      };

      const result = zswapStateToOffer(zswapState, spy);

      expect(result).toBeDefined();
      expect(result?.outputs.length).toBe(3);
      // Two non-contract recipients → resolver invoked twice (contract-owned bypasses resolver).
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(walletCpk);
      expect(spy).toHaveBeenCalledWith(SHIELDED_BURN_COIN_PUBLIC_KEY);

      // Verify each recipient got its OWN key — not the wallet key reused for all outputs
      const resultsByCpk = new Map(
        spy.mock.calls.map((args, i) => {
          const mockResult = spy.mock.results[i];
          const value = mockResult?.type === 'return' ? mockResult.value : undefined;
          return [args[0], value];
        })
      );
      expect(resultsByCpk.get(walletCpk)).toBe(parseEncPublicKeyToHex(walletEpk, getNetworkId()));
      expect(resultsByCpk.get(SHIELDED_BURN_COIN_PUBLIC_KEY)).toBe(BURN_ENCRYPTION_PUBLIC_KEY);
    });

    test('throws when any non-contract recipient is unresolvable even if other recipients succeed', () => {
      const walletCpk = sampleCoinPublicKey();
      const walletEpk = sampleEncryptionPublicKey();
      const unknownCpk = sampleCoinPublicKey();
      const resolver = createEncryptionPublicKeyResolver(walletCpk, walletEpk);

      const walletOutput = {
        recipient: { is_left: true, left: walletCpk, right: sampleContractAddress() } as Recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 10n)
      };
      const unknownOutput = {
        recipient: { is_left: true, left: unknownCpk, right: sampleContractAddress() } as Recipient,
        coinInfo: createShieldedCoinInfo(nativeToken().raw, 20n)
      };

      const zswapState = {
        currentIndex: 0n,
        coinPublicKey: walletCpk,
        inputs: [],
        outputs: [walletOutput, unknownOutput]
      };

      expect(() => zswapStateToOffer(zswapState, resolver)).toThrow(/Unable to resolve encryption public key/);
    });
  });

describe('zswapCallsToSegmentedOffer (cross-contract shielded coins, issue #658)', () => {
  const makeTranscript = (
    claimedShieldedReceives: CoinCommitment[],
    claimedShieldedSpends: CoinCommitment[],
    claimedNullifiers: string[] = []
  ): Transcript<AlignedValue> => ({
    gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
    effects: {
      claimedNullifiers,
      claimedShieldedReceives,
      claimedShieldedSpends,
      claimedContractCalls: [],
      shieldedMints: new Map(),
      unshieldedInputs: new Map(),
      unshieldedOutputs: new Map(),
      unshieldedMints: new Map(),
      claimedUnshieldedSpends: new Map()
    },
    program: ['new', { noop: { n: 5 } }]
  });

  const toContract = (address: ContractAddress): Recipient => ({
    is_left: false,
    left: sampleCoinPublicKey(),
    right: address
  });

  const contractCommitment = (coin: ShieldedCoinInfo, address: ContractAddress): CoinCommitment =>
    ZswapOutput.newContractOwned(coin, 0, address).commitment;

  const guaranteedOnly = (claims: CoinCommitment[], nullifiers: string[] = []): PartitionedTranscript => [
    makeTranscript(claims, claims, nullifiers),
    undefined
  ];

  type SegmentedOffer = ReturnType<typeof zswapCallsToSegmentedOffer>['guaranteed'];
  const outputsOf = (offer: SegmentedOffer) => [...(offer?.outputs ?? [])];
  const inputsOf = (offer: SegmentedOffer) => [...(offer?.inputs ?? [])];
  const transientsOf = (offer: SegmentedOffer) => [...(offer?.transients ?? [])];

  it("includes a callee's output, which the root-only assembly used to drop", () => {
    // The heart of #658. The root moves no coins at all; the callee receives one. Assembling from
    // the root alone produced an empty offer while the callee's transcript claimed the receive,
    // which the ledger rejects as commitments != claimed_shielded_receives.
    const root = sampleContractAddress();
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, callee);

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: callee,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [{ coinInfo: coin, recipient: toContract(callee) }] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        },
        {
          contractAddress: root,
          zswapLocalState: { currentIndex: 0n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([])
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(outputsOf(result.guaranteed)).toHaveLength(1);
    expect(outputsOf(result.guaranteed)[0].commitment).toBe(commitment);
    expect(result.fallible).toBeUndefined();
  });

  it('collapses the send/receive pair for one coin into a single output', () => {
    // The sender's local state and the recipient's both carry the same coin: the sender created
    // it, the recipient claimed it. Two offer outputs for one commitment is "faerie gold" and the
    // ledger refuses to apply it, so the pair has to collapse.
    const sender = sampleContractAddress();
    const recipient = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, recipient);
    const sameOutput = { coinInfo: coin, recipient: toContract(recipient) };

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: recipient,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [sameOutput] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        },
        {
          contractAddress: sender,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [sameOutput] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(outputsOf(result.guaranteed)).toHaveLength(1);
    expect(outputsOf(result.guaranteed)[0].commitment).toBe(commitment);
  });

  it('keeps two contracts\' coins distinct when their coin info is identical', () => {
    // Buckets are keyed by commitment, which binds the recipient. Keying by serialized coin info
    // -- {nonce, type, value}, recipient dropped -- silently merged these into one output.
    const first = sampleContractAddress();
    const second = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const firstCommitment = contractCommitment(coin, first);
    const secondCommitment = contractCommitment(coin, second);
    expect(firstCommitment).not.toBe(secondCommitment);

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: first,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [{ coinInfo: coin, recipient: toContract(first) }] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([firstCommitment])
        },
        {
          contractAddress: second,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [{ coinInfo: coin, recipient: toContract(second) }] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([secondCommitment])
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(outputsOf(result.guaranteed).map((o) => o.commitment).sort()).toEqual(
      [firstCommitment, secondCommitment].sort()
    );
  });

  it('pairs an input with an output created by another call into a transient', () => {
    // The caller sends a coin to the callee; the callee receives it and immediately re-spends it.
    // The coin never settles on chain, so it must become a transient rather than an input needing
    // a Merkle path -- and the matching output must leave the offer.
    const caller = sampleContractAddress();
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, callee);
    const qualified: QualifiedShieldedCoinInfo = { ...coin, mt_index: 0n };

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: caller,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [{ coinInfo: coin, recipient: toContract(callee) }] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        },
        {
          contractAddress: callee,
          zswapLocalState: { currentIndex: 0n, coinPublicKey: sampleCoinPublicKey(), inputs: [qualified], outputs: [] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(transientsOf(result.guaranteed)).toHaveLength(1);
    expect(outputsOf(result.guaranteed)).toHaveLength(0);
    expect(inputsOf(result.guaranteed)).toHaveLength(0);
    // Which coin, and that it balances. `type` and `value` ride alongside the unproven item in the
    // bucket rather than inside it, so a count alone would not notice either being wrong — and a
    // mis-valued transient is what the ledger rejects.
    expect(transientsOf(result.guaranteed)[0].commitment).toBe(commitment);
    expect(result.guaranteed!.deltas.get(nativeToken().raw)).toBeUndefined();
  });

  it("binds a contract-owned input to the contract that spent it, not the root", () => {
    // A contract-owned nullifier is H(coin || sender), so attributing a callee's spend to the root
    // yields a nullifier the ledger cannot match against the callee's claim. Pinned by deriving
    // the expected nullifier independently for each address.
    const root = sampleContractAddress();
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);

    // The coin has to actually be in the tree before an input can be built against it: settle an
    // output addressed to the callee, then take the index the ledger assigned it. Handing
    // newContractOwned an mt_index with no leaf behind it fails with "invalid index into sparse
    // merkle tree" long before any nullifier is derived.
    const settled = ZswapOutput.newContractOwned(coin, 0, callee);
    const settledOffer = Transaction.fromParts(
      getNetworkId(),
      ZswapOffer.fromOutput(settled, nativeToken().raw, coin.value)
    ).eraseProofs().guaranteedOffer;
    expect(settledOffer).toBeDefined();
    const [applied, mtIndices] = new ZswapChainState().tryApply(settledOffer!);
    const mtIndex = mtIndices.get(settled.commitment);
    expect(mtIndex).toBeDefined();
    const chainState = applied.postBlockUpdate(new Date(), ZSWAP_MERKLE_ROOT_RETENTION_SECONDS);
    const qualified: QualifiedShieldedCoinInfo = { ...coin, mt_index: mtIndex! };

    // newContractOwned does not check that the leaf it opens was addressed to `contract`; it just
    // proves a path and hashes the coin with whoever is named as the spender. That is precisely
    // why attributing a callee's spend to the root is silently wrong rather than an error: it
    // produces a well-formed input carrying a nullifier the callee's claim can never match.
    const calleeNullifier = ZswapInput.newContractOwned(qualified, 0, callee, chainState).nullifier;
    const rootNullifier = ZswapInput.newContractOwned(qualified, 0, root, chainState).nullifier;
    expect(calleeNullifier).not.toBe(rootNullifier);

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: callee,
          zswapLocalState: { currentIndex: 0n, coinPublicKey: sampleCoinPublicKey(), inputs: [qualified], outputs: [] },
          zswapChainState: chainState,
          partitionedTranscript: guaranteedOnly([], [calleeNullifier])
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(inputsOf(result.guaranteed)).toHaveLength(1);
    expect(inputsOf(result.guaranteed)[0].nullifier).toBe(calleeNullifier);
  });

  it('names the contract when a call spends a settled coin with no chain state available', () => {
    // A callee that only receives needs no chain state; one that spends a settled coin of its own
    // does, and the root's view has that callee's leaves collapsed out of it. Failing loudly here
    // beats building a path against the wrong tree.
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);

    expect(() =>
      zswapCallsToSegmentedOffer(
        [
          {
            contractAddress: callee,
            zswapLocalState: {
              currentIndex: 0n,
              coinPublicKey: sampleCoinPublicKey(),
              inputs: [{ ...coin, mt_index: 0n }],
              outputs: []
            },
            zswapChainState: undefined,
            partitionedTranscript: guaranteedOnly([])
          }
        ],
        randomEncryptionPublicKey()
      )
    ).toThrow(/Zswap chain state for contract/);
  });

  it('rejects a coin two calls route to different segments', () => {
    // Sequencing forbids a guaranteed call from containing a fallible one, so the send and the
    // receive of one coin always share a segment. Disagreement means the local states and the
    // transcripts are inconsistent; picking one silently would build an offer the ledger rejects.
    const sender = sampleContractAddress();
    const recipient = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, recipient);
    const sameOutput = { coinInfo: coin, recipient: toContract(recipient) };

    expect(() =>
      zswapCallsToSegmentedOffer(
        [
          {
            contractAddress: sender,
            zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [sameOutput] },
            zswapChainState: undefined,
            partitionedTranscript: [makeTranscript([commitment], [commitment]), makeTranscript([], [])]
          },
          {
            contractAddress: recipient,
            zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [sameOutput] },
            zswapChainState: undefined,
            partitionedTranscript: [makeTranscript([], []), makeTranscript([commitment], [commitment])]
          }
        ],
        randomEncryptionPublicKey()
      )
    ).toThrow(/segment 0 by one call and segment 1 by another/);
  });

  it('routes a repeated coin by every transcript of the contract that owns it', () => {
    // A contract's Zswap local state is one accumulator, so a second call into it reports the coin
    // the first call created — and only the first call's transcript claims it. Routing that second
    // report against the second call's transcript alone found nothing and, both halves being
    // present, called it a mismatch between local state and declared effects.
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, callee);
    const carried = { coinInfo: coin, recipient: toContract(callee) };

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: callee,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [carried] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        },
        {
          contractAddress: callee,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [carried] },
          zswapChainState: undefined,
          partitionedTranscript: [makeTranscript([], []), makeTranscript([], [])]
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(outputsOf(result.guaranteed)).toHaveLength(1);
    expect(outputsOf(result.guaranteed)[0].commitment).toBe(commitment);
    expect(result.fallible).toBeUndefined();
  });

  it('keeps a repeated coin in the segment the call that moved it claimed', () => {
    // The same accumulator, claimed in the fallible section. The second report matched nothing on
    // its own, fell back to guaranteed, and the two reports of one commitment then disagreed —
    // failing as a segment conflict rather than as the repeat it is.
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, callee);
    const carried = { coinInfo: coin, recipient: toContract(callee) };

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: callee,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [carried] },
          zswapChainState: undefined,
          partitionedTranscript: [makeTranscript([], []), makeTranscript([commitment], [commitment])]
        },
        {
          contractAddress: callee,
          zswapLocalState: { currentIndex: 1n, coinPublicKey: sampleCoinPublicKey(), inputs: [], outputs: [carried] },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([])
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(outputsOf(result.fallible)).toHaveLength(1);
    expect(outputsOf(result.fallible)[0].commitment).toBe(commitment);
    expect(result.guaranteed).toBeUndefined();
  });

  it('folds a repeated create-and-spend into one transient when the same contract is called twice', () => {
    // The accumulator again, but for a coin the contract both created and spent. Pass 1 collapses
    // the repeat by commitment and pass 2's settled branch overwrites by nullifier, so both are
    // idempotent; the transient branch is not — it moves the output out of the bucket, so a second
    // report of the same input finds the commitment still in `segmentOfOutput` and nothing left
    // under it. Two calls into one contract is enough to reach it (coip-0003-impl-midnight-js
    // item 3).
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, callee);
    const state = {
      currentIndex: 1n,
      coinPublicKey: sampleCoinPublicKey(),
      inputs: [{ ...coin, mt_index: 0n }],
      outputs: [{ coinInfo: coin, recipient: toContract(callee) }]
    };

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: callee,
          zswapLocalState: state,
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        },
        {
          contractAddress: callee,
          zswapLocalState: state,
          zswapChainState: undefined,
          partitionedTranscript: [makeTranscript([], []), makeTranscript([], [])]
        }
      ],
      randomEncryptionPublicKey()
    );

    // One coin, so one transient and no loose output: the pair was folded, not counted twice.
    expect(transientsOf(result.guaranteed)).toHaveLength(1);
    expect(outputsOf(result.guaranteed)).toHaveLength(0);
    expect(inputsOf(result.guaranteed)).toHaveLength(0);
    expect(result.fallible).toBeUndefined();
    // And it is that coin, folded once and balancing: two reports of one coin must not double its
    // value into the delta.
    expect(transientsOf(result.guaranteed)[0].commitment).toBe(commitment);
    expect(result.guaranteed!.deltas.get(nativeToken().raw)).toBeUndefined();
  });

  it('collects coins a callee addressed to the wallet, not just the root call\'s', () => {
    // The offers come from every call, so a coin a callee sends the invoking wallet is really
    // created; reporting only the root's left the caller unaware of a coin it owns.
    const cpk = sampleCoinPublicKey();
    const toWallet = (coinInfo: ShieldedCoinInfo) => ({ coinInfo, recipient: { is_left: true, left: cpk, right: sampleContractAddress() } });
    const fromCallee = createShieldedCoinInfo(nativeToken().raw, 7n);
    const fromRoot = createShieldedCoinInfo(nativeToken().raw, 11n);
    const state = (outputs: ReturnType<typeof toWallet>[]) => ({
      currentIndex: 0n,
      coinPublicKey: cpk,
      inputs: [],
      outputs
    });

    expect(zswapCallsToNewCoins(cpk, [state([toWallet(fromCallee)]), state([toWallet(fromRoot)])])).toEqual([
      fromCallee,
      fromRoot
    ]);
  });

  it('reports a coin once when the contract that created it was called twice', () => {
    // The per-contract accumulator again: the second call reports the first call's output too.
    const cpk = sampleCoinPublicKey();
    const coinInfo = createShieldedCoinInfo(nativeToken().raw, 7n);
    const carried = { coinInfo, recipient: { is_left: true, left: cpk, right: sampleContractAddress() } };
    const state = { currentIndex: 0n, coinPublicKey: cpk, inputs: [], outputs: [carried] };

    expect(zswapCallsToNewCoins(cpk, [state, state])).toEqual([coinInfo]);
  });

  it('pairs a coin into a transient whatever index it reports, since that tree has one leaf', () => {
    // `mt_index` is a position among the transaction's commitments — the coordinate the settled
    // path proves against. A transient's tree carries exactly one leaf, this coin's own output, so
    // the input half is proved at 0 no matter what the runtime reported. Passing the reported index
    // through instead builds a path the sparse tree allows and the proof cannot satisfy.
    const callee = sampleContractAddress();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const commitment = contractCommitment(coin, callee);

    const result = zswapCallsToSegmentedOffer(
      [
        {
          contractAddress: callee,
          zswapLocalState: {
            currentIndex: 1n,
            coinPublicKey: sampleCoinPublicKey(),
            inputs: [{ ...coin, mt_index: 7n }],
            outputs: [{ coinInfo: coin, recipient: toContract(callee) }]
          },
          zswapChainState: undefined,
          partitionedTranscript: guaranteedOnly([commitment])
        }
      ],
      randomEncryptionPublicKey()
    );

    expect(transientsOf(result.guaranteed)).toHaveLength(1);
    expect(transientsOf(result.guaranteed)[0].commitment).toBe(commitment);
    expect(outputsOf(result.guaranteed)).toHaveLength(0);
    expect(result.guaranteed!.deltas.get(nativeToken().raw)).toBeUndefined();
  });
});

});
