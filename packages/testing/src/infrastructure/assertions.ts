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

import type {
  CallTxOptions,
  DeployContractOptions,
  DeployTxOptions,
  FinalizedCallTxData,
  FinalizedDeployTxData,
  FinalizedDeployTxDataBase
} from '@midnight-ntwrk/midnight-js-contracts';
import {
  type MidnightProviders,
  type PrivateStateId,
  type FinalizedTxData,
  type Contract,
  type ImpureCircuitId,
  type PrivateState,
  SucceedEntirely
} from '@midnight-ntwrk/midnight-js-types';
import type { StateValue } from '@midnight-ntwrk/compact-runtime';
import type { Bindingish, Proofish, Signaturish, Transaction } from '@midnight-ntwrk/ledger';

export const stateValueEqual = (a: StateValue, b: StateValue): boolean => {
  return a.toString(false) === b.toString(false);
};

export const txsEqual = <S extends Signaturish, P extends Proofish, B extends Bindingish>(a: Transaction<S, P, B>, b: Transaction<S, P, B>): boolean => {
  return a.toString(false) === b.toString(false);
};

export const expectFoundAndDeployedTxPublicDataEqual = <C extends Contract>(
  deployTxData: FinalizedDeployTxData<C>,
  foundDeployTxData: FinalizedDeployTxDataBase<C>
): void => {
  expect(
    stateValueEqual(deployTxData.public.initialContractState.data, foundDeployTxData.public.initialContractState.data)
  ).toBeTruthy();
  expect(deployTxData.public.contractAddress).toEqual(foundDeployTxData.public.contractAddress);
  expect(deployTxData.public.blockHash).toEqual(foundDeployTxData.public.blockHash);
  expect(deployTxData.public.blockHeight).toEqual(foundDeployTxData.public.blockHeight);
  expect(deployTxData.public.txHash).toEqual(foundDeployTxData.public.txHash);
  expect(deployTxData.public.txId).toEqual(foundDeployTxData.public.txId);
  expect(deployTxData.public.status).toEqual(foundDeployTxData.public.status);
  expect(txsEqual(deployTxData.public.tx, foundDeployTxData.public.tx)).toBeTruthy();
};

export const expectFoundAndDeployedTxPrivateDataEqual = <C extends Contract>(
  deployTxData: FinalizedDeployTxData<C>,
  foundDeployTxData: FinalizedDeployTxDataBase<C>
): void => {
  // For our purposes, we always find with the same private state that the contract is deployed with
  // so this comparison is justified.
  expect(deployTxData.private.initialPrivateState).toEqual(foundDeployTxData.private.initialPrivateState);
};

export const expectFoundAndDeployedTxDataEqual = <C extends Contract>(
  deployTxData: FinalizedDeployTxData<C>,
  foundDeployTxData: FinalizedDeployTxDataBase<C>
): void => {
  expectFoundAndDeployedTxPublicDataEqual(deployTxData, foundDeployTxData);
  expectFoundAndDeployedTxPrivateDataEqual(deployTxData, foundDeployTxData);
};

export const expectFoundAndDeployedStatesEqual = async <C extends Contract>(
  providers: MidnightProviders<ImpureCircuitId<C>, PrivateStateId, PrivateState<C> | unknown>,
  deployTxData: FinalizedDeployTxData<C>,
  foundDeployTxData: FinalizedDeployTxDataBase<C>,
  privateStateId?: PrivateStateId,
  initialPrivateState?: PrivateState<C>
): Promise<void> => {
  const deployedLedgerState = await providers.publicDataProvider.queryContractState(
    deployTxData.public.contractAddress
  );
  expect(deployedLedgerState).toBeDefined();
  expect(stateValueEqual(deployedLedgerState!.data, foundDeployTxData.public.initialContractState.data)).toBeTruthy();
  if (privateStateId) {
    const privateState = await providers.privateStateProvider.get(privateStateId);
    expect(privateState).toEqual(foundDeployTxData.private.initialPrivateState);
    if (initialPrivateState !== undefined) {
      expect(privateState).toEqual(initialPrivateState);
    }
  }
};

export const expectSuccessfulTxData = (finalizedTxData: FinalizedTxData): void => {
  expect(finalizedTxData.status).toEqual(SucceedEntirely);
  expect(finalizedTxData.tx).toBeTruthy();
  expect(finalizedTxData.txId).toBeTruthy();
  expect(finalizedTxData.txHash).toBeTruthy();
  expect(finalizedTxData.blockHeight).toBeTruthy();
  expect(finalizedTxData.blockHash).toBeTruthy();
};

export const expectSuccessfulDeployTx = async <C extends Contract>(
  providers: MidnightProviders<ImpureCircuitId<C>, PrivateStateId, PrivateState<C> | unknown>,
  deployTxData: FinalizedDeployTxData<C>,
  deployTxOptions?: DeployContractOptions<C> | DeployTxOptions<C>
): Promise<void> => {
  expectSuccessfulTxData(deployTxData.public);
  expect(deployTxData.public.contractAddress).toBeTruthy();
  const deployedLedgerState = await providers.publicDataProvider.queryContractState(
    deployTxData.public.contractAddress
  );
  expect(stateValueEqual(deployTxData.public.initialContractState.data, deployedLedgerState!.data));
  expect(deployTxData.public.initialContractState).toBeTruthy();

  // Checks that the signing key and private state passed in the deploy configuration
  // were stored correctly.
  if (deployTxOptions) {
    if (deployTxOptions.signingKey) {
      expect(deployTxData.private.signingKey).toEqual(deployTxOptions.signingKey);
      const storedSigningKey = await providers.privateStateProvider.getSigningKey(deployTxData.public.contractAddress);
      expect(storedSigningKey).toBeDefined();
      expect(storedSigningKey).toEqual(deployTxOptions.signingKey);
    }
    // We only test contracts that pass 'initialPrivateState' through the contract constructor unchanged
    // so this equality comparison is justified.
    if ('privateStateId' in deployTxOptions && 'initialPrivateState' in deployTxOptions) {
      expect(deployTxData.private.initialPrivateState).toEqual(deployTxOptions.initialPrivateState);
      const storedPrivateState = await providers.privateStateProvider.get(deployTxOptions.privateStateId);
      expect(storedPrivateState).toBeDefined();
      expect(storedPrivateState).toEqual(deployTxOptions.initialPrivateState);
    }
  }
};

export const expectSuccessfulCallTx = async <C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: MidnightProviders<ImpureCircuitId<C>, PrivateStateId, PrivateState<C> | unknown>,
  callTxData: FinalizedCallTxData<C, ICK>,
  callTxOptions?: CallTxOptions<C, ICK>,
  nextPrivateState?: PrivateState<C>
): Promise<void> => {
  expectSuccessfulTxData(callTxData.public);
  expect(callTxData.public.nextContractState).toBeTruthy();
  expect(callTxData.private.nextZswapLocalState);
  if (callTxOptions) {
    if ('privateStateId' in callTxOptions) {
      const storedPrivateState = await providers.privateStateProvider.get(callTxOptions.privateStateId);
      expect(storedPrivateState).toBeDefined();
      expect(storedPrivateState).toEqual(callTxData.private.nextPrivateState);
      if (nextPrivateState) {
        expect(nextPrivateState).toEqual(callTxData.private.nextPrivateState);
      }
    }
  }
};
