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

import {
  deployContract,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type { EnvironmentConfiguration, MidnightWalletProvider, TestEnvironment } from '@midnight-ntwrk/testkit-js';
import {
  createLogger,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders
} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { SLOW_TEST_TIMEOUT } from '@/constants';
import { CompiledCounterContract } from '@/contract';
import { CIRCUIT_ID_INCREMENT, CounterConfiguration } from '@/counter-api';
import { CounterPrivateStateId, type CounterProviders, privateStateZero } from '@/types/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `signing-key_${new Date().toISOString()}.log`)
);

describe('Contract maintenance authority signing keys', () => {
  let providers: CounterProviders;
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let contractConfiguration: CounterConfiguration;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    contractConfiguration = new CounterConfiguration();
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  /**
   * Smoke test that both Schnorr and ECDSA contract maintenance authority keys can authorize a
   * maintenance update on a live node.
   *
   * The maintenance authority key is the only key that signs contract maintenance updates; ordinary
   * circuit calls are signed by the wallet, not the authority key. A successful
   * {@link submitReplaceAuthorityTx} therefore proves the current authority key's kind signed the
   * update and was verified by the node.
   *
   * @given A Counter contract deployed with a Schnorr maintenance authority key
   * @when Replacing the authority with an ECDSA key, then replacing it again with a Schnorr key
   * @then Both replacements succeed entirely, proving Schnorr then ECDSA keys each signed a
   *       maintenance update, and the stored authority reflects each new key
   */
  test(
    'should replace the contract maintenance authority across schnorr and ecdsa signing keys [@slow]',
    async () => {
      const schnorrKey = sampleSigningKey('schnorr');
      const deployTxOptions = {
        compiledContract: CompiledCounterContract,
        signingKey: schnorrKey,
        privateStateId: CounterPrivateStateId,
        initialPrivateState: privateStateZero
      };
      const deployedContract = await deployContract(providers, deployTxOptions);
      await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);

      const contractAddress: ContractAddress = deployedContract.deployTxData.public.contractAddress;
      providers.privateStateProvider.setContractAddress(contractAddress);
      expect(await providers.privateStateProvider.getSigningKey(contractAddress)).toEqual(schnorrKey);

      const ecdsaKey = sampleSigningKey('ecdsa');
      const replaceWithEcdsa = await submitReplaceAuthorityTx(
        providers,
        CompiledCounterContract,
        contractAddress
      )(ecdsaKey);
      expect(replaceWithEcdsa.status).toBe(SucceedEntirely);
      expect(await providers.privateStateProvider.getSigningKey(contractAddress)).toEqual(ecdsaKey);

      const nextSchnorrKey = sampleSigningKey('schnorr');
      const replaceWithSchnorr = await submitReplaceAuthorityTx(
        providers,
        CompiledCounterContract,
        contractAddress
      )(nextSchnorrKey);
      expect(replaceWithSchnorr.status).toBe(SucceedEntirely);
      expect(await providers.privateStateProvider.getSigningKey(contractAddress)).toEqual(nextSchnorrKey);
    },
    SLOW_TEST_TIMEOUT
  );

  /**
   * Smoke test that an ECDSA maintenance authority key can authorize a maintenance update without
   * any change of key kind. Isolates ECDSA signing from the cross-kind transition: the contract is
   * deployed with an ECDSA authority and the authority is replaced with another ECDSA key.
   *
   * @given A Counter contract deployed with an ECDSA maintenance authority key
   * @when Replacing the authority with another ECDSA key
   * @then The replacement succeeds entirely, proving an ECDSA key signed a maintenance update that
   *       the node accepted, and the stored authority reflects the new key
   */
  test(
    'should replace the contract maintenance authority using ecdsa signing keys [@slow]',
    async () => {
      const ecdsaKey = sampleSigningKey('ecdsa');
      const deployTxOptions = {
        compiledContract: CompiledCounterContract,
        signingKey: ecdsaKey,
        privateStateId: CounterPrivateStateId,
        initialPrivateState: privateStateZero
      };
      const deployedContract = await deployContract(providers, deployTxOptions);
      await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);

      const contractAddress: ContractAddress = deployedContract.deployTxData.public.contractAddress;
      providers.privateStateProvider.setContractAddress(contractAddress);
      expect(await providers.privateStateProvider.getSigningKey(contractAddress)).toEqual(ecdsaKey);

      const nextEcdsaKey = sampleSigningKey('ecdsa');
      const replaceWithEcdsa = await submitReplaceAuthorityTx(
        providers,
        CompiledCounterContract,
        contractAddress
      )(nextEcdsaKey);
      expect(replaceWithEcdsa.status).toBe(SucceedEntirely);
      expect(await providers.privateStateProvider.getSigningKey(contractAddress)).toEqual(nextEcdsaKey);
    },
    SLOW_TEST_TIMEOUT
  );

  /**
   * Proves that an ECDSA contract maintenance authority can authorize the verifier-key maintenance
   * actions — not only {@link submitReplaceAuthorityTx}, but {@link submitRemoveVerifierKeyTx} and
   * {@link submitInsertVerifierKeyTx} as well. Each maintenance update is signed by the ECDSA
   * authority key; a `SucceedEntirely` status therefore proves the ECDSA signature was produced and
   * verified by the node for both actions.
   *
   * @given A Counter contract deployed with an ECDSA maintenance authority key
   * @when Removing the `increment` verifier key, then re-inserting it
   * @then Both maintenance updates succeed entirely, proving the ECDSA authority signed each one
   */
  test(
    'should remove and re-insert a verifier key authorized by an ecdsa signing key [@slow]',
    async () => {
      const ecdsaKey = sampleSigningKey('ecdsa');
      const deployTxOptions = {
        compiledContract: CompiledCounterContract,
        signingKey: ecdsaKey,
        privateStateId: CounterPrivateStateId,
        initialPrivateState: privateStateZero
      };
      const deployedContract = await deployContract(providers, deployTxOptions);
      await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);

      const contractAddress: ContractAddress = deployedContract.deployTxData.public.contractAddress;
      providers.privateStateProvider.setContractAddress(contractAddress);
      expect(await providers.privateStateProvider.getSigningKey(contractAddress)).toEqual(ecdsaKey);

      // Capture the verifier key from the local artifacts before removing it on-chain so it can be
      // re-inserted afterwards.
      const incrementVk = await providers.zkConfigProvider.getVerifierKey(CIRCUIT_ID_INCREMENT);

      const removeResult = await submitRemoveVerifierKeyTx(
        providers,
        CompiledCounterContract,
        contractAddress,
        CIRCUIT_ID_INCREMENT
      );
      expect(removeResult.status).toBe(SucceedEntirely);

      const insertResult = await submitInsertVerifierKeyTx(
        providers,
        CompiledCounterContract,
        contractAddress,
        CIRCUIT_ID_INCREMENT,
        incrementVk
      );
      expect(insertResult.status).toBe(SucceedEntirely);

      // The authority key kind is unchanged by verifier-key maintenance actions.
      expect(await providers.privateStateProvider.getSigningKey(contractAddress)).toEqual(ecdsaKey);
    },
    SLOW_TEST_TIMEOUT
  );
});
