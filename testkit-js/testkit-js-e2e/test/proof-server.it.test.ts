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
} from '@midnight-ntwrk/ledger-v6';
import {
  createUnprovenCallTxFromInitialStates,
  createUnprovenDeployTxFromVerifierKeys
} from '@midnight-ntwrk/midnight-js-contracts';
import { DEFAULT_CONFIG, httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type { ProofProvider, ZKConfig } from '@midnight-ntwrk/midnight-js-types';
import { getImpureCircuitIds } from '@midnight-ntwrk/midnight-js-types';
import {
  createLogger,
  DynamicProofServerContainer,
  type ProofServerContainer
} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { createInitialPrivateState } from '@/contract';
import * as api from '@/counter-api';
import { CounterConfiguration, counterContractInstance } from '@/counter-api';
import type { CounterCircuits } from '@/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `proof_server_${new Date().toISOString()}.log`)
);

describe('Proof server integration', () => {
  const circuitId = 'increment';
  const privateStateZero = createInitialPrivateState(0);

  let proofServerContainer: ProofServerContainer;
  let proofProvider: ProofProvider<CounterCircuits>;
  let unprovenDeployTx: UnprovenTransaction;
  let unprovenCallTx: UnprovenTransaction;
  let zkConfig: ZKConfig<CounterCircuits>;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    proofServerContainer = await DynamicProofServerContainer.start(logger);
    proofProvider = httpClientProofProvider(proofServerContainer.getUrl());
    const zkConfigProvider = new NodeZkConfigProvider<CounterCircuits>(new CounterConfiguration().zkConfigPath);
    const coinPublicKey = sampleCoinPublicKey();
    const encryptionPublicKey = sampleEncryptionPublicKey();
    const signingKey = sampleSigningKey();
    const verifierKeys = await zkConfigProvider.getVerifierKeys(getImpureCircuitIds(counterContractInstance));
    const unprovenDeployTxResult = createUnprovenDeployTxFromVerifierKeys(
      verifierKeys,
      coinPublicKey,
      {
        contract: api.counterContractInstance,
        initialPrivateState: privateStateZero,
        signingKey
      },
      encryptionPublicKey
    );
    unprovenDeployTx = unprovenDeployTxResult.private.unprovenTx!;
    unprovenCallTx = createUnprovenCallTxFromInitialStates(
      {
        contract: api.counterContractInstance,
        circuitId,
        contractAddress: unprovenDeployTxResult.public.contractAddress,
        coinPublicKey,
        initialContractState: unprovenDeployTxResult.public.initialContractState,
        initialZswapChainState: new ZswapChainState(),
        initialPrivateState: unprovenDeployTxResult.private.initialPrivateState
      },
      coinPublicKey,
      encryptionPublicKey
    ).private.unprovenTx;
    zkConfig = await zkConfigProvider.get(circuitId);
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
    const provenCallTx = await proofProvider.proveTx(unprovenCallTx, { zkConfig });
    const contractActionsCall = provenCallTx.intents?.get(1)?.actions;
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

    const provenCallTx = await proofProvider.proveTx(unprovenCallTx, { zkConfig });
    expect(() => provenCallTx.wellFormed(ledgerState, strictness, new Date())).not.toThrow();
  });
  /**
   * Test error handling for invalid ZKConfig circuit ID.
   *
   * @given A proof provider and unproven call transaction
   * @and Invalid ZKConfig with wrong circuit ID
   * @when Attempting to prove transaction with invalid configuration
   * @then Should throw Bad Request error for invalid circuit ID
   */
  test('should throw error for invalid ZKConfig circuitId', async () => {
    const invalidZkConfig = { ...zkConfig, circuitId: 'invalid' as CounterCircuits };
    await expect(proofProvider.proveTx(unprovenCallTx, { zkConfig: invalidZkConfig })).rejects.toThrow('Bad Request');
  });

  /**
   * Test error handling for undefined ZKConfig.
   *
   * @given A proof provider and unproven call transaction
   * @and No ZKConfig provided
   * @when Attempting to prove transaction without configuration
   * @then Should throw Bad Request error for missing ZKConfig
   */
  test('should throw error for undefined ZKConfig', async () => {
    await expect(proofProvider.proveTx(unprovenCallTx)).rejects.toThrow('Bad Request');
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
          timeout,
          zkConfig
        })
      )
    );
    expect(results).toHaveLength(numTxsToProve);
    results.forEach((result) => {
      expect(result).toBeDefined();
      const contractActions = result.intents?.get(1)?.actions;
      expect(contractActions).toBeDefined();
      if (contractActions) {
        expect(contractActions[0]).toHaveLength(1);
        expect(contractActions[0]).toBeInstanceOf(ContractCall);
        expect((contractActions[0] as ContractCall<Proof>).entryPoint).toEqual(circuitId);
      }
    });
  });
});
