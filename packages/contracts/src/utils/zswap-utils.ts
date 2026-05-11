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
  type AlignedValue,
  type CoinCommitment,
  coinCommitment,
  type CoinPublicKey,
  type ContractAddress,
  type EncPublicKey,
  type Nullifier,
  type PartitionedTranscript,
  type QualifiedShieldedCoinInfo,
  type ShieldedCoinInfo,
  type Transcript,
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

export const GUARANTEED_SEGMENT_NUMBER = 0;
export const FALLIBLE_SEGMENT_NUMBER = 1;

type SegmentBucket = {
  outputs: Map<string, UnprovenOutput>;
  inputs: Map<string, UnprovenInput>;
  transients: Map<string, UnprovenTransient>;
};

const emptyBucket = (): SegmentBucket => ({
  outputs: new Map(),
  inputs: new Map(),
  transients: new Map()
});

type SegmentMatchPredicate = (transcript: Transcript<AlignedValue>) => boolean;

const segmentForMatch = (
  matches: SegmentMatchPredicate,
  partitionedTranscript: PartitionedTranscript,
  errorContext: string
): 0 | 1 => {
  const [guaranteed, fallible] = partitionedTranscript;
  if (guaranteed !== undefined && matches(guaranteed)) return GUARANTEED_SEGMENT_NUMBER;
  if (fallible !== undefined && matches(fallible)) return FALLIBLE_SEGMENT_NUMBER;
  // Both halves provided but neither matches: surface loudly. Silent fall-through
  // to segment 0 would re-introduce the exact failure mode this helper exists to fix.
  if (guaranteed !== undefined && fallible !== undefined) {
    throw new Error(
      `${errorContext} not present in either segment of the partitioned transcript. ` +
        `Local zswap state does not match the contract's declared effects.`
    );
  }
  // No segment information available (no-transcript callers) — place in guaranteed.
  return GUARANTEED_SEGMENT_NUMBER;
};

// Ledger routes outputs by union of receives ∪ spends — user-bound outputs appear
// in `claimedShieldedSpends`, contract-owned in `claimedShieldedReceives`.
const segmentForCommitment = (
  commitment: CoinCommitment,
  partitionedTranscript: PartitionedTranscript
): 0 | 1 =>
  segmentForMatch(
    (t) =>
      t.effects.claimedShieldedReceives.includes(commitment) ||
      t.effects.claimedShieldedSpends.includes(commitment),
    partitionedTranscript,
    `Shielded commitment ${commitment}`
  );

const segmentForNullifier = (
  nullifier: Nullifier,
  partitionedTranscript: PartitionedTranscript
): 0 | 1 =>
  segmentForMatch(
    (t) => t.effects.claimedNullifiers.includes(nullifier),
    partitionedTranscript,
    `Shielded nullifier ${nullifier}`
  );

const mergeOffers = (...offers: (UnprovenOffer | undefined)[]): UnprovenOffer | undefined => {
  const defined = offers.filter((o): o is UnprovenOffer => o != null);
  if (defined.length === 0) return undefined;
  return defined.reduce((acc, curr) => acc.merge(curr));
};

const bucketToOffer = (bucket: SegmentBucket): UnprovenOffer | undefined =>
  mergeOffers(
    unprovenOfferFromMap(bucket.inputs, ZswapOffer.fromInput),
    unprovenOfferFromMap(bucket.outputs, ZswapOffer.fromOutput),
    unprovenOfferFromMap(bucket.transients, ZswapOffer.fromTransient)
  );

/**
 * Builds segment-aware {@link UnprovenOffer}s from a {@link ZswapLocalState}.
 *
 * Routing matches the ledger's reference implementation
 * (`midnight-ledger/ledger/src/construct.rs`):
 * - Outputs: commitment ∈ `claimedShieldedReceives ∪ claimedShieldedSpends`.
 * - Inputs: nullifier ∈ `claimedNullifiers`.
 * - Transients: input and matching output must agree on segment; cross-segment
 *   pairing is rejected as a local-state / transcript inconsistency.
 *
 * When both transcript halves are provided and an item matches neither, this
 * function throws. When the transcript (or a half) is `undefined`, unmatched
 * items fall back to the guaranteed segment for backwards compatibility —
 * see {@link zswapStateToOffer}.
 */
export const zswapStateToSegmentedOffer = (
  zswapLocalState: ZswapLocalState,
  encryptionPublicKeyOrResolver: EncPublicKey | EncryptionPublicKeyResolver,
  addressAndChainStateTuple?: { contractAddress: ContractAddress; zswapChainState: ZswapChainState },
  partitionedTranscript: PartitionedTranscript = [undefined, undefined]
): { guaranteed: UnprovenOffer | undefined; fallible: UnprovenOffer | undefined } => {
  const resolver: EncryptionPublicKeyResolver =
    typeof encryptionPublicKeyOrResolver === 'function'
      ? encryptionPublicKeyOrResolver
      : () => encryptionPublicKeyOrResolver;

  const buckets: Record<0 | 1, SegmentBucket> = {
    [GUARANTEED_SEGMENT_NUMBER]: emptyBucket(),
    [FALLIBLE_SEGMENT_NUMBER]: emptyBucket()
  };

  const rehashedChainState = addressAndChainStateTuple?.zswapChainState.postBlockUpdate(new Date());

  for (const output of zswapLocalState.outputs) {
    if (output.recipient.is_left) {
      // coinCommitment avoids invoking the encryption-key resolver twice.
      const commitment = coinCommitment(output.coinInfo, output.recipient.left);
      const segment = segmentForCommitment(commitment, partitionedTranscript);
      buckets[segment].outputs.set(
        serializeCoinInfo(output.coinInfo),
        createZswapOutput(output, resolver, segment)
      );
    } else {
      // No public commitment helper for contract-owned outputs; probe with segment 0.
      // The commitment is segment-independent (pinned by invariant tests), so the
      // probe is reused as the final output when routing settles on guaranteed.
      const contractAddress = output.recipient.right;
      const probe = ZswapOutput.newContractOwned(output.coinInfo, GUARANTEED_SEGMENT_NUMBER, contractAddress);
      const segment = segmentForCommitment(probe.commitment, partitionedTranscript);
      const finalOutput =
        segment === GUARANTEED_SEGMENT_NUMBER
          ? probe
          : ZswapOutput.newContractOwned(output.coinInfo, segment, contractAddress);
      buckets[segment].outputs.set(serializeCoinInfo(output.coinInfo), finalOutput);
    }
  }

  for (const qualifiedCoinInfo of zswapLocalState.inputs) {
    const serializedCoinInfo = serializeQualifiedShieldedCoinInfo(qualifiedCoinInfo);

    const guaranteedCandidate = buckets[GUARANTEED_SEGMENT_NUMBER].outputs.get(serializedCoinInfo);
    const fallibleCandidate = buckets[FALLIBLE_SEGMENT_NUMBER].outputs.get(serializedCoinInfo);

    if (guaranteedCandidate !== undefined && fallibleCandidate !== undefined) {
      throw new Error(
        `Ambiguous transient: outputs with serialized coin info ${serializedCoinInfo} ` +
          `exist in both segments — wallet-owned input cannot pair unambiguously.`
      );
    }

    if (guaranteedCandidate !== undefined || fallibleCandidate !== undefined) {
      const transientSegment: 0 | 1 =
        guaranteedCandidate !== undefined ? GUARANTEED_SEGMENT_NUMBER : FALLIBLE_SEGMENT_NUMBER;
      const candidateOutput = (guaranteedCandidate ?? fallibleCandidate)!;
      buckets[transientSegment].transients.set(
        serializedCoinInfo,
        ZswapTransient.newFromContractOwnedOutput(qualifiedCoinInfo, transientSegment, candidateOutput)
      );
      buckets[transientSegment].outputs.delete(serializedCoinInfo);
      continue;
    }

    assertDefined(
      addressAndChainStateTuple,
      `Wallet-owned input requires a chain state for ZswapInput.newContractOwned`
    );
    assertDefined(
      rehashedChainState,
      `Wallet-owned input requires a chain state for ZswapInput.newContractOwned`
    );
    assertIsContractAddress(addressAndChainStateTuple.contractAddress);

    // Probe segment 0 — nullifier is segment-independent (pinned by invariant test).
    // Probe doubles as the final input when routing settles on guaranteed.
    const probeInput = ZswapInput.newContractOwned(
      qualifiedCoinInfo,
      GUARANTEED_SEGMENT_NUMBER,
      addressAndChainStateTuple.contractAddress,
      rehashedChainState
    );
    const segment = segmentForNullifier(probeInput.nullifier, partitionedTranscript);

    buckets[segment].inputs.set(
      serializedCoinInfo,
      segment === GUARANTEED_SEGMENT_NUMBER
        ? probeInput
        : ZswapInput.newContractOwned(
            qualifiedCoinInfo,
            segment,
            addressAndChainStateTuple.contractAddress,
            rehashedChainState
          )
    );
  }

  return {
    guaranteed: bucketToOffer(buckets[GUARANTEED_SEGMENT_NUMBER]),
    fallible: bucketToOffer(buckets[FALLIBLE_SEGMENT_NUMBER])
  };
};

/**
 * Builds a single guaranteed-segment {@link UnprovenOffer} from a
 * {@link ZswapLocalState} for callers with no partitioned transcript (deploy
 * path and pre-segmentation tests). Thin wrapper over
 * {@link zswapStateToSegmentedOffer}; contract-call paths must pass a
 * transcript to the segmented function directly.
 */
export const zswapStateToOffer = (
  zswapLocalState: ZswapLocalState,
  encryptionPublicKeyOrResolver: EncPublicKey | EncryptionPublicKeyResolver,
  addressAndChainStateTuple?: { contractAddress: ContractAddress; zswapChainState: ZswapChainState }
): UnprovenOffer | undefined =>
  zswapStateToSegmentedOffer(zswapLocalState, encryptionPublicKeyOrResolver, addressAndChainStateTuple).guaranteed;
