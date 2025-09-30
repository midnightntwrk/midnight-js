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

import { type ContractAddress, type ContractState, type SigningKey } from '@midnight-ntwrk/compact-runtime';
import {
  ContractCallsPrototype,
  ContractOperationVersion,
  ContractOperationVersionedVerifierKey,
  MaintenanceUpdate,
  ReplaceAuthority,
  signData,
  type SingleUpdate,
  UnprovenOffer,
  VerifierKeyInsert,
  VerifierKeyRemove
} from '@midnight-ntwrk/ledger';
import { contractMaintenanceAuthority } from '@midnight-ntwrk/midnight-js-contract-core';
import { UnprovenTransaction, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';

export const replaceAuthority = (newAuthority: SigningKey, contractState: ContractState): ReplaceAuthority =>
  new ReplaceAuthority(contractMaintenanceAuthority(newAuthority, contractState));

export const removeVerifierKey = (operation: string | Uint8Array): VerifierKeyRemove =>
  new VerifierKeyRemove(operation, new ContractOperationVersion('v2'));

export const insertVerifierKey = (operation: string | Uint8Array, newVk: VerifierKey): VerifierKeyInsert =>
  new VerifierKeyInsert(operation, new ContractOperationVersionedVerifierKey('v2', newVk));

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
  return new UnprovenTransaction(
    new UnprovenOffer(),
    undefined,
    new ContractCallsPrototype().addMaintenanceUpdate(signedMaintenanceUpdate)
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
