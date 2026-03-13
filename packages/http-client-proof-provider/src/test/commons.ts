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

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  type CoinPublicKey,
  createConstructorContext,
  emptyZswapLocalState,
  sampleSigningKey} from '@midnight-ntwrk/compact-runtime';
import {
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  type UnprovenTransaction,  ZswapChainState} from '@midnight-ntwrk/ledger-v7';
import { createUnprovenCallTxFromInitialStates, createUnprovenDeployTxFromVerifierKeys } from '@midnight-ntwrk/midnight-js-contracts';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createProverKey,
  createVerifierKey,
  createZKIR,
  type ProverKey,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR } from '@midnight-ntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import fs from 'fs/promises';

const currentDir = dirname(fileURLToPath(import.meta.url));

export const resourceDir = `${currentDir}/resources`;

const CONTRACT = `simple`;
const CIRCUIT_ID = 'add';

export const getValidZKConfig = async () => ({
  circuitId: CIRCUIT_ID,
  proverKey: createProverKey(await fs.readFile(`${resourceDir}/compiled/${CONTRACT}/keys/${CIRCUIT_ID}.prover`)),
  verifierKey: createVerifierKey(await fs.readFile(`${resourceDir}/compiled/${CONTRACT}/keys/${CIRCUIT_ID}.verifier`)),
  zkir: createZKIR(await fs.readFile(`${resourceDir}/compiled/${CONTRACT}/zkir/${CIRCUIT_ID}.bzkir`))
});

const createMockContractClass = (contractModule: any, coinPublicKey: CoinPublicKey) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  return class {
    constructor(witnesses: Contract.Witnesses<any>) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const contract = new contractModule.Contract({});

      this.witnesses = witnesses;
      this.initialState = (ctx: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        currentContractState: contract.initialState(
          createConstructorContext(
            undefined,
            parseCoinPublicKeyToHex(coinPublicKey, getNetworkId())
          )
        ).currentContractState,
        currentPrivateState: { test: 'mock-private-state' },
        currentZswapLocalState: emptyZswapLocalState(ctx.initialZswapLocalState.coinPublicKey)
      });
      this.circuits = contract.circuits;
      this.impureCircuits = this.circuits;
    }
    initialState;
    circuits;
    impureCircuits;
    witnesses;
  }
}

export const createMockCompiledContract = (contractModule: any, coinPublicKey: CoinPublicKey): CompiledContract.CompiledContract<any, unknown, never> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  return CompiledContract.make(CONTRACT, createMockContractClass(contractModule, coinPublicKey) as any).pipe( // eslint-disable-line @typescript-eslint/no-explicit-any
    CompiledContract.withVacantWitnesses
  ) as unknown as CompiledContract.CompiledContract<any, unknown, never>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const createMockZKConfigProvider = (): ZKConfigProvider<string> => {
  return new (class extends ZKConfigProvider<string> {
    async getZKIR(_: string): Promise<ZKIR> {
      const config = await getValidZKConfig();
      return Promise.resolve(config.zkir);
    }
    async getProverKey(_: string): Promise<ProverKey> {
      const config = await getValidZKConfig();
      return Promise.resolve(config.proverKey);
    }
    async getVerifierKey(_: string): Promise<VerifierKey> {
      const config = await getValidZKConfig();
      return Promise.resolve(config.verifierKey);
    }
  })();
};

/**
 * Creates a valid UnprovenTransaction for testing using proper object construction
 * from the topic contract instead of binary data.
 */
export const getValidUnprovenTx = async (): Promise<UnprovenTransaction> => {
  const mockZKConfigProvider = createMockZKConfigProvider();
  const contractModule = await import(`${resourceDir}/managed/${CONTRACT}/contract/index.js`);
  const coinPublicKey = sampleCoinPublicKey();
  const mockCompiledContract = createMockCompiledContract(contractModule, coinPublicKey);
  const encryptionPublicKey = sampleEncryptionPublicKey();

  const deploy = await createUnprovenDeployTxFromVerifierKeys(
    mockZKConfigProvider,
    coinPublicKey,
    {
      compiledContract: mockCompiledContract,
      signingKey: sampleSigningKey()
    },
    encryptionPublicKey
  );


  const callOptions = {
    compiledContract: mockCompiledContract,
    circuitId: CIRCUIT_ID,
    contractAddress: sampleContractAddress(),
    coinPublicKey,
    initialContractState: deploy.public.initialContractState,
    initialZswapChainState: new ZswapChainState(),
    arguments: []
  };

  const result = await createUnprovenCallTxFromInitialStates(
    createMockZKConfigProvider(),
    callOptions,
    encryptionPublicKey
  );

  return result.private.unprovenTx;
};
