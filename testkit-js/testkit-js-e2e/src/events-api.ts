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

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { type ContractConfiguration } from '@midnight-ntwrk/testkit-js';
import path from 'path';
import type { Logger } from 'pino';
import { WebSocket } from 'ws';

import type { DeployedEventsContract, EventsProviders } from '@/types/events-types';

import { CompiledEventsContract } from './contract';

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

let logger: Logger;

export const setLogger = (_logger: Logger) => {
  logger = _logger;
};

export class EventsConfiguration implements ContractConfiguration {
  readonly privateStateStoreName;
  readonly zkConfigPath;
  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName || 'events-private-state';
    this.zkConfigPath = zkConfigPath || path.resolve(currentDir, '..', 'dist', 'contract', 'compiled', 'events');
  }
}

export const deploy = async (providers: EventsProviders): Promise<DeployedEventsContract> => {
  logger.info('Deploying events contract...');
  const eventsContract = await deployContract(providers, {
    compiledContract: CompiledEventsContract
  });
  logger.info(`Deployed contract at address: ${eventsContract.deployTxData.public.contractAddress}`);
  return eventsContract;
};

const submit = async (label: string, call: Promise<{ public: FinalizedTxData }>): Promise<FinalizedTxData> => {
  logger.info(`Emitting ${label}...`);
  const { public: finalizedTxData } = await call;
  logger.info(`Transaction ${finalizedTxData.txId} added in block ${finalizedTxData.blockHeight}`);
  return finalizedTxData;
};

export const emitMisc = (
  eventsContract: DeployedEventsContract,
  name: Uint8Array,
  payload: Uint8Array
): Promise<FinalizedTxData> => submit('Misc', eventsContract.callTx.emitMisc(name, payload));

export const emitShieldedSpend = (
  eventsContract: DeployedEventsContract,
  nullifier: Uint8Array
): Promise<FinalizedTxData> => submit('ShieldedSpend', eventsContract.callTx.emitShieldedSpend(nullifier));

export const emitShieldedBurn = (
  eventsContract: DeployedEventsContract,
  nullifier: Uint8Array
): Promise<FinalizedTxData> => submit('ShieldedBurn', eventsContract.callTx.emitShieldedBurn(nullifier));

export const emitUnshieldedSpend = (
  eventsContract: DeployedEventsContract,
  tokenType: Uint8Array,
  amount: bigint
): Promise<FinalizedTxData> => submit('UnshieldedSpend', eventsContract.callTx.emitUnshieldedSpend(tokenType, amount));

export const emitUnshieldedReceive = (
  eventsContract: DeployedEventsContract,
  tokenType: Uint8Array,
  amount: bigint
): Promise<FinalizedTxData> =>
  submit('UnshieldedReceive', eventsContract.callTx.emitUnshieldedReceive(tokenType, amount));

export const emitUnshieldedBurn = (
  eventsContract: DeployedEventsContract,
  tokenType: Uint8Array,
  amount: bigint
): Promise<FinalizedTxData> => submit('UnshieldedBurn', eventsContract.callTx.emitUnshieldedBurn(tokenType, amount));

export const emitLifecycle = (eventsContract: DeployedEventsContract): Promise<FinalizedTxData> =>
  submit('Paused + Unpaused', eventsContract.callTx.emitLifecycle());
