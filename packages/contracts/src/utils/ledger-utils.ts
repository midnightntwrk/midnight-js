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

import {
  type AlignedValue,
  type ContractAddress,
  ContractState,
  type QueryContext,
  signatureVerifyingKey,
  type SigningKey,
  type ZswapLocalState} from '@midnight-ntwrk/compact-runtime';
import { ChargedState, SingleUpdate, ZswapChainState } from '@midnight-ntwrk/ledger-v6';
import {
  communicationCommitmentRandomness,
  ContractCallPrototype,
  ContractDeploy,
  ContractMaintenanceAuthority,
  ContractOperationVersion,
  ContractOperationVersionedVerifierKey,
  ContractState as LedgerContractState,
type EncPublicKey,
Intent,   MaintenanceUpdate,
  QueryContext as LedgerQueryContext,
  ReplaceAuthority,
  signData,
  StateValue as LedgerStateValue,
  VerifierKeyInsert,   VerifierKeyRemove} from '@midnight-ntwrk/ledger-v6';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type ImpureCircuitId,
  Transaction,
  type UnprovenTransaction,
  type VerifierKey
} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';

import type { PartitionedTranscript } from '../call';
import { zswapStateToOffer } from './zswap-utils';

const ttl = () => new Date(Date.now() + 60 * 60 * 1000);

export const toLedgerContractState = (contractState: ContractState): LedgerContractState =>
  LedgerContractState.deserialize(contractState.serialize());

export const fromLedgerContractState = (contractState: LedgerContractState): ContractState =>
  ContractState.deserialize(contractState.serialize(), );

export const toLedgerQueryContext = (queryContext: QueryContext): LedgerQueryContext => {
  const stateValue = LedgerStateValue.decode(queryContext.state.encode());
  return new LedgerQueryContext(new ChargedState(stateValue), queryContext.address);
}

const addVerifierKeys = (verifierKeys: [ImpureCircuitId, VerifierKey][], contractState: LedgerContractState): void => {
  verifierKeys.forEach(([impureCircuitId, verifierKey]) => {
    const operation = contractState.operation(impureCircuitId);
    assertDefined(
      operation,
      `Circuit '${impureCircuitId}' is undefined for contract state ${contractState.toString(false)}`
    );
    // TODO: Remove mutability
    operation.verifierKey = verifierKey;
    contractState.setOperation(impureCircuitId, operation);
  });
};

export const contractMaintenanceAuthority = (
  sk: SigningKey,
  contractState?: ContractState
): ContractMaintenanceAuthority => {
  const svk = signatureVerifyingKey(sk);
  const threshold = 1;
  return new ContractMaintenanceAuthority(
    [svk],
    threshold,
    contractState ? contractState.maintenanceAuthority.counter + 1n : 0n
  );
};

const addMaintenanceAuthority = (sk: SigningKey, contractState: LedgerContractState): void => {

  contractState.maintenanceAuthority = contractMaintenanceAuthority(sk);
};

export const createUnprovenLedgerDeployTx = (
  verifierKeys: [ImpureCircuitId, VerifierKey][],
  sk: SigningKey,
  contractState: ContractState,
  zswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey
): [ContractAddress, ContractState, UnprovenTransaction] => {
  const ledgerContractState = toLedgerContractState(contractState);
  addVerifierKeys(verifierKeys, ledgerContractState);
  addMaintenanceAuthority(sk, ledgerContractState);
  const contractDeploy = new ContractDeploy(ledgerContractState);
  return [
    contractDeploy.address,
    fromLedgerContractState(contractDeploy.initialState),
    Transaction.fromParts(
      getNetworkId(),
      zswapStateToOffer(zswapLocalState, encryptionPublicKey),
      undefined,
      Intent.new(ttl()).addDeploy(contractDeploy)
    )
  ];
};

export const createUnprovenLedgerCallTx = (
  circuitId: ImpureCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  partitionedTranscript: PartitionedTranscript,
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey
): UnprovenTransaction => {
  const op = toLedgerContractState(initialContractState).operation(circuitId);
  assertDefined(op, `Operation '${circuitId}' is undefined for contract state ${initialContractState.toString(false)}`);
  return Transaction.fromParts(
    getNetworkId(),
    zswapStateToOffer(nextZswapLocalState, encryptionPublicKey, {
      contractAddress,
      zswapChainState
    }),
    undefined,
    Intent.new(ttl()).addCall(
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
    )
  );
};

// Utilities for creating single contract updates.

export const replaceAuthority = (newAuthority: SigningKey, contractState: ContractState): ReplaceAuthority =>
  new ReplaceAuthority(contractMaintenanceAuthority(newAuthority, contractState));

export const removeVerifierKey = (operation: string | Uint8Array): VerifierKeyRemove =>
  new VerifierKeyRemove(operation, new ContractOperationVersion('v2'));

export const insertVerifierKey = (operation: string | Uint8Array, newVk: VerifierKey): VerifierKeyInsert =>
  new VerifierKeyInsert(operation, new ContractOperationVersionedVerifierKey('v2', newVk));

// Utilities for unproven transactions for the single contract updates above.

export const unprovenTxFromContractUpdates = (
  contractAddress: ContractAddress,
  updates: SingleUpdate[],
  contractState: ContractState,
  sk: SigningKey
): UnprovenTransaction => {
  const maintenanceUpdate = new MaintenanceUpdate(contractAddress, updates, contractState.maintenanceAuthority.counter);
  // 'idx' is '0n' because Midnight.js currently only supports single-party maintenance update authorities
  const idx = 0n;
  const signedMaintenanceUpdate = maintenanceUpdate.addSignature(idx, signData(sk, maintenanceUpdate.dataToSign));
  return Transaction.fromParts(
    getNetworkId(),
    undefined,
    undefined,
    Intent.new(ttl()).addMaintenanceUpdate(signedMaintenanceUpdate)
  );
};

export const createUnprovenReplaceAuthorityTx = (
  contractAddress: ContractAddress,
  newAuthority: SigningKey,
  contractState: ContractState,
  currentAuthority: SigningKey
): UnprovenTransaction =>
  unprovenTxFromContractUpdates(
    contractAddress,
    [replaceAuthority(newAuthority, contractState)],
    contractState,
    currentAuthority
  );

export const createUnprovenRemoveVerifierKeyTx = (
  contractAddress: ContractAddress,
  operation: string | Uint8Array,
  contractState: ContractState,
  currentAuthority: SigningKey
): UnprovenTransaction =>
  unprovenTxFromContractUpdates(contractAddress, [removeVerifierKey(operation)], contractState, currentAuthority);

export const createUnprovenInsertVerifierKeyTx = (
  contractAddress: ContractAddress,
  operation: string | Uint8Array,
  newVk: VerifierKey,
  contractState: ContractState,
  currentAuthority: SigningKey
): UnprovenTransaction =>
  unprovenTxFromContractUpdates(
    contractAddress,
    [insertVerifierKey(operation, newVk)],
    contractState,
    currentAuthority
  );
