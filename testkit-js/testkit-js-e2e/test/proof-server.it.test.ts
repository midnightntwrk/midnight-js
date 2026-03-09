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

import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import {
  ContractCall,
  ContractDeploy,
  LedgerState,
  type Proof,
  sampleCoinPublicKey,
  sampleEncryptionPublicKey,
  type UnprovenTransaction,
  WellFormedStrictness,
  ZswapChainState
} from '@midnight-ntwrk/ledger-v7';
import {
  createUnprovenCallTxFromInitialStates,
  createUnprovenDeployTxFromVerifierKeys
} from '@midnight-ntwrk/midnight-js-contracts';
import { DEFAULT_CONFIG, httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types';
import {
  createLogger,
  DynamicProofServerContainer,
  type ProofServerContainer
} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { createInitialPrivateState } from '@/contract/witnesses';
import * as api from '@/counter-api';
import { CounterConfiguration } from '@/counter-api';
import type { CounterCircuits } from '@/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `proof_server_${new Date().toISOString()}.log`)
);

describe('Proof server integration', () => {
  const circuitId = 'increment';
  const privateStateZero = createInitialPrivateState(0);

  let proofServerContainer: ProofServerContainer;
  let proofProvider: ProofProvider;
  let unprovenDeployTx: UnprovenTransaction;
  let unprovenCallTx: UnprovenTransaction;
  let zkConfigProvider: NodeZkConfigProvider<CounterCircuits>;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    setNetworkId('undeployed');
    proofServerContainer = await DynamicProofServerContainer.start(logger);
    zkConfigProvider = new NodeZkConfigProvider<CounterCircuits>(new CounterConfiguration().zkConfigPath);
    proofProvider = httpClientProofProvider(proofServerContainer.getUrl(), zkConfigProvider);
    const coinPublicKey = sampleCoinPublicKey();
    const encryptionPublicKey = sampleEncryptionPublicKey();
    const signingKey = sampleSigningKey();
    const unprovenDeployTxResult = await createUnprovenDeployTxFromVerifierKeys(
      zkConfigProvider,
      coinPublicKey,
      {
        compiledContract: api.CompiledCounterContract,
        initialPrivateState: privateStateZero,
        signingKey
      },
      encryptionPublicKey
    );
    unprovenDeployTx = unprovenDeployTxResult.private.unprovenTx!;
    unprovenCallTx = (await createUnprovenCallTxFromInitialStates(
      zkConfigProvider,
      {
        compiledContract: api.CompiledCounterContract,
        circuitId,
        contractAddress: unprovenDeployTxResult.public.contractAddress,
        coinPublicKey,
        initialContractState: unprovenDeployTxResult.public.initialContractState,
        initialZswapChainState: new ZswapChainState(),
        initialPrivateState: unprovenDeployTxResult.private.initialPrivateState
      },
      encryptionPublicKey
    )).private.unprovenTx;
  });

  afterAll(async () => {
    await proofServerContainer.stop();
  });

  /**
   * Test successful proof creation for deploy and call transactions.
   *
   * @given A proof server container and proof provider
   * @and Unproven deploy and call transactions with valid configuration
   * @when Creating proofs for both deploy and call transactions
   * @then Should successfully generate proofs for both transaction types
   * @and Should return valid ContractDeploy and ContractCall instances
   */
  test('should create proofs successfully for deploy and call transactions', async () => {
    const provenDeployTx = await proofProvider.proveTx(unprovenDeployTx);
    const contractActions = provenDeployTx.intents?.get(1)?.actions;
    expect(contractActions?.length).toEqual(1);
    if (contractActions) {
      expect(contractActions[0]).toBeInstanceOf(ContractDeploy);
    }
    const provenCallTx = await proofProvider.proveTx(unprovenCallTx);
    expect(provenCallTx.intents?.size ?? 0).toEqual(1);
    const contractActionsCall = [...provenCallTx.intents!.entries()][0][1].actions;
    expect(contractActionsCall?.length).toEqual(1);
    if (contractActionsCall) {
      expect(contractActionsCall[0]).toBeInstanceOf(ContractCall);
      expect((contractActionsCall[0] as ContractCall<Proof>).entryPoint).toEqual(circuitId);
    }
  });

  test('should create proofs with transactions that has succesfull well-formedness', async () => {
    const zSwapChainState = new ZswapChainState();
    const ledgerState = new LedgerState(getNetworkId(), zSwapChainState);
    const strictness = new WellFormedStrictness();
    strictness.verifyContractProofs = false;
    strictness.enforceBalancing = false;
    strictness.verifyNativeProofs = false;

    const provenDeployTx = await proofProvider.proveTx(unprovenDeployTx);
    expect(() => provenDeployTx.wellFormed(ledgerState, strictness, new Date())).not.toThrow();

    const provenCallTx = await proofProvider.proveTx(unprovenCallTx);
    expect(() => provenCallTx.wellFormed(ledgerState, strictness, new Date())).not.toThrow();
  });

  const numTxsToProve = 5;
  const timeout = numTxsToProve * DEFAULT_CONFIG.timeout;

  /**
   * Test parallel proof generation for multiple transactions.
   *
   * @given A proof provider and multiple identical unproven transactions
   * @and Valid ZKConfig and extended timeout configuration
   * @when Executing multiple proveTx calls in parallel
   * @then Should successfully prove all transactions without errors
   * @and Should return valid ContractCall instances for all results
   */
  test(`should execute ${numTxsToProve} proveTx calls in parallel without errors`, async () => {
    const results = await Promise.all(
      [...Array(numTxsToProve)].map(() =>
        proofProvider.proveTx(unprovenCallTx, {
          timeout
        })
      )
    );
    expect(results).toHaveLength(numTxsToProve);
    results.forEach((result) => {
      expect(result).toBeDefined();
      expect(result.intents?.size ?? 0).toEqual(1);
      const contractActions = [...result.intents!.entries()][0][1].actions;
      expect(contractActions).toBeDefined();
      if (contractActions) {
        expect(contractActions).toHaveLength(1);
        expect(contractActions[0]).toBeInstanceOf(ContractCall);
        const call = contractActions[0] as ContractCall<Proof>;
        expect(call.entryPoint).toEqual(circuitId);
      }
    });
  });
});
