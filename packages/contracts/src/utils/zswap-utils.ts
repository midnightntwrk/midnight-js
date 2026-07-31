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

export const zswapStateToNewCoins = (receiverCoinPublicKey: CoinPublicKey, zswapState: ZswapLocalState): ShieldedCoinInfo[] =>
  zswapState.outputs
    .filter((output) => output.recipient.left === receiverCoinPublicKey)
    .map(({ coinInfo }) => coinInfo);

/**
 * The coins a transaction creates for one wallet, taken from every call in the tree rather than the
 * root alone — any callee can address a coin to the invoking wallet, and since the offers are
 * assembled from every call, such a coin really is created.
 *
 * De-duplicated by coin contents: a contract's Zswap local state is a per-contract accumulator, so
 * a contract called twice reports the same output twice. The recipient is fixed across the whole
 * result, so contents are identity here.
 */
export const zswapCallsToNewCoins = (
  receiverCoinPublicKey: CoinPublicKey,
  zswapStates: readonly ZswapLocalState[]
): ShieldedCoinInfo[] =>
  Array.from(
    new Map(
      zswapStates
        .flatMap((zswapState) => zswapStateToNewCoins(receiverCoinPublicKey, zswapState))
        .map((coinInfo) => [serializeCoinInfo(coinInfo), coinInfo])
    ).values()
  );

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

/**
 * Seconds of past Merkle-tree roots to retain when rehashing a `ZswapChainState`
 * via `postBlockUpdate`. ledger-v9 made this argument required (it was implicit
 * in ledger-v8). It governs retention of historical roots only — not the current
 * root used here for nullifier derivation — so a one-hour window mirrors the
 * existing `ttlOneHour` convention.
 */
export const ZSWAP_MERKLE_ROOT_RETENTION_SECONDS = 3600n;

/**
 * One bucketed offer item, carrying the token type and value the offer's delta is derived from.
 * Held alongside the item because the bucket is keyed by commitment or nullifier rather than by
 * serialized coin info, so the key can no longer be decoded back into `{type, value}`.
 */
type BucketEntry<U> = {
  readonly unproven: U;
  readonly type: string;
  readonly value: bigint;
};

/**
 * Items destined for one segment's offer.
 *
 * Outputs and transients are keyed by coin commitment, inputs by nullifier. Both keys already
 * incorporate the owner — a commitment is `H(coin ‖ recipient)` and a nullifier `H(coin ‖ sender)`
 * — which is what makes a single shared set of buckets correct across the whole call tree:
 *
 *  - The same coin sent by one contract and received by another appears in *both* contracts' local
 *    states, and must reach the ledger as exactly one output (a duplicate commitment is rejected
 *    as "faerie gold"). Keying by commitment collapses the pair automatically.
 *  - Two contracts holding coins with identical `{nonce, type, value}` stay distinct, because
 *    their commitments differ by recipient. Keying by serialized coin info would have merged them.
 */
type SegmentBucket = {
  outputs: Map<string, BucketEntry<UnprovenOutput>>;
  inputs: Map<string, BucketEntry<UnprovenInput>>;
  transients: Map<string, BucketEntry<UnprovenTransient>>;
};

const emptyBucket = (): SegmentBucket => ({
  outputs: new Map(),
  inputs: new Map(),
  transients: new Map()
});

type SegmentMatchPredicate = (transcript: Transcript<AlignedValue>) => boolean;

const segmentForMatch = (
  matches: SegmentMatchPredicate,
  partitionedTranscripts: readonly PartitionedTranscript[],
  errorContext: string
): 0 | 1 => {
  // Every transcript the owning contract produced, not just the calling one: its Zswap local state
  // is a single accumulator, so a second call into it reports coins the first call moved, and only
  // the first call's transcript claims them. Guaranteed keeps precedence, as for one transcript.
  if (partitionedTranscripts.some(([guaranteed]) => guaranteed !== undefined && matches(guaranteed))) {
    return GUARANTEED_SEGMENT_NUMBER;
  }
  if (partitionedTranscripts.some(([, fallible]) => fallible !== undefined && matches(fallible))) {
    return FALLIBLE_SEGMENT_NUMBER;
  }
  // Both halves provided but neither matches: surface loudly. Silent fall-through
  // to segment 0 would re-introduce the exact failure mode this helper exists to fix.
  if (partitionedTranscripts.some(([guaranteed, fallible]) => guaranteed !== undefined && fallible !== undefined)) {
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
  partitionedTranscripts: readonly PartitionedTranscript[]
): 0 | 1 =>
  segmentForMatch(
    (t) =>
      t.effects.claimedShieldedReceives.includes(commitment) ||
      t.effects.claimedShieldedSpends.includes(commitment),
    partitionedTranscripts,
    `Shielded commitment ${commitment}`
  );

const segmentForNullifier = (
  nullifier: Nullifier,
  partitionedTranscripts: readonly PartitionedTranscript[]
): 0 | 1 =>
  segmentForMatch(
    (t) => t.effects.claimedNullifiers.includes(nullifier),
    partitionedTranscripts,
    `Shielded nullifier ${nullifier}`
  );

const mergeOffers = (...offers: (UnprovenOffer | undefined)[]): UnprovenOffer | undefined => {
  const defined = offers.filter((o): o is UnprovenOffer => o != null);
  if (defined.length === 0) return undefined;
  return defined.reduce((acc, curr) => acc.merge(curr));
};

const entriesToOffer = <U extends UnprovenInput | UnprovenOutput | UnprovenTransient>(
  entries: Map<string, BucketEntry<U>>,
  f: (u: U, type: string, value: bigint) => UnprovenOffer
): UnprovenOffer | undefined => {
  if (entries.size === 0) {
    return undefined;
  }
  return Array.from(entries.values(), ({ unproven, type, value }) => f(unproven, type, value)).reduce((acc, curr) =>
    acc.merge(curr)
  );
};

const bucketToOffer = (bucket: SegmentBucket): UnprovenOffer | undefined =>
  mergeOffers(
    entriesToOffer(bucket.inputs, ZswapOffer.fromInput),
    entriesToOffer(bucket.outputs, ZswapOffer.fromOutput),
    entriesToOffer(bucket.transients, ZswapOffer.fromTransient)
  );

/**
 * The shielded-coin activity of a single contract call, as one contribution to the transaction's
 * offers.
 */
export type ZswapCallContribution = {
  /**
   * The contract that executed this call. It owns every entry in `zswapLocalState.inputs` — a
   * contract-owned nullifier is `H(coin ‖ sender)`, so attributing an input to the wrong contract
   * produces a nullifier the ledger will not match against the transcript's claim.
   */
  readonly contractAddress: ContractAddress | undefined;
  /**
   * This contract's shielded coins as of this call's return. One accumulator per contract, not per
   * call: a contract called twice reports the first call's coins again in the second's state.
   */
  readonly zswapLocalState: ZswapLocalState;
  /**
   * This contract's Zswap chain state. Only required if the call spends a coin that is already
   * settled on chain; a call that merely creates coins, or that spends one created in this same
   * transaction (which becomes a transient), needs none.
   */
  readonly zswapChainState: ZswapChainState | undefined;
  /**
   * This call's own transcript halves. An item is routed by looking it up across every transcript
   * the owning contract produced — a callee's commitments and nullifiers are absent from the
   * root's transcript, and a coin carried into a later call was claimed in an earlier one's.
   */
  readonly partitionedTranscript: PartitionedTranscript;
};

type ShieldedOutput = ZswapLocalState['outputs'][number];
type ShieldedInput = ZswapLocalState['inputs'][number];

/**
 * An output with its identity resolved. The commitment is what bucketing, de-duplication and
 * transient pairing all key on, and deriving it differs by recipient, so it is derived once here
 * rather than inside the routing loop.
 */
type ResolvedOutput = {
  readonly commitment: CoinCommitment;
  readonly coinInfo: ShieldedCoinInfo;
  readonly build: (segment: 0 | 1) => UnprovenOutput;
};

const resolveOutput = (output: ShieldedOutput, resolver: EncryptionPublicKeyResolver): ResolvedOutput => {
  if (output.recipient.is_left) {
    // coinCommitment avoids invoking the encryption-key resolver twice.
    return {
      commitment: coinCommitment(output.coinInfo, output.recipient.left),
      coinInfo: output.coinInfo,
      build: (segment) => createZswapOutput(output, resolver, segment)
    };
  }
  // No public commitment helper for contract-owned outputs; probe with segment 0. The commitment is
  // segment-independent (pinned by invariant tests), so the probe is reused as the final output when
  // routing settles on guaranteed.
  const address = output.recipient.right;
  const probe = ZswapOutput.newContractOwned(output.coinInfo, GUARANTEED_SEGMENT_NUMBER, address);
  return {
    commitment: probe.commitment,
    coinInfo: output.coinInfo,
    build: (segment) =>
      segment === GUARANTEED_SEGMENT_NUMBER ? probe : ZswapOutput.newContractOwned(output.coinInfo, segment, address)
  };
};

/**
 * Who owns the coins in one activity. A call knows its contract, and a contract-owned coin's
 * commitment and nullifier both bind that address. The single-state entry points know only that a
 * coin moved, so an input there can be paired to an output by coin info and nothing else.
 */
type ShieldedOwner =
  | { readonly kind: 'contract'; readonly address: ContractAddress; readonly chainState: ZswapChainState | undefined }
  | { readonly kind: 'unattributed' };

/**
 * One owner's shielded activity across the whole call tree — the unit routing works in, as against
 * the per-call unit it arrives in. A contract's Zswap local state is a single accumulator, so N
 * calls into it report the same coins N times; folding those together first is what leaves every
 * collision below meaning what it says, two *different* owners meeting on one coin.
 */
type OwnerActivity = {
  readonly owner: ShieldedOwner;
  readonly outputs: readonly ResolvedOutput[];
  readonly inputs: readonly ShieldedInput[];
  readonly transcripts: readonly PartitionedTranscript[];
};

/** Identity of an input: the coin, plus where it sits in the tree. */
const inputKey = ({ mt_index, ...coinInfo }: ShieldedInput): string => `${serializeCoinInfo(coinInfo)}|${mt_index}`;

/**
 * Folds per-call contributions into one activity per owner.
 *
 * Coins are unioned by identity rather than taken from the last snapshot. The snapshots are views of
 * one growing accumulator, so their union *is* that accumulator — and unlike keeping the last, it
 * does not depend on where in the trace each call happened to land. Transcripts are kept in full: an
 * item is routed against every transcript its owner produced, because a coin carried into a later
 * call was claimed in an earlier one's.
 */
const groupByOwner = (
  contributions: readonly ZswapCallContribution[],
  resolver: EncryptionPublicKeyResolver
): readonly OwnerActivity[] => {
  type Draft = {
    owner: ShieldedOwner;
    readonly outputs: Map<string, ResolvedOutput>;
    readonly inputs: Map<string, ShieldedInput>;
    readonly transcripts: PartitionedTranscript[];
  };
  const drafts = new Map<string, Draft>();
  for (const { contractAddress, zswapLocalState, zswapChainState, partitionedTranscript } of contributions) {
    if (contractAddress !== undefined) assertIsContractAddress(contractAddress);
    const key = contractAddress === undefined ? '' : String(contractAddress);
    let draft = drafts.get(key);
    if (draft === undefined) {
      draft = {
        owner:
          contractAddress === undefined
            ? { kind: 'unattributed' }
            : { kind: 'contract', address: contractAddress, chainState: zswapChainState },
        outputs: new Map(),
        inputs: new Map(),
        transcripts: []
      };
      drafts.set(key, draft);
    } else if (draft.owner.kind === 'contract' && draft.owner.chainState === undefined) {
      // Chain state is only needed to spend a settled coin, so the call that reports the spend is
      // not necessarily the one that carried it.
      draft.owner = { ...draft.owner, chainState: zswapChainState };
    }
    draft.transcripts.push(partitionedTranscript);
    for (const output of zswapLocalState.outputs) {
      const resolved = resolveOutput(output, resolver);
      draft.outputs.set(resolved.commitment, resolved);
    }
    for (const input of zswapLocalState.inputs) draft.inputs.set(inputKey(input), input);
  }
  return Array.from(drafts.values(), ({ owner, outputs, inputs, transcripts }) => ({
    owner,
    outputs: Array.from(outputs.values()),
    inputs: Array.from(inputs.values()),
    transcripts
  }));
};

/**
 * The output an unattributed input was paired with, found by coin contents alone. Only the
 * single-state entry points reach this: a call knows its contract, and a contract-owned commitment
 * binds that address, so the coin identifies its output exactly.
 */
const soleCommitmentFor = (
  coinInfo: ShieldedCoinInfo,
  commitmentsByCoinInfo: ReadonlyMap<string, readonly CoinCommitment[]>
): CoinCommitment | undefined => {
  const candidates = commitmentsByCoinInfo.get(serializeCoinInfo(coinInfo)) ?? [];
  if (candidates.length > 1) {
    throw new Error(
      `Ambiguous transient: ${candidates.length} outputs carry the coin info of an input whose ` +
        `spending contract is unknown, so the pair cannot be identified. Supply the contract ` +
        `address that spent it.`
    );
  }
  return candidates[0];
};

/**
 * Builds the transaction's segmented {@link UnprovenOffer}s from the shielded activity of *every*
 * contract call, not just the root.
 *
 * A shielded coin addressed to a contract is only credited if that contract claims the receive in
 * the same transaction, which for a cross-contract callee means running `receiveShielded` during
 * the call. Its coins therefore have to reach the offers, and each contract-owned input has to be
 * bound to the contract that actually spent it.
 *
 * Routing still matches the ledger's reference implementation
 * (`midnight-ledger/ledger/src/construct.rs`), applied per call:
 * - Outputs: commitment ∈ that call's `claimedShieldedReceives ∪ claimedShieldedSpends`.
 * - Inputs: nullifier ∈ that call's `claimedNullifiers`.
 * - Transients: an input pairs with an output for the same coin *and the same owner*, found
 *   anywhere in the call tree — the coin a callee re-spends was typically created by its caller.
 */
export const zswapCallsToSegmentedOffer = (
  contributions: readonly ZswapCallContribution[],
  encryptionPublicKeyOrResolver: EncPublicKey | EncryptionPublicKeyResolver
): { guaranteed: UnprovenOffer | undefined; fallible: UnprovenOffer | undefined } => {
  const resolver: EncryptionPublicKeyResolver =
    typeof encryptionPublicKeyOrResolver === 'function'
      ? encryptionPublicKeyOrResolver
      : () => encryptionPublicKeyOrResolver;

  const activities = groupByOwner(contributions, resolver);

  const buckets: Record<0 | 1, SegmentBucket> = {
    [GUARANTEED_SEGMENT_NUMBER]: emptyBucket(),
    [FALLIBLE_SEGMENT_NUMBER]: emptyBucket()
  };
  const segmentOfOutput = new Map<string, 0 | 1>();
  // Read only by the unattributed arm of pass 2, which has no address to derive a commitment from.
  const commitmentsByCoinInfo = new Map<string, CoinCommitment[]>();

  // Pass 1 — every output. Keyed by commitment, so one coin sent by a contract and received by
  // another collapses to a single offer output; a duplicate commitment is rejected on chain as
  // "faerie gold".
  for (const { outputs, transcripts } of activities) {
    for (const { commitment, coinInfo, build } of outputs) {
      const segment = segmentForCommitment(commitment, transcripts);
      const already = segmentOfOutput.get(commitment);
      if (already !== undefined) {
        // Two owners on one coin — the send/receive pair. Sequencing forbids a call in the
        // guaranteed section from containing a fallible one, so both sides must agree; if they do
        // not, the local states and the transcripts disagree and silently picking one would produce
        // an offer the ledger rejects.
        if (already !== segment) {
          throw new Error(
            `Shielded commitment ${commitment} is claimed in segment ${already} by one call and ` +
              `segment ${segment} by another; the calls' transcripts disagree.`
          );
        }
        continue;
      }
      segmentOfOutput.set(commitment, segment);
      const serialized = serializeCoinInfo(coinInfo);
      const sameCoinInfo = commitmentsByCoinInfo.get(serialized);
      if (sameCoinInfo === undefined) commitmentsByCoinInfo.set(serialized, [commitment]);
      else sameCoinInfo.push(commitment);
      buckets[segment].outputs.set(commitment, {
        unproven: build(segment),
        type: coinInfo.type,
        value: coinInfo.value
      });
    }
  }

  // Pass 2 — inputs, once every output is known, so a coin created and spent in the same
  // transaction can be recognised and folded into a transient.
  for (const { owner, inputs, transcripts } of activities) {
    // Rehashing walks the whole tree, and every input of one owner proves against the same root, so
    // it is done once per owner and only if a settled coin actually asks for it.
    let rehashedChainState: ZswapChainState | undefined;

    for (const qualifiedCoinInfo of inputs) {
      const { mt_index: _mtIndex, ...coinInfo } = qualifiedCoinInfo;

      // A contract's own coin: commitment and nullifier both bind this contract's address, so the
      // pairing below cannot cross owners by accident. An unattributed state has no address to bind
      // — and an input that pairs into a transient never needs one, since the ledger takes the
      // output object rather than rebuilding a commitment — so fall back to the coin itself there,
      // and refuse to guess when it names more than one output.
      const ownCommitment =
        owner.kind === 'contract'
          ? ZswapOutput.newContractOwned(coinInfo, GUARANTEED_SEGMENT_NUMBER, owner.address).commitment
          : soleCommitmentFor(coinInfo, commitmentsByCoinInfo);
      const transientSegment = ownCommitment === undefined ? undefined : segmentOfOutput.get(ownCommitment);

      if (ownCommitment !== undefined && transientSegment !== undefined) {
        // Each coin is visited once per owner, so a commitment that routed here still has its
        // output: an absence is a real invariant violation, not a repeat.
        const candidate = buckets[transientSegment].outputs.get(ownCommitment);
        assertDefined(candidate, `bucketed output for transient commitment ${ownCommitment}`);
        // The input half is proved against a tree holding exactly one leaf — this coin's own
        // output, at index 0 (`zswap/src/construct.rs:394-397` -> `:197`, where the leaf asserted
        // is the coin's own commitment). `mt_index` as reported is a position among the
        // transaction's commitments, which is what the settled path proves against and the wrong
        // coordinate here: a coin pairing into a transient always sits at 0 of that tree. Passing
        // the reported index through claims membership where the leaf is not, which the sparse
        // tree will build a path for and the proof will not satisfy.
        buckets[transientSegment].transients.set(ownCommitment, {
          unproven: ZswapTransient.newFromContractOwnedOutput(
            { ...qualifiedCoinInfo, mt_index: 0n },
            transientSegment,
            candidate.unproven
          ),
          type: coinInfo.type,
          value: coinInfo.value
        });
        buckets[transientSegment].outputs.delete(ownCommitment);
        continue;
      }

      // Settled coin: it has to be proved against the commitment tree, which needs both the
      // contract that owns it (the nullifier binds the spender) and that contract's own view of
      // the tree — the root's view has every other contract's leaves collapsed out of it.
      if (owner.kind !== 'contract') {
        throw new Error(
          `A call that spends a settled shielded coin must name the contract that spent it, since ` +
            `the nullifier binds the spender. Only an input that pairs into a transient can be ` +
            `assembled without one.`
        );
      }
      const { address, chainState } = owner;
      assertDefined(
        chainState,
        `Zswap chain state for contract '${String(address)}', which spends a settled shielded coin`
      );
      rehashedChainState ??= chainState.postBlockUpdate(new Date(), ZSWAP_MERKLE_ROOT_RETENTION_SECONDS);

      // Probe segment 0 — nullifier is segment-independent (pinned by invariant test).
      // Probe doubles as the final input when routing settles on guaranteed.
      const probeInput = ZswapInput.newContractOwned(
        qualifiedCoinInfo,
        GUARANTEED_SEGMENT_NUMBER,
        address,
        rehashedChainState
      );
      const segment = segmentForNullifier(probeInput.nullifier, transcripts);

      buckets[segment].inputs.set(probeInput.nullifier, {
        unproven:
          segment === GUARANTEED_SEGMENT_NUMBER
            ? probeInput
            : ZswapInput.newContractOwned(qualifiedCoinInfo, segment, address, rehashedChainState),
        type: coinInfo.type,
        value: coinInfo.value
      });
    }
  }

  return {
    guaranteed: bucketToOffer(buckets[GUARANTEED_SEGMENT_NUMBER]),
    fallible: bucketToOffer(buckets[FALLIBLE_SEGMENT_NUMBER])
  };
};

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
): { guaranteed: UnprovenOffer | undefined; fallible: UnprovenOffer | undefined } =>
  zswapCallsToSegmentedOffer(
    [
      {
        contractAddress: addressAndChainStateTuple?.contractAddress,
        zswapLocalState,
        zswapChainState: addressAndChainStateTuple?.zswapChainState,
        partitionedTranscript
      }
    ],
    encryptionPublicKeyOrResolver
  );

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
