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

import { ContractExecutionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import type { CoinPublicKey,SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  exitResultOrError,
  LedgerTransaction,
  makeLedger9ContractExecutableRuntime,
  type MidnightConfig,
  type PrivateStateId,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { assertNever, assertValidMidnightConfig, parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';

import type { Ledger9ContractConstructorOptionsWithArguments } from './call-constructor';
import { type Ledger9ContractProviders } from './contract-providers';
import { isEffectContractError } from './errors';
import { requireLedger9Contract, resolveArtifactEra, unsupportedContractEra } from './internal/era';
import { createEncryptionPublicKeyResolver, createUnprovenLedgerDeployTx, zswapStateToNewCoins } from './internal/utils';
import type { Ledger9UnsubmittedDeployTxData } from './tx-model';

/**
 * Base type for deploy transaction configuration.
 */
export type Ledger9DeployTxOptionsBase<C extends Contract.Any> = Ledger9ContractConstructorOptionsWithArguments<C> & {
  /**
   * An optional mapping of {@link CoinPublicKey} to {@link EncPublicKey} that can be used to resolve encryption
   * keys for coins created in the contract constructor. This is useful in cases where the constructor creates
   * outputs to addresses that don't belong to the current user.
   */
  readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;

  /**
   * The signing key to add as the to-be-deployed contract's maintenance authority.
   */
  readonly signingKey: SigningKey;
};

/**
 * Configuration for creating deploy transactions for contracts with private state. This
 * configuration used as a base type for the {@link Ledger9DeployTxOptionsWithPrivateStateId} configuration.
 * It is also used directly as parameter to {@link createUnprovenDeployTx} which doesn't need
 * to save private state (and therefore doesn't need a private state ID) but does need to supply an
 * initial private state to run the contract constructor against.
 */
export type Ledger9DeployTxOptionsWithPrivateState<C extends Contract.Any> = Ledger9DeployTxOptionsBase<C> & {
  /**
   * The private state to run the contract constructor against.
   */
  readonly initialPrivateState: Contract.PrivateState<C>;
};

/**
 * Configuration for creating deploy transactions for contracts with private state. This
 * configuration is used when a deployment transaction is created and an initial private
 * state needs to be stored, as is the case in {@link submitDeployTx}.
 */
export type Ledger9DeployTxOptionsWithPrivateStateId<C extends Contract.Any> = Ledger9DeployTxOptionsWithPrivateState<C> & {
  /**
   * The identifier for the private state of the contract.
   */
  readonly privateStateId: PrivateStateId;
};

/**
 * Configuration for creating unproven deploy transactions.
 */
export type Ledger9UnprovenDeployTxOptions<C extends Contract.Any> = Ledger9DeployTxOptionsBase<C> | Ledger9DeployTxOptionsWithPrivateState<C>;

export function createLedger9UnprovenDeployTxFromVerifierKeys<C extends Contract<undefined>>(
  zkConfigProvider: ZKConfigProvider<string>,
  coinPublicKey: CoinPublicKey,
  options: Ledger9DeployTxOptionsBase<C>,
  encryptionPublicKey: EncPublicKey,
  config: MidnightConfig
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

export function createLedger9UnprovenDeployTxFromVerifierKeys<C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  coinPublicKey: CoinPublicKey,
  options: Ledger9DeployTxOptionsWithPrivateState<C>,
  encryptionPublicKey: EncPublicKey,
  config: MidnightConfig
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

/**
 * Calls a contract constructor and creates an unbalanced, unproven, unsubmitted, deploy transaction
 * from the constructor results.
 *
 * @param zkConfigProvider Supplies the verifier keys for the contract being deployed.
 * @param coinPublicKey The Zswap coin public key of the current user.
 * @param options Configuration.
 * @param encryptionPublicKey The Zswap encryption public key of the current user.
 * @param config The network the transaction is built for and how long it stays valid, normally `providers.config`.
 * @returns Data produced by the contract constructor call and an unproven deployment transaction
 *          assembled from the contract constructor result.
 * @throws EraMismatchError with reason `'contract-era-unsupported'` for a contract whose artifacts
 *         do not declare ledger 9, before anything else.
 * @throws ConfigurationError If `config` is missing.
 * @throws InvalidArgumentError If its `networkId` is not a non-empty string without surrounding
 *         whitespace.
 * @throws InvalidArgumentError If `config.ttlSeconds` is not a positive whole number, or overflows a `Date`.
 *
 * @remarks
 * The returned {@link Ledger9UnsubmittedDeployTxData} is privacy-sensitive and
 * carries the unproven transaction, signing key, initial private state, and
 * initial Zswap state. See that type for handling guidance before logging,
 * serializing, or transmitting the result.
 */
export async function createLedger9UnprovenDeployTxFromVerifierKeys<C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  coinPublicKey: CoinPublicKey,
  options: Ledger9UnprovenDeployTxOptions<C>,
  encryptionPublicKey: EncPublicKey,
  config: MidnightConfig
): Promise<Ledger9UnsubmittedDeployTxData<C>> {
  await requireLedger9Contract(options.compiledContract, zkConfigProvider, 'createLedger9UnprovenDeployTxFromVerifierKeys');
  assertValidMidnightConfig(config, 'config');
  const contractExec = ContractExecutable.make(options.compiledContract);
  const contractRuntime = makeLedger9ContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey: coinPublicKey,
    signingKey: options.signingKey
  });
  const initialPrivateState = 'initialPrivateState' in options ? options.initialPrivateState : undefined;
  const args = ('args' in options ? options.args : []) as Contract.InitializeParameters<C>;
  const exitResult = await contractRuntime.runPromiseExit(contractExec.initialize(initialPrivateState, ...args));
  try {
    const {
      public: { contractState },
      private: {
        privateState,
        signingKey,
        zswapLocalState
      }
    } = exitResultOrError(exitResult);
    const resolver = createEncryptionPublicKeyResolver(
      config.networkId,
      coinPublicKey,
      encryptionPublicKey,
      options.additionalCoinEncPublicKeyMappings
    );
    const [contractAddress, initialContractState, ledgerTx] = createUnprovenLedgerDeployTx(
      contractState,
      zswapLocalState,
      resolver,
      config
    );

    return {
      era: 'v9',
      public: {
        contractAddress,
        initialContractState
      },
      private: {
        // Compact.js returns the maintenance-authority key as a structured `SigningKey` ({ tag, value }),
        // which already carries its signature scheme, so it is threaded through unchanged.
        signingKey,
        initialPrivateState: privateState,
        initialZswapState: zswapLocalState,
        unprovenTx: LedgerTransaction.seal('v9', 'Unproven', ledgerTx),
        newCoins: zswapStateToNewCoins(coinPublicKey, zswapLocalState)
      }
    };
  } catch (error: unknown) {
    if (!isEffectContractError(error)) throw error;
    if (error._tag !== 'ContractRuntimeError' && error._tag !== 'ContractConfigurationError') throw error;
    if (error.cause.name !== 'CompactError') throw error;
    throw new ContractExecutionError(error.cause.message, { cause: error });
  }
}

/**
 * Providers needed to create an unproven deployment transactions, just the ZK artifact
 * provider and a wallet.
  * @throws EraMismatchError with reason `'contract-era-unsupported'` for a contract whose artifacts
 *         do not declare ledger 9, before anything else.
*/
export type Ledger9UnprovenDeployTxProviders<C extends Contract.Any> = Pick<
  Ledger9ContractProviders<C>,
  'zkConfigProvider' | 'walletProvider' | 'config'
>;

export async function createLedger9UnprovenDeployTx<C extends Contract<undefined>>(
  providers: Ledger9UnprovenDeployTxProviders<C>,
  options: Ledger9DeployTxOptionsBase<C>
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

export async function createLedger9UnprovenDeployTx<C extends Contract.Any>(
  providers: Ledger9UnprovenDeployTxProviders<C>,
  options: Ledger9DeployTxOptionsWithPrivateState<C>
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

/**
 * Calls a contract constructor and creates an unbalanced, unproven, unsubmitted, deploy transaction
 * from the constructor results.
 *
 * @param providers The providers to use to create the deploy transaction.
 * @param options Configuration.
 *
 * @returns A promise that contains all data produced by the constructor call and an unproven
 *          transaction assembled from the constructor result.
 * @throws ConfigurationError If `providers.config` is missing.
 * @throws InvalidArgumentError If its `networkId` is not a non-empty string without surrounding
 *         whitespace.
 * @throws InvalidArgumentError If `providers.config.ttlSeconds` is not a positive whole number, or overflows a `Date`.
 *
 * @remarks
 * The returned {@link Ledger9UnsubmittedDeployTxData} is privacy-sensitive and
 * carries the unproven transaction, signing key, initial private state, and
 * initial Zswap state. See that type for handling guidance before logging,
 * serializing, or transmitting the result.
 */
export async function createLedger9UnprovenDeployTx<C extends Contract.Any>(
  providers: Ledger9UnprovenDeployTxProviders<C>,
  options: Ledger9UnprovenDeployTxOptions<C>
): Promise<Ledger9UnsubmittedDeployTxData<C>> {
  await requireLedger9Contract(options.compiledContract, providers.zkConfigProvider, 'createLedger9UnprovenDeployTx');
  assertValidMidnightConfig(providers.config);
  return createLedger9UnprovenDeployTxFromVerifierKeys(
    providers.zkConfigProvider,
    parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), providers.config.networkId),
    options,
    providers.walletProvider.getEncryptionPublicKey(),
    providers.config
  );
}

export function createUnprovenDeployTxFromVerifierKeys<C extends Contract<undefined>>(
  zkConfigProvider: ZKConfigProvider<string>,
  coinPublicKey: CoinPublicKey,
  options: Ledger9DeployTxOptionsBase<C>,
  encryptionPublicKey: EncPublicKey,
  config: MidnightConfig
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

export function createUnprovenDeployTxFromVerifierKeys<C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  coinPublicKey: CoinPublicKey,
  options: Ledger9DeployTxOptionsWithPrivateState<C>,
  encryptionPublicKey: EncPublicKey,
  config: MidnightConfig
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

/**
 * Creates an unproven deploy transaction from the verifier keys, for a contract of the era its
 * artifacts declare. A ledger 9 contract runs {@link createLedger9UnprovenDeployTxFromVerifierKeys}, whose documentation covers
 * the parameters and the privacy-sensitive result.
 *
 * @throws EraMismatchError with reason `'contract-era-unsupported'` for a contract of an era this
 *         function does not serve, after the artifact era is read and before anything else, and with
 *         the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
 *         `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
 *         `'unknown-artifact-runtime-version'`. A failure of the ZK config provider propagates unchanged.
 */
export async function createUnprovenDeployTxFromVerifierKeys<C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  coinPublicKey: CoinPublicKey,
  options: Ledger9UnprovenDeployTxOptions<C>,
  encryptionPublicKey: EncPublicKey,
  config: MidnightConfig
): Promise<Ledger9UnsubmittedDeployTxData<C>> {
  const era = await resolveArtifactEra(options.compiledContract, zkConfigProvider);
  switch (era) {
    case 'v9':
      return createLedger9UnprovenDeployTxFromVerifierKeys(zkConfigProvider, coinPublicKey, options, encryptionPublicKey, config);
    case 'v8':
      throw unsupportedContractEra('createUnprovenDeployTxFromVerifierKeys', era);
    default:
      return assertNever(era, 'createUnprovenDeployTxFromVerifierKeys');
  }
}

export async function createUnprovenDeployTx<C extends Contract<undefined>>(
  providers: Ledger9UnprovenDeployTxProviders<C>,
  options: Ledger9DeployTxOptionsBase<C>
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

export async function createUnprovenDeployTx<C extends Contract.Any>(
  providers: Ledger9UnprovenDeployTxProviders<C>,
  options: Ledger9DeployTxOptionsWithPrivateState<C>
): Promise<Ledger9UnsubmittedDeployTxData<C>>;

/**
 * Creates an unproven deploy transaction for a contract of the era its artifacts declare. A ledger 9
 * contract runs {@link createLedger9UnprovenDeployTx}, whose documentation covers
 * the parameters and the privacy-sensitive result.
 *
 * @throws EraMismatchError with reason `'contract-era-unsupported'` for a contract of an era this
 *         function does not serve, after the artifact era is read and before anything else, and with
 *         the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
 *         `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
 *         `'unknown-artifact-runtime-version'`. A failure of the ZK config provider propagates unchanged.
 */
export async function createUnprovenDeployTx<C extends Contract.Any>(
  providers: Ledger9UnprovenDeployTxProviders<C>,
  options: Ledger9UnprovenDeployTxOptions<C>
): Promise<Ledger9UnsubmittedDeployTxData<C>> {
  const era = await resolveArtifactEra(options.compiledContract, providers.zkConfigProvider);
  switch (era) {
    case 'v9':
      return createLedger9UnprovenDeployTx(providers, options);
    case 'v8':
      throw unsupportedContractEra('createUnprovenDeployTx', era);
    default:
      return assertNever(era, 'createUnprovenDeployTx');
  }
}
