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
import {
  ChargedState,
  communicationCommitmentRandomness,
  ContractCall,
  ContractCallPrototype,
  ContractDeploy,
  type ContractState as LedgerContractState,
  type EncPublicKey,
  entryPointHash,
  Intent,
  type PreProof,
  type PublicAddress,
  QueryContext as LedgerQueryContext,
  type TokenType,
  Transaction,
  type Transcript,
  type UnprovenIntent,
  type UnprovenOffer,
  type UnprovenTransaction,
  UnshieldedOffer,
  type UtxoOutput,
  type ZswapChainState
} from '@midnightntwrk/midnight-js-protocol/v9';
import type { ContractExecutable } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';
import {
  type AlignedValue,
  type ContractAddress,
  type ContractState,
  type QueryContext,
  type ZswapLocalState} from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  encodeContractKeyLocation,
  hashVerifierKey,
  type MidnightConfig
} from '@midnightntwrk/midnight-js-types';
import {
  assertDefined,
  decodeLedger9StateValue,
  deserializeLedger9CompactContractState,
  deserializeLedger9ContractState,
  intentTtl,
  toHex
} from '@midnightntwrk/midnight-js-utils';
import { Option } from 'effect';

import { BlankVerifierKeySlotError, ZswapOutputResolutionError } from '../../errors';
import { type EncryptionPublicKeyResolver, zswapCallsToSegmentedOffer, zswapStateToOffer } from './zswap-utils';

const PKG = '@midnightntwrk/midnight-js-contracts';

export const toLedgerContractState = (contractState: ContractState): LedgerContractState =>
  deserializeLedger9ContractState(contractState.serialize(), { caller: `${PKG}:toLedgerContractState` });

export const fromLedgerContractState = (contractState: LedgerContractState): ContractState =>
  deserializeLedger9CompactContractState(contractState.serialize(), { caller: `${PKG}:fromLedgerContractState` });

export const toLedgerQueryContext = (queryContext: QueryContext): LedgerQueryContext => {
  const stateValue = decodeLedger9StateValue(queryContext.state.state.encode(), { caller: `${PKG}:toLedgerQueryContext` });
  const ledgerQueryContext = new LedgerQueryContext(new ChargedState(stateValue), queryContext.address);
  // The above method of converting to ledger query context only retains the state. So, we have to set the settable properties manually
  ledgerQueryContext.block = queryContext.block;
  ledgerQueryContext.effects = queryContext.effects;
  return ledgerQueryContext;
}

export const createUnprovenLedgerDeployTx = (
  contractState: ContractState,
  zswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey | EncryptionPublicKeyResolver,
  config: MidnightConfig
): [ContractAddress, ContractState, UnprovenTransaction] => {
  const ttl = intentTtl(config);
  const { networkId } = config;
  const contractDeploy = new ContractDeploy(toLedgerContractState(contractState));
  return [
    contractDeploy.address,
    fromLedgerContractState(contractDeploy.initialState),
    Transaction.fromParts(
      networkId,
      zswapStateToOffer(zswapLocalState, encryptionPublicKey),
      undefined,
      Intent.new(ttl).addDeploy(contractDeploy)
    )
  ];
}

export const extractUserAddressedOutputs = (
  transcript: Transcript<AlignedValue> | undefined
): UtxoOutput[] => {
  if (!transcript) return [];

  const outputs: UtxoOutput[] = [];
  for (const [[tokenType, publicAddress], value] of transcript.effects.claimedUnshieldedSpends) {
    if (publicAddress.tag === 'user' && tokenType.tag !== 'dust') {
      outputs.push({
        value,
        owner: publicAddress.address,
        type: tokenType.raw
      });
    }
  }
  return outputs;
};

/** How many times each entry occurs. */
type Multiset = Map<string, number>;

const multisetOf = (entries: Iterable<string>): Multiset => {
  const counts: Multiset = new Map();
  for (const entry of entries) counts.set(entry, (counts.get(entry) ?? 0) + 1);
  return counts;
};

/** The entries whose counts differ between `left` and `right`, with both counts. */
const differencesOf = (left: Multiset, right: Multiset): { entry: string; left: number; right: number }[] =>
  Array.from(new Set([...left.keys(), ...right.keys()]))
    .map((entry) => ({ entry, left: left.get(entry) ?? 0, right: right.get(entry) ?? 0 }))
    .filter((difference) => difference.left !== difference.right);

/** The entries of `subset` that `superset` holds fewer times, with both counts. */
const missingFrom = (superset: Multiset, subset: Multiset): { entry: string; left: number; right: number }[] =>
  Array.from(subset)
    .map(([entry, count]) => ({ entry, left: superset.get(entry) ?? 0, right: count }))
    .filter((difference) => difference.left < difference.right);

/** The entries `entries` holds more than once. */
const duplicatesOf = (entries: Multiset): string[] =>
  Array.from(entries)
    .filter(([, count]) => count > 1)
    .map(([entry, count]) => `  ${entry}: claimed ${count} times`);

const listed = (
  differences: { entry: string; left: number; right: number }[],
  leftName: string,
  rightName: string
): string => differences.map(({ entry, left, right }) => `  ${entry}: ${leftName} ${left}, ${rightName} ${right}`).join('\n');

/** A transcript of an assembled transaction, with the intent it is in and the segment it runs in. */
interface PlacedTranscript {
  /** The segment of the intent the call is in. */
  readonly intentSegment: number;
  /** The segment the transcript runs in: 0 for a guaranteed half, the intent's segment for a fallible one. */
  readonly logicalSegment: number;
  readonly guaranteed: boolean;
  readonly address: string;
  readonly effects: Transcript<AlignedValue>['effects'];
}

const contractCallsOf = (tx: UnprovenTransaction): { segment: number; call: ContractCall<PreProof> }[] =>
  Array.from(tx.intents ?? new Map<number, UnprovenIntent>()).flatMap(([segment, intent]) =>
    intent.actions
      .filter((action): action is ContractCall<PreProof> => action instanceof ContractCall)
      .map((call) => ({ segment, call }))
  );

const placedTranscriptsOf = (calls: { segment: number; call: ContractCall<PreProof> }[]): PlacedTranscript[] =>
  calls.flatMap(({ segment, call }) => [
    ...(call.guaranteedTranscript === undefined
      ? []
      : [{ intentSegment: segment, logicalSegment: 0, guaranteed: true, address: String(call.address), effects: call.guaranteedTranscript.effects }]),
    ...(call.fallibleTranscript === undefined
      ? []
      : [{ intentSegment: segment, logicalSegment: segment, guaranteed: false, address: String(call.address), effects: call.fallibleTranscript.effects }])
  ]);

/** The transaction's Zswap offers, each with the segment it is applied in: 0 for the guaranteed one. */
const offersOf = (tx: UnprovenTransaction): [number, UnprovenOffer][] => [
  ...(tx.guaranteedOffer === undefined ? [] : [[0, tx.guaranteedOffer] as [number, UnprovenOffer]]),
  ...Array.from(tx.fallibleOffer ?? new Map<number, UnprovenOffer>())
];

/** @internal One key per token type, for comparing token types by value. */
export const tokenTypeKey = (tokenType: TokenType): string =>
  'raw' in tokenType ? `${tokenType.tag}:${tokenType.raw}` : tokenType.tag;

const publicAddressKey = (address: PublicAddress): string => `${address.tag}:${String(address.address)}`;

const unshieldedKey = (intentSegment: number, guaranteed: boolean, token: string, owner: string, value: bigint): string =>
  `segment ${intentSegment} ${guaranteed ? 'guaranteed' : 'fallible'} / ${token} / ${owner} / ${value}`;

/**
 * Shielded receives: each contract-addressed coin the offers carry, and the contract's claims to
 * receive it, as many times each, per segment the coin is applied in.
 */
const assertReceivesClaimed = (offers: [number, UnprovenOffer][], transcripts: PlacedTranscript[]): void => {
  const offered = multisetOf(
    offers.flatMap(([segment, offer]) =>
      [...offer.outputs, ...offer.transients]
        .filter((item) => item.contractAddress !== undefined)
        .map((item) => `segment ${segment} / ${String(item.commitment)} / ${String(item.contractAddress)}`)
    )
  );
  const claimedReceives = multisetOf(
    transcripts.flatMap(({ logicalSegment, address, effects }) =>
      effects.claimedShieldedReceives.map((commitment) => `segment ${logicalSegment} / ${String(commitment)} / ${address}`)
    )
  );
  const receives = differencesOf(offered, claimedReceives);
  if (receives.length > 0) {
    throw new ZswapOutputResolutionError(
      `A shielded coin addressed to a contract must be claimed as received by that contract as many ` +
        `times as the offers carry it, and these do not match. A transaction like this is rejected ` +
        `after proving. Offer count vs claim count:\n${listed(receives, 'offered', 'claimed')}`
    );
  }
};

/**
 * Nullifiers: each coin a contract spends, and the contract's claims of its nullifier, as many times
 * each, per segment.
 */
const assertNullifiersClaimed = (offers: [number, UnprovenOffer][], transcripts: PlacedTranscript[]): void => {
  const spentByContracts = multisetOf(
    offers.flatMap(([segment, offer]) =>
      [...offer.inputs, ...offer.transients]
        .filter((item) => item.contractAddress !== undefined)
        .map((item) => `segment ${segment} / ${String(item.nullifier)} / ${String(item.contractAddress)}`)
    )
  );
  const claimedNullifiers = multisetOf(
    transcripts.flatMap(({ logicalSegment, address, effects }) =>
      effects.claimedNullifiers.map((nullifier) => `segment ${logicalSegment} / ${String(nullifier)} / ${address}`)
    )
  );
  const nullifiers = differencesOf(spentByContracts, claimedNullifiers);
  if (nullifiers.length > 0) {
    throw new ZswapOutputResolutionError(
      `A shielded coin a contract spends must be claimed as spent by that contract, by its nullifier, as ` +
        `many times as the offers spend it, and these do not match. A transaction like this is rejected ` +
        `after proving. Spend count vs claim count:\n${listed(nullifiers, 'spent', 'claimed')}`
    );
  }
};

/**
 * Claimed shielded spends: none claimed twice in a segment, and each one a coin the offers carry in
 * that segment, to any owner.
 */
const assertClaimedSpendsCreated = (offers: [number, UnprovenOffer][], transcripts: PlacedTranscript[]): void => {
  const claimedSpends = multisetOf(
    transcripts.flatMap(({ logicalSegment, effects }) =>
      effects.claimedShieldedSpends.map((commitment) => `segment ${logicalSegment} / ${String(commitment)}`)
    )
  );
  const spendsClaimedTwice = duplicatesOf(claimedSpends);
  if (spendsClaimedTwice.length > 0) {
    throw new ZswapOutputResolutionError(
      `A shielded coin may be claimed as sent by one call of a transaction only, and these are claimed ` +
        `more than once. A transaction like this is rejected after proving:\n${spendsClaimedTwice.join('\n')}`
    );
  }
  const created = multisetOf(
    offers.flatMap(([segment, offer]) =>
      [...offer.outputs, ...offer.transients].map((item) => `segment ${segment} / ${String(item.commitment)}`)
    )
  );
  const unsentSpends = missingFrom(created, claimedSpends);
  if (unsentSpends.length > 0) {
    throw new ZswapOutputResolutionError(
      `A shielded coin a call claims to send must be among the coins the offers create in the same ` +
        `segment, and these are not. A transaction like this is rejected after proving. Offer count vs ` +
        `claim count:\n${listed(unsentSpends, 'offered', 'claimed')}`
    );
  }
};

/**
 * Claimed contract calls: none claimed twice in an intent, and each one a call of that intent.
 */
const assertClaimedCallsMade = (calls: { segment: number; call: ContractCall<PreProof> }[], transcripts: PlacedTranscript[]): void => {
  const claimedCalls = multisetOf(
    transcripts.flatMap(({ intentSegment, effects }) =>
      effects.claimedContractCalls.map(
        ([, address, entryPoint, commitment]) => `segment ${intentSegment} / ${String(address)} / ${entryPoint} / ${toHex(commitment)}`
      )
    )
  );
  const callsClaimedTwice = duplicatesOf(claimedCalls);
  if (callsClaimedTwice.length > 0) {
    throw new InvalidArgumentError(
      `A contract call may be claimed by one call of a transaction only, and these are claimed more ` +
        `than once. A transaction like this is rejected after proving:\n${callsClaimedTwice.join('\n')}`
    );
  }
  const madeCalls = multisetOf(
    calls.map(
      ({ segment, call }) =>
        `segment ${segment} / ${String(call.address)} / ${entryPointHash(call.entryPoint)} / ${String(call.communicationCommitment)}`
    )
  );
  const unmadeCalls = missingFrom(madeCalls, claimedCalls);
  if (unmadeCalls.length > 0) {
    throw new InvalidArgumentError(
      `A contract call a transcript claims must be a call of the same intent, and these are not. A ` +
        `transaction like this is rejected after proving. Call count vs claim count:\n${listed(unmadeCalls, 'made', 'claimed')}`
    );
  }
};

/**
 * Claimed unshielded spends: each one, to a contract, taken in as an unshielded input by a transcript
 * of that contract, or, to a user, paid by an output of the intent's unshielded offers, in the same
 * intent and half.
 */
const assertClaimedUnshieldedPaid = (tx: UnprovenTransaction, transcripts: PlacedTranscript[]): void => {
  const claimedUnshielded = multisetOf(
    transcripts.flatMap(({ intentSegment, guaranteed, effects }) =>
      Array.from(effects.claimedUnshieldedSpends, ([[tokenType, owner], value]) =>
        unshieldedKey(intentSegment, guaranteed, tokenTypeKey(tokenType), publicAddressKey(owner), value)
      )
    )
  );
  const paidUnshielded = multisetOf([
    ...transcripts.flatMap(({ intentSegment, guaranteed, address, effects }) =>
      Array.from(effects.unshieldedInputs, ([tokenType, value]) =>
        unshieldedKey(intentSegment, guaranteed, tokenTypeKey(tokenType), publicAddressKey({ tag: 'contract', address }), value)
      )
    ),
    ...Array.from(tx.intents ?? new Map<number, UnprovenIntent>()).flatMap(([segment, intent]) =>
      [
        ...(intent.guaranteedUnshieldedOffer?.outputs ?? []).map((output) => ({ guaranteed: true, output })),
        ...(intent.fallibleUnshieldedOffer?.outputs ?? []).map((output) => ({ guaranteed: false, output }))
      ].map(({ guaranteed, output }) =>
        unshieldedKey(
          segment,
          guaranteed,
          tokenTypeKey({ tag: 'unshielded', raw: output.type }),
          publicAddressKey({ tag: 'user', address: output.owner }),
          output.value
        )
      )
    )
  ]);
  const unpaidUnshielded = missingFrom(paidUnshielded, claimedUnshielded);
  if (unpaidUnshielded.length > 0) {
    throw new InvalidArgumentError(
      `An unshielded payment a transcript claims must be met in the same intent and half: one to a ` +
        `contract by an unshielded input of a transcript of that contract, one to a user by an output of ` +
        `the intent's unshielded offer, and these are not. A transaction like this is rejected after proving. Paid count vs claim ` +
        `count:\n${listed(unpaidUnshielded, 'paid', 'claimed')}`
    );
  }
};

/**
 * Compares, before anything is proven, what the transcripts of an assembled transaction claim with
 * what the transaction carries, as the ledger compares them for the whole transaction
 * (`midnight-ledger/ledger/src/verify.rs:1508-1796`). The ledger refuses a transaction that fails any
 * of these comparisons when it is submitted, after it was proven; here they are made before proving,
 * and the refusal says what differs. The facts are read from the transaction itself, where the ledger
 * reads them, so the two cannot key them differently.
 *
 * - Shielded receives: each contract-addressed coin the offers carry, and the contract's claims to
 *   receive it, as many times each, per segment the coin is applied in.
 * - Nullifiers: each coin a contract spends, and the contract's claims of its nullifier, as many times
 *   each, per segment.
 * - Claimed shielded spends: none claimed twice in a segment, and each one a coin the offers carry
 *   in that segment, to any owner.
 * - Claimed contract calls: none claimed twice in an intent, and each one a call of that intent.
 * - Claimed unshielded spends: each one, to a contract, taken in as an unshielded input by a
 *   transcript of that contract, or, to a user, paid by an output of the intent's unshielded offers,
 *   in the same intent and half.
 *
 * Coins the wallet adds when it balances the transaction are its own, so they never enter the
 * contract-keyed comparisons, and only add to the coins a claimed spend can be among.
 *
 * @throws ZswapOutputResolutionError if the shielded receives, the nullifiers or the claimed shielded
 *         spends do not match the offers.
 * @throws InvalidArgumentError if the claimed contract calls or the claimed unshielded spends do not
 *         match the transaction's calls and unshielded offers.
 */
export const assertEffectsMatchTransaction = (tx: UnprovenTransaction): void => {
  const calls = contractCallsOf(tx);
  const transcripts = placedTranscriptsOf(calls);
  const offers = offersOf(tx);
  assertReceivesClaimed(offers, transcripts);
  assertNullifiersClaimed(offers, transcripts);
  assertClaimedSpendsCreated(offers, transcripts);
  assertClaimedCallsMade(calls, transcripts);
  assertClaimedUnshieldedPaid(tx, transcripts);
};

/**
 * Assembles an unproven call transaction from the proof data of every contract call made while
 * executing a circuit, and checks what their transcripts claim against it (see
 * {@link assertEffectsMatchTransaction}) before anything is proven.
 *
 * @param calls Proof data for each contract call, in execution-trace order: cross-contract callees
 * first, the root call last. For a circuit with no cross-contract calls this is a single entry.
 * @param contractStateFor Resolves the on-chain contract state for a given address — the root
 * contract's input state, and each cross-contract callee's resolved state.
 * @param chainStateFor Resolves the Zswap chain state for a given address — the root contract's
 * from the input state, and each cross-contract callee's from the state the provider resolved
 * during execution. Only consulted for a call that spends a coin already settled on chain.
 * @param encryptionPublicKey Resolver for output encryption keys.
 * @param config The network the transaction is built for and how long it stays valid.
 *
 * @remarks Precondition: every operation resolved via `contractStateFor` for an invoked circuit must
 * carry its deployed verifier key — the call's key location embeds the key's hash so provers resolve
 * artifacts by content. Contract states read from chain (or produced by a real deploy) satisfy this;
 * a bare `ContractOperation` with no verifier key does not, and is rejected with a clear error.
 */
export const createUnprovenLedgerCallTx = (
  calls: readonly ContractExecutable.ContractExecutable.ContractCall[],
  contractStateFor: (address: ContractExecutable.ContractExecutable.ContractCall['contractAddress']) => ContractState | undefined,
  chainStateFor: (
    address: ContractExecutable.ContractExecutable.ContractCall['contractAddress']
  ) => ZswapChainState | undefined,
  encryptionPublicKey: EncPublicKey | EncryptionPublicKeyResolver,
  config: MidnightConfig
): UnprovenTransaction => {
  const ttl = intentTtl(config);
  const { networkId } = config;
  // Calls are in execution-trace order: cross-contract callees first, the root call last.
  const rootCall = calls[calls.length - 1];
  assertDefined(rootCall, 'Expected at least one contract call');

  // One ContractCallPrototype per call. Each call's operation comes from that contract's state
  // (the root from the input state, callees from the resolved callee states). Sub-calls reuse the
  // communication commitment randomness the runtime bound them to their caller with; the root,
  // being no one's callee, samples fresh randomness. Each call's key location is the canonical
  // contract-qualified form — circuit names alone are ambiguous across contracts — embedding the
  // hash of the deployed verifier key so provers resolve artifacts by content (see
  // `ZKConfigRegistry`).
  let intent = Intent.new(ttl);
  for (const call of calls) {
    const callContractState = contractStateFor(call.contractAddress);
    assertDefined(callContractState, `Contract state for '${call.contractAddress}' is undefined`);
    const op = toLedgerContractState(callContractState).operation(call.circuitId);
    if (op === undefined || op === null) {
      throw new InvalidArgumentError(`Operation '${call.circuitId}' is undefined for contract '${call.contractAddress}'`);
    }
    // The key location hashes the operation's deployed verifier key, so a blank slot is refused here
    // rather than as an opaque "expected Uint8Array" throw from the hasher.
    if (op.verifierKey === undefined || op.verifierKey === null) {
      throw new BlankVerifierKeySlotError(call.circuitId);
    }
    intent = intent.addCall(
      new ContractCallPrototype(
        call.contractAddress,
        call.circuitId,
        op,
        call.public.partitionedTranscript[0],
        call.public.partitionedTranscript[1],
        call.private.privateTranscriptOutputs,
        call.private.input,
        call.private.output,
        Option.match(call.communicationCommitment, {
          onSome: (commitment) => commitment.commCommRand,
          onNone: () => communicationCommitmentRandomness()
        }),
        encodeContractKeyLocation({
          contractAddress: String(call.contractAddress),
          circuitId: String(call.circuitId),
          verifierKeyHash: hashVerifierKey(op.verifierKey)
        })
      )
    );
  }

  // A user-addressed unshielded output can be produced by any call in the tree, not just the root,
  // and every call's transcript is attached to the intent above. The transaction has a single
  // guaranteed and a single fallible unshielded offer, so each must aggregate the user-addressed
  // outputs across all calls, per segment. Assembling them from the root call alone would drop a
  // callee's payout and leave the transaction unbalanced (rejected on submission).
  const guaranteedOutputs = calls.flatMap((call) => extractUserAddressedOutputs(call.public.partitionedTranscript[0]));
  if (guaranteedOutputs.length > 0) {
    intent.guaranteedUnshieldedOffer = UnshieldedOffer.new([], guaranteedOutputs, []);
  }

  const fallibleOutputs = calls.flatMap((call) => extractUserAddressedOutputs(call.public.partitionedTranscript[1]));
  if (fallibleOutputs.length > 0) {
    intent.fallibleUnshieldedOffer = UnshieldedOffer.new([], fallibleOutputs, []);
  }

  // Shielded coins, like the user-addressed unshielded outputs above, can be produced by any call
  // in the tree. A callee that is sent a coin *must* claim the receive in the same transaction or
  // the ledger rejects the whole thing, so its coins have to reach the offers — and each
  // contract-owned input has to be bound to the contract that spent it, since a contract-owned
  // nullifier hashes that contract's address.
  const segmentedOffers = zswapCallsToSegmentedOffer(
    calls.map((call) => ({
      contractAddress: call.contractAddress,
      zswapLocalState: call.private.zswapLocalState,
      zswapChainState: chainStateFor(call.contractAddress),
      partitionedTranscript: call.public.partitionedTranscript
    })),
    encryptionPublicKey
  );

  const tx = Transaction.fromPartsRandomized(
    networkId,
    segmentedOffers.guaranteed,
    segmentedOffers.fallible,
    intent
  );
  assertEffectsMatchTransaction(tx);
  return tx;
};
