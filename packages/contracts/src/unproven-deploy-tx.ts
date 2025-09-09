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

import type { CoinPublicKey,SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { EncPublicKey } from '@midnight-ntwrk/ledger';
import { getLedgerNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type Contract,
  type ImpureCircuitId,
  type PrivateState,
  type PrivateStateId,
  type VerifierKey} from '@midnight-ntwrk/midnight-js-types';
import { getImpureCircuitIds } from '@midnight-ntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';

import type { ContractConstructorOptions, ContractConstructorOptionsWithArguments } from './call-constructor';
import { callContractConstructor } from './call-constructor';
import { type ContractProviders } from './contract-providers';
import { type DeployTxOptions } from './submit-deploy-tx';
import type { UnsubmittedDeployTxData } from './tx-model';
import { createUnprovenLedgerDeployTx, zswapStateToNewCoins } from './utils';

/**
 * Base type for deploy transaction configuration.
 */
export type DeployTxOptionsBase<C extends Contract> = ContractConstructorOptionsWithArguments<C> & {
  /**
   * The signing key to add as the to-be-deployed contract's maintenance authority.
   */
  readonly signingKey: SigningKey;
};

/**
 * Configuration for creating deploy transactions for contracts with private state. This
 * configuration used as a base type for the {@link DeployTxOptionsWithPrivateStateId} configuration.
 * It is also used directly as parameter to {@link createUnprovenDeployTx} which doesn't need
 * to save private state (and therefore doesn't need a private state ID) but does need to supply an
 * initial private state to run the contract constructor against.
 */
export type DeployTxOptionsWithPrivateState<C extends Contract> = DeployTxOptionsBase<C> & {
  /**
   * The private state to run the contract constructor against.
   */
  readonly initialPrivateState: PrivateState<C>;
};

/**
 * Configuration for creating deploy transactions for contracts with private state. This
 * configuration is used when a deployment transaction is created and an initial private
 * state needs to be stored, as is the case in {@link submitDeployTx}.
 */
export type DeployTxOptionsWithPrivateStateId<C extends Contract> = DeployTxOptionsWithPrivateState<C> & {
  /**
   * The identifier for the private state of the contract.
   */
  readonly privateStateId: PrivateStateId;
};

/**
 * Configuration for creating unproven deploy transactions.
 */
export type UnprovenDeployTxOptions<C extends Contract> = DeployTxOptionsBase<C> | DeployTxOptionsWithPrivateState<C>;

const createContractConstructorOptions = <C extends Contract>(
  deployTxOptions: DeployTxOptions<C>,
  coinPublicKey: CoinPublicKey
): ContractConstructorOptions<C> => {
  const constructorOptionsBase = {
    contract: deployTxOptions.contract
  };
  const constructorOptionsWithArguments =
    'args' in deployTxOptions
      ? {
          ...constructorOptionsBase,
          args: deployTxOptions.args
        }
      : constructorOptionsBase;
  const constructorOptionsWithProviderDataDependencies = {
    ...constructorOptionsWithArguments,
    coinPublicKey
  };
  const constructorOptions =
    'initialPrivateState' in deployTxOptions
      ? {
          ...constructorOptionsWithProviderDataDependencies,
          initialPrivateState: deployTxOptions.initialPrivateState
        }
      : constructorOptionsWithProviderDataDependencies;
  return constructorOptions as ContractConstructorOptions<C>;
};



export function createUnprovenDeployTxFromVerifierKeys<C extends Contract<undefined>>(
  verifierKeys: [ImpureCircuitId<C>, VerifierKey][],
  coinPublicKey: CoinPublicKey,
  options: DeployTxOptionsBase<C>,
  encryptionPublicKey: EncPublicKey
): UnsubmittedDeployTxData<C>;

export function createUnprovenDeployTxFromVerifierKeys<C extends Contract>(
  verifierKeys: [ImpureCircuitId<C>, VerifierKey][],
  coinPublicKey: CoinPublicKey,
  options: DeployTxOptionsWithPrivateState<C>,
  encryptionPublicKey: EncPublicKey
): UnsubmittedDeployTxData<C>;

/**
 * Calls a contract constructor and creates an unbalanced, unproven, unsubmitted, deploy transaction
 * from the constructor results.
 *
 * @param verifierKeys The verifier keys for the contract being deployed.
 * @param coinPublicKey The Zswap coin public key of the current user.
 * @param options Configuration.
 * @param encryptionPublicKey
 * @returns Data produced by the contract constructor call and an unproven deployment transaction
 *          assembled from the contract constructor result.
 */
export function createUnprovenDeployTxFromVerifierKeys<C extends Contract>(
  verifierKeys: [ImpureCircuitId<C>, VerifierKey][],
  coinPublicKey: CoinPublicKey,
  options: UnprovenDeployTxOptions<C>,
  encryptionPublicKey: EncPublicKey
): UnsubmittedDeployTxData<C> {
  const { nextContractState, nextPrivateState, nextZswapLocalState } = callContractConstructor(
    createContractConstructorOptions(options, coinPublicKey)
  );
  const [contractAddress, initialContractState, unprovenTx] = createUnprovenLedgerDeployTx(
    verifierKeys,
    options.signingKey,
    nextContractState,
    nextZswapLocalState,
    encryptionPublicKey
  );
  return {
    public: {
      contractAddress,
      initialContractState
    },
    private: {
      signingKey: options.signingKey,
      initialPrivateState: nextPrivateState,
      initialZswapState: nextZswapLocalState,
      unprovenTx,
      newCoins: zswapStateToNewCoins(coinPublicKey, nextZswapLocalState)
    }
  };
}

/**
 * Providers needed to create an unproven deployment transactions, just the ZK artifact
 * provider and a wallet.
 */
export type UnprovenDeployTxProviders<C extends Contract> = Pick<
  ContractProviders<C>,
  'zkConfigProvider' | 'walletProvider'
>;

export async function createUnprovenDeployTx<C extends Contract<undefined>>(
  providers: UnprovenDeployTxProviders<C>,
  options: DeployTxOptionsBase<C>
): Promise<UnsubmittedDeployTxData<C>>;

export async function createUnprovenDeployTx<C extends Contract>(
  providers: UnprovenDeployTxProviders<C>,
  options: DeployTxOptionsWithPrivateState<C>
): Promise<UnsubmittedDeployTxData<C>>;

/**
 * Calls a contract constructor and creates an unbalanced, unproven, unsubmitted, deploy transaction
 * from the constructor results.
 *
 * @param providers The providers to use to create the deploy transaction.
 * @param options Configuration.
 *
 * @returns A promise that contains all data produced by the constructor call and an unproven
 *          transaction assembled from the constructor result.
 */
export async function createUnprovenDeployTx<C extends Contract>(
  providers: UnprovenDeployTxProviders<C>,
  options: UnprovenDeployTxOptions<C>
): Promise<UnsubmittedDeployTxData<C>> {
  const verifierKeys = await providers.zkConfigProvider.getVerifierKeys(getImpureCircuitIds(options.contract));
  return createUnprovenDeployTxFromVerifierKeys(
    verifierKeys,
    parseCoinPublicKeyToHex(providers.walletProvider.coinPublicKey, getLedgerNetworkId()),
    options,
    providers.walletProvider.encryptionPublicKey
  );
}
