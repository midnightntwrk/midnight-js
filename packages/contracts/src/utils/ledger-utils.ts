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
  type PartitionedTranscript,
  QueryContext as LedgerQueryContext,
  type Transcript,
  type UnprovenTransaction,
  UnshieldedOffer,
  type UtxoOutput,
  type ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type AnyProvableCircuitId,
  Transaction
} from '@midnight-ntwrk/midnight-js-types';
import {
  assertDefined,
  decodeLedgerStateValue,
  deserializeCompactContractState,
  deserializeContractState,
  ttlOneHour
} from '@midnight-ntwrk/midnight-js-utils';

import { type EncryptionPublicKeyResolver, zswapStateToOffer, zswapStateToSegmentedOffer } from './zswap-utils';

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

export const createUnprovenLedgerCallTx = (
  circuitId: AnyProvableCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  partitionedTranscript: PartitionedTranscript,
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey | EncryptionPublicKeyResolver
): UnprovenTransaction => {
  const op = toLedgerContractState(initialContractState).operation(circuitId);
  assertDefined(op, `Operation '${circuitId}' is undefined for contract state ${initialContractState.toString(false)}`);

  const intent = Intent.new(ttlOneHour()).addCall(
    new ContractCallPrototype(
      contractAddress,
      circuitId,
      op,
      partitionedTranscript[0],
      partitionedTranscript[1],
      privateTranscriptOutputs,
      input,
      output,
      communicationCommitmentRandomness(),
      circuitId
    )
  );

  const guaranteedOutputs = extractUserAddressedOutputs(partitionedTranscript[0]);
  if (guaranteedOutputs.length > 0) {
    intent.guaranteedUnshieldedOffer = UnshieldedOffer.new([], guaranteedOutputs, []);
  }

  const fallibleOutputs = extractUserAddressedOutputs(partitionedTranscript[1]);
  if (fallibleOutputs.length > 0) {
    intent.fallibleUnshieldedOffer = UnshieldedOffer.new([], fallibleOutputs, []);
  }

  const segmentedOffers = zswapStateToSegmentedOffer(
    nextZswapLocalState,
    encryptionPublicKey,
    { contractAddress, zswapChainState },
    partitionedTranscript
  );

  return Transaction.fromPartsRandomized(
    getNetworkId(),
    segmentedOffers.guaranteed,
    segmentedOffers.fallible,
    intent
  );
};
