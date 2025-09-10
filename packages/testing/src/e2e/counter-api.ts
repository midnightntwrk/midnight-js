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

import type { ContractAddress } from '@midnight-ntwrk/ledger-v6';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import path from 'path';
import type { Logger } from 'pino';
import { WebSocket } from 'ws';

import {
  type ContractConfiguration,
  type EnvironmentConfiguration,
  initializeMidnightProviders,
  type MidnightWalletProvider
} from '@/infrastructure';

import {
  CompiledCounter,
  type CounterPrivateState,
  createInitialPrivateState
} from './contract';
import { type CounterCloneContract,createCounterCloneContractInstance } from './counter-clone-types';
import {
  type CounterContract,
  CounterPrivateStateId,
  type CounterProviders,
  createCounterContractInstance,
  type DeployedCounterContract
} from './counter-types';
import { createSimpleContractInstance, type SimpleContract } from './simple-types';

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

// TODO: create class accepting logger

let logger: Logger;

export const setLogger = (_logger: Logger) => {
  logger = _logger;
};

export const CIRCUIT_ID_RESET = 'reset';
export const CIRCUIT_ID_INCREMENT = 'increment';
export const CIRCUIT_ID_DECREMENT = 'decrement';
export const CONTRACT_CIRCUITS = ['decrement', 'increment', 'reset'];

export class CounterConfiguration implements ContractConfiguration {
  readonly privateStateStoreName;
  readonly zkConfigPath;
  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName || 'counter-private-state';
    this.zkConfigPath = zkConfigPath || path.resolve(currentDir, '..', '..', 'dist', 'contract', 'managed', 'counter');
  }
}

export class CounterCloneConfiguration implements ContractConfiguration {
  readonly privateStateStoreName;
  readonly zkConfigPath;
  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName || 'counter-clone-private-state';
    this.zkConfigPath =
      zkConfigPath || path.resolve(currentDir, '..', '..', 'dist', 'contract', 'managed', 'counter-clone');
  }
}

export class SimpleConfiguration implements ContractConfiguration {
  readonly privateStateStoreName;
  readonly zkConfigPath;
  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName || 'simple-private-state';
    this.zkConfigPath = zkConfigPath || path.resolve(currentDir, '..', '..', 'dist', 'contract', 'managed', 'simple');
  }
}

export const getCounterPrivateState = async (
  providers: CounterProviders,
  privateStateId: typeof CounterPrivateStateId
): Promise<CounterPrivateState | null> => {
  logger.info('Checking contract private state...');
  const privateState = await providers.privateStateProvider.get(privateStateId);
  logger.info(`Private state: ${privateState?.privateCounter}`);
  return privateState;
};

export const getCounterLedgerState = async (
  providers: CounterProviders,
  contractAddress: ContractAddress
): Promise<bigint | null> => {
  assertIsContractAddress(contractAddress);
  logger.info('Checking contract ledger state...');
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? CompiledCounter.ledger(contractState.data).round : null));
  logger.info(`Ledger state: ${state}`);
  return state;
};

export const simpleContractInstance: SimpleContract = createSimpleContractInstance();

export const counterContractInstance: CounterContract = createCounterContractInstance();

export const cloneContractInstance: CounterCloneContract = createCounterCloneContractInstance();

export const deploy = async (
  providers: CounterProviders,
  privateState: CounterPrivateState
): Promise<DeployedCounterContract> => {
  logger.info('Deploying counter contract...');
  const counterContract = await deployContract(providers, {
    contract: counterContractInstance,
    privateStateId: CounterPrivateStateId,
    initialPrivateState: privateState
  });
  logger.info(`Deployed contract at address: ${counterContract.deployTxData.public.contractAddress}`);
  return counterContract;
};

export const increment = async (counterContract: DeployedCounterContract): Promise<FinalizedTxData> => {
  logger.info('Incrementing...');
  const finalizedTxData = await counterContract.callTx.increment();
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const randomCircuitId = (length = 32) =>
  Array.from({ length }, () => 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26))).join('');

const getConfigurationWithEmptyPrivateStore = () => {
  return new CounterConfiguration(`counter-private-store-${Date.now()}`);
};

export const deployCounterContract = async (
  wallet: MidnightWalletProvider,
  environmentConfiguration: EnvironmentConfiguration
) => {
  logger.info(`Deploying new contract`);
  const privateState = createInitialPrivateState(0);
  logger.info(`Private state: ${JSON.stringify(privateState)}`);
  const counterProviders: CounterProviders = initializeMidnightProviders(
    wallet,
    environmentConfiguration,
    getConfigurationWithEmptyPrivateStore()
  );
  const deployedCounterContract: DeployedCounterContract = await deploy(counterProviders, privateState);
  const { contractAddress } = deployedCounterContract.deployTxData.public;
  logger.info(`Contract deployed`);
  return { counterProviders, deployedCounterContract, contractAddress, privateState };
};
