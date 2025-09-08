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

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import path from 'path';
import type { Logger } from 'pino';
import { WebSocket } from 'ws';

import type { BlockTimeContract, BlockTimeProviders, DeployedBlockTimeContract } from '@/e2e/block-time-types';
import { type ContractConfiguration } from '@/infrastructure';

import { CompilerBlockTime } from './contract';

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

// TODO: create class accepting logger

let logger: Logger;

export const setLogger = (_logger: Logger) => {
  logger = _logger;
};

export class BlockTimeConfiguration implements ContractConfiguration {
  readonly privateStateStoreName;
  readonly zkConfigPath;
  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName || 'block-time-private-state';
    this.zkConfigPath = zkConfigPath || path.resolve(currentDir, '..', '..', 'dist', 'contract', 'managed', 'block-time');
  }
}

export const CIRCUIT_ID_TEST_BLOCK_TIME_LT = 'testBlockTimeLt' as const;
export const CIRCUIT_ID_TEST_BLOCK_TIME_GTE = 'testBlockTimeGte' as const;
export const CIRCUIT_ID_TEST_BLOCK_TIME_LTE = 'testBlockTimeLte' as const;

export const blockTimeContractInstance: BlockTimeContract = new CompilerBlockTime.Contract({});

export const deploy = async (
  providers: BlockTimeProviders
): Promise<DeployedBlockTimeContract> => {
  logger.info('Deploying block time contract...');
  const blockTimeContract = await deployContract(providers, {
    contract: blockTimeContractInstance
  });
  logger.info(`Deployed contract at address: ${blockTimeContract.deployTxData.public.contractAddress}`);
  return blockTimeContract;
};

export const testBlockTimeLt = async (blockTimeContract: DeployedBlockTimeContract, time: bigint): Promise<FinalizedTxData> => {
  logger.info('Testing block time less than...');
  const finalizedTxData = await blockTimeContract.callTx.testBlockTimeLt(time);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const testBlockTimeGte = async (blockTimeContract: DeployedBlockTimeContract, time: bigint): Promise<FinalizedTxData> => {
  logger.info('Testing block time greater than or equal...');
  const finalizedTxData = await blockTimeContract.callTx.testBlockTimeGte(time);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const testBlockTimeGt = async (blockTimeContract: DeployedBlockTimeContract, time: bigint): Promise<FinalizedTxData> => {
  logger.info('Testing block time greater than...');
  const finalizedTxData = await blockTimeContract.callTx.testBlockTimeGt(time);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const testBlockTimeLte = async (blockTimeContract: DeployedBlockTimeContract, time: bigint): Promise<FinalizedTxData> => {
  logger.info('Testing block time less than or equal...');
  const finalizedTxData = await blockTimeContract.callTx.testBlockTimeLte(time);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

