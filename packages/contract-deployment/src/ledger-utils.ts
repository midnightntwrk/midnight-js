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
  type ContractAddress,
  type ContractState,
  type SigningKey,
  type ZswapLocalState} from '@midnight-ntwrk/compact-runtime';
import {
  ContractCallsPrototype,
  ContractDeploy,
} from '@midnight-ntwrk/ledger';
import {
  addMaintenanceAuthority,
  addVerifierKeys,
  fromLedgerContractState,
  toLedgerContractState,
  zswapStateToOffer
} from '@midnight-ntwrk/midnight-js-contract-core';
import { type ImpureCircuitId, UnprovenTransaction, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { type EncPublicKey } from '@midnight-ntwrk/zswap';

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
    new UnprovenTransaction(
      zswapStateToOffer(zswapLocalState, encryptionPublicKey),
      undefined,
      new ContractCallsPrototype().addDeploy(contractDeploy)
    )
  ];
};
