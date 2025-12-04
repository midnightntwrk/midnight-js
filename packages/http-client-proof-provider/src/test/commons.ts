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

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type * as Contract from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  ChargedState,
  type ContractState,
  emptyZswapLocalState,
  sampleSigningKey,
  type SigningKey,
  StateValue
} from '@midnight-ntwrk/compact-runtime';
import {
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  type TokenType,
  type UnprovenTransaction,
  type ZswapChainState} from '@midnight-ntwrk/ledger-v6';
import { createUnprovenCallTxFromInitialStates, createUnprovenDeployTxFromVerifierKeys } from '@midnight-ntwrk/midnight-js-contracts';
import { createProverKey,
  createVerifierKey,
  createZKIR,
  type ProverKey,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR } from '@midnight-ntwrk/midnight-js-types';
import fs from 'fs/promises';

const currentDir = dirname(fileURLToPath(import.meta.url));

export const resourceDir = `${currentDir}/resources`;

const CONTRACT = `simple`;
const CIRCUIT_ID = 'add';

export const getValidZKConfig = async () => ({
  circuitId: CIRCUIT_ID,
  proverKey: createProverKey(await fs.readFile(`${resourceDir}/managed/${CONTRACT}/keys/${CIRCUIT_ID}.prover`)),
  verifierKey: createVerifierKey(await fs.readFile(`${resourceDir}/managed/${CONTRACT}/keys/${CIRCUIT_ID}.verifier`)),
  zkir: createZKIR(await fs.readFile(`${resourceDir}/managed/${CONTRACT}/zkir/${CIRCUIT_ID}.bzkir`))
});

export const createMockContractState = (signingKey?: SigningKey): ContractState => ({
  serialize: vi.fn().mockReturnValue(new Uint8Array(32)),
  data: new ChargedState(StateValue.newNull()),
  operation: vi.fn().mockImplementation((_circuitId: string) => ({
    verifierKey: new Uint8Array(32)
  })),
  query: vi.fn(),
  operations: vi.fn(),
  setOperation: vi.fn(),
  maintenanceAuthority: {
    threshold: 1,
    committee: [signingKey || sampleSigningKey()],
    counter: 1n,
    serialize: function (): Uint8Array {
      throw new Error('Function not implemented.');
    }
  },
  balance: {} as Map<TokenType, bigint>
});

const createMockContractClass = () => {
  const testCircuit = vi.fn().mockImplementation((ctx) => ({
    result: { test: 'result ' },
    context: {
      ...ctx,
      currentPrivateState: { test: 'next-private-state' }
    },
    proofData: {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    }
  }));
  return class {
    constructor(witnesses: Contract.Witnesses<any>) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.witnesses = witnesses;
      this.initialState = vi.fn().mockImplementation((ctx) => ({
        currentContractState: createMockContractState(),
        currentPrivateState: { test: 'mock-private-state' },
        currentZswapLocalState: emptyZswapLocalState(ctx.initialZswapLocalState.coinPublicKey)
      }));
      this.circuits = {
        [CIRCUIT_ID]: testCircuit
      };
      this.impureCircuits = {
        [CIRCUIT_ID]: testCircuit
      }
    }
    initialState;
    circuits;
    impureCircuits;
    witnesses;
  }
}

export const createMockContract = (): Contract.Contract<undefined> =>
  new (createMockContractClass())({});

export const createMockCompiledContract = (): CompiledContract.CompiledContract<any, unknown, never> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  return CompiledContract.make('test', createMockContractClass()).pipe(
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
  const mockCompiledContract = createMockCompiledContract();
  const coinPublicKey = sampleCoinPublicKey();
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
    compiledContract: createMockCompiledContract(),
    circuitId: CIRCUIT_ID,
    contractAddress: sampleContractAddress(),
    coinPublicKey,
    initialContractState: deploy.public.initialContractState,
    initialZswapChainState: {} as ZswapChainState,
    arguments: []
  };

  const result = await createUnprovenCallTxFromInitialStates(
    createMockZKConfigProvider(),
    callOptions,
    sampleEncryptionPublicKey()
  );

  return result.private.unprovenTx;
};
