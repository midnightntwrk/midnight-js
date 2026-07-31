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
import type { ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  type AlignedValue,
  type ContractAddress,
  type ContractState,
  type QueryContext,
  type ZswapLocalState} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  ChargedState,
  communicationCommitmentRandomness,
  ContractCallPrototype,
  ContractDeploy,
  type ContractState as LedgerContractState,
  type EncPublicKey,
  Intent,
  QueryContext as LedgerQueryContext,
  type Transcript,
  type UnprovenOffer,
  type UnprovenTransaction,
  UnshieldedOffer,
  type UtxoOutput,
  type ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  encodeContractKeyLocation,
  hashVerifierKey,
  Transaction
} from '@midnight-ntwrk/midnight-js-types';
import {
  assertDefined,
  decodeLedgerStateValue,
  deserializeCompactContractState,
  deserializeContractState,
  ttlOneHour
} from '@midnight-ntwrk/midnight-js-utils';
import { Option } from 'effect';

import { type EncryptionPublicKeyResolver, zswapCallsToSegmentedOffer, zswapStateToOffer } from './zswap-utils';

const PKG = '@midnight-ntwrk/midnight-js-contracts';

export const toLedgerContractState = (contractState: ContractState): LedgerContractState =>
  deserializeContractState(contractState.serialize(), { caller: `${PKG}:toLedgerContractState` });

export const fromLedgerContractState = (contractState: LedgerContractState): ContractState =>
  deserializeCompactContractState(contractState.serialize(), { caller: `${PKG}:fromLedgerContractState` });

export const toLedgerQueryContext = (queryContext: QueryContext): LedgerQueryContext => {
  const stateValue = decodeLedgerStateValue(queryContext.state.state.encode(), { caller: `${PKG}:toLedgerQueryContext` });
  const ledgerQueryContext = new LedgerQueryContext(new ChargedState(stateValue), queryContext.address);
  // The above method of converting to ledger query context only retains the state. So, we have to set the settable properties manually
  ledgerQueryContext.block = queryContext.block;
  ledgerQueryContext.effects = queryContext.effects;
  return ledgerQueryContext;
}

export const createUnprovenLedgerDeployTx = (
  contractState: ContractState,
  zswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey | EncryptionPublicKeyResolver
): [ContractAddress, ContractState, UnprovenTransaction] => {
  const contractDeploy = new ContractDeploy(toLedgerContractState(contractState));
  return [
    contractDeploy.address,
    fromLedgerContractState(contractDeploy.initialState),
    Transaction.fromParts(
      getNetworkId(),
      zswapStateToOffer(zswapLocalState, encryptionPublicKey),
      undefined,
      Intent.new(ttlOneHour()).addDeploy(contractDeploy)
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

/**
 * Offers and transcripts come from the same execution but different code, so they can disagree — and
 * must not. For each contract-addressed coin, the number of times the offers carry it has to equal
 * the number of times that contract's transcripts claim to receive it. Claims sum across
 * transcripts, so a coin two calls both claim counts twice against an offer that carries it once.
 *
 * The chain enforces the same equality but reports only an error code, after proving, naming neither
 * side (`midnight-ledger/ledger/src/verify.rs:1499-1560`). Both sides are in hand here, so compare
 * them first and say what differs.
 */
const assertReceivesMatchClaims = (
  calls: readonly ContractExecutable.ContractExecutable.ContractCall[],
  segmentedOffers: { guaranteed: UnprovenOffer | undefined; fallible: UnprovenOffer | undefined }
): void => {
  const tally = (entries: readonly string[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry, (counts.get(entry) ?? 0) + 1);
    return counts;
  };
  const key = (segment: number, commitment: string, address: string): string =>
    `segment ${segment} / ${commitment} / ${address}`;

  const offered: string[] = [];
  for (const [segment, offer] of [
    [0, segmentedOffers.guaranteed],
    [1, segmentedOffers.fallible]
  ] as const) {
    if (offer === undefined) continue;
    for (const item of [...offer.outputs, ...offer.transients]) {
      if (item.contractAddress === undefined) continue;
      offered.push(key(segment, String(item.commitment), String(item.contractAddress)));
    }
  }

  const claimed: string[] = [];
  for (const call of calls) {
    call.public.partitionedTranscript.forEach((half, segment) => {
      if (half === undefined) return;
      for (const commitment of half.effects.claimedShieldedReceives) {
        claimed.push(key(segment, String(commitment), String(call.contractAddress)));
      }
    });
  }

  const offeredCounts = tally(offered);
  const claimedCounts = tally(claimed);
  const differences = Array.from(new Set([...offeredCounts.keys(), ...claimedCounts.keys()]))
    .map((entry) => ({ entry, offered: offeredCounts.get(entry) ?? 0, claimed: claimedCounts.get(entry) ?? 0 }))
    .filter(({ offered: o, claimed: c }) => o !== c);
  if (differences.length === 0) return;

  throw new Error(
    `A shielded coin addressed to a contract must be claimed as received by that contract as many ` +
      `times as the offers carry it, and these do not match. A transaction like this is rejected ` +
      `after proving. Offer count vs claim count:\n` +
      differences
        .map(({ entry, offered: o, claimed: c }) => `  ${entry}: offered ${o}, claimed ${c}`)
        .join('\n')
  );
};

/**
 * Assembles an unproven call transaction from the proof data of every contract call made while
 * executing a circuit.
 *
 * @param calls Proof data for each contract call, in execution-trace order: cross-contract callees
 * first, the root call last. For a circuit with no cross-contract calls this is a single entry.
 * @param contractStateFor Resolves the on-chain contract state for a given address — the root
 * contract's input state, and each cross-contract callee's resolved state.
 * @param chainStateFor Resolves the Zswap chain state for a given address — the root contract's
 * from the input state, and each cross-contract callee's from the state the provider resolved
 * during execution. Only consulted for a call that spends a coin already settled on chain.
 * @param encryptionPublicKey Resolver for output encryption keys.
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
  encryptionPublicKey: EncPublicKey | EncryptionPublicKeyResolver
): UnprovenTransaction => {
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
  let intent = Intent.new(ttlOneHour());
  for (const call of calls) {
    const callContractState = contractStateFor(call.contractAddress);
    assertDefined(callContractState, `Contract state for '${call.contractAddress}' is undefined`);
    const op = toLedgerContractState(callContractState).operation(call.circuitId);
    assertDefined(op, `Operation '${call.circuitId}' is undefined for contract '${call.contractAddress}'`);
    // The key location hashes the operation's deployed verifier key; a state whose operation carries
    // no key (e.g. a bare `ContractOperation`) is a caller error, surfaced here rather than as an
    // opaque "expected Uint8Array" throw from the hasher.
    assertDefined(
      op.verifierKey,
      `Operation '${call.circuitId}' on contract '${call.contractAddress}' has no verifier key. Each ` +
        'invoked operation must carry its deployed verifier key (present in states read from chain, or ' +
        "produced by a real deploy), which the call's key location hashes."
    );
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

  assertReceivesMatchClaims(calls, segmentedOffers);

  return Transaction.fromPartsRandomized(
    getNetworkId(),
    segmentedOffers.guaranteed,
    segmentedOffers.fallible,
    intent
  );
};
