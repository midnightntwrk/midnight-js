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
import { type CompiledContract, ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { type Contract, ProvableCircuitId, VerifierKey as ContractVerifierKey } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type {
  CoinPublicKey,
  ContractAddress,
  ContractState,
  SigningKey
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Intent,
  type MaintenanceUpdate,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  asContractAddress,
  asEffectOption,
  makeContractExecutableRuntime,
  Transaction,
  type VerifierKey,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

export const unprovenTxFromContractUpdates = async (
  updateAndSignFn: () => Promise<MaintenanceUpdate>
): Promise<UnprovenTransaction> => {
  return Transaction.fromParts(
    getNetworkId(),
    undefined,
    undefined,
    Intent.new(ttlOneHour()).addMaintenanceUpdate(await updateAndSignFn())
  );
};

export const createUnprovenReplaceAuthorityTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  newAuthority: SigningKey,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.replaceContractMaintenanceAuthority(
      asEffectOption(newAuthority),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
};

export const createUnprovenRemoveVerifierKeyTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  operation: string,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.removeContractOperation(
      ProvableCircuitId(operation),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
};

export const createUnprovenInsertVerifierKeyTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  operation: string,
  newVk: VerifierKey,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.addOrReplaceContractOperation(
      ProvableCircuitId(operation),
      ContractVerifierKey(newVk),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
};
