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

import path from 'node:path';

import {
  BlankVerifierKeySlotError,
  deployContract,
  type Ledger8,
  submitCallTx,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from '@midnight-ntwrk/midnight-js-contracts';
import { MaintenanceAuthorityMismatchError, versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';
import { sampleSigningKey, type SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type { ZkConfigIntegrityOptions } from '@midnight-ntwrk/midnight-js-utils';
import {
  type ContractConfiguration,
  createLogger,
  type EnvironmentConfiguration,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { VERY_SLOW_TEST_TIMEOUT } from '../src/constants';
import { Contract as RetainedBlockTimeContract } from '../src/contract/compiled-retained/block-time/contract/index.js';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `governance_v8era_${new Date().toISOString()}.log`)
);

/**
 * Contract maintenance through a retained-era artifact against a live pre-fork chain, driven by
 * the `v8era` image set the `.v8era.` filename selects.
 *
 * One contract, one ordered story: a removed verifier key stops the circuit, an inserted one
 * brings it back, and a replaced authority moves the right to maintain from the old key to the new
 * one. Each step depends on the state the step before left on chain.
 */
const ARTIFACT_PATH = path.resolve(__dirname, '../src/contract/compiled-retained/block-time');
const CIRCUIT_ID = 'testBlockTimeGte';
const BLOCK_TIME_BUFFER_SECONDS = 60n;

class RetainedBlockTimeConfiguration implements ContractConfiguration {
  readonly privateStateStoreName = `governance-v8era-private-store-${Date.now()}`;

  readonly zkConfigPath = ARTIFACT_PATH;

  /** `compactc` 0.31.1 emits no manifest, so the default `require` mode has nothing to read. */
  get zkConfigIntegrity(): ZkConfigIntegrityOptions {
    return { verify: 'warn' };
  }
}

const contract = new RetainedBlockTimeContract<undefined>({});

const pastTime = (): bigint => BigInt(Math.floor(Date.now() / 1_000)) - BLOCK_TIME_BUFFER_SECONDS;

describe('Contract maintenance through a retained-era artifact on a pre-fork (ledger v8) network', () => {
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let providers: Ledger8.ContractProviders<typeof contract, Ledger8.CircuitId<typeof contract>>;
  let contractAddress: ContractAddress;
  let deployKey: SigningKey;

  const callCircuit = () =>
    submitCallTx(providers, { compiledContract: contract, contractAddress, circuitId: CIRCUIT_ID, args: [pastTime()] });

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, new RetainedBlockTimeConfiguration());

    const deployed = await deployContract(providers, { compiledContract: contract });
    contractAddress = deployed.contractAddress;
    deployKey = deployed.deployTxData.private.signingKey;
    logger.info(`Deployed retained block-time twin at address: ${contractAddress}`);
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment?.shutdown();
  }, VERY_SLOW_TEST_TIMEOUT);

  test('the network under test is a pre-fork one', async () => {
    // Act.
    const protocolVersion = await providers.publicDataProvider.queryLatestProtocolVersion();

    // Assert: on a post-fork chain every test below would be refused for a different reason.
    expect(versionOfRecord({ protocolVersion })).toBe('v8');
  });

  test(
    'a removed verifier key makes the circuit refuse to run',
    async () => {
      // Act.
      const removed = await submitRemoveVerifierKeyTx(providers, contract, contractAddress, CIRCUIT_ID);

      // Assert.
      expect([removed.era, removed.public.version, removed.public.status]).toEqual(['v8', 'v8', SucceedEntirely]);
      await expect(callCircuit()).rejects.toThrow(BlankVerifierKeySlotError);
    },
    VERY_SLOW_TEST_TIMEOUT
  );

  test(
    'an inserted verifier key brings the circuit back',
    async () => {
      // Arrange.
      const verifierKey = await providers.zkConfigProvider.getVerifierKey(CIRCUIT_ID);

      // Act.
      const inserted = await submitInsertVerifierKeyTx(providers, contract, contractAddress, CIRCUIT_ID, verifierKey);
      const called = await callCircuit();

      // Assert.
      expect([inserted.era, inserted.public.status]).toEqual(['v8', SucceedEntirely]);
      expect(called.public.status).toBe(SucceedEntirely);
    },
    VERY_SLOW_TEST_TIMEOUT
  );

  test(
    'a replaced authority stores the new key, and the old key can no longer maintain the contract',
    async () => {
      // Arrange.
      const newKey = sampleSigningKey();

      // Act.
      const replaced = await submitReplaceAuthorityTx(providers, contract, contractAddress)(newKey);
      const storedAfterReplace = await providers.privateStateProvider.getSigningKey(contractAddress);
      await providers.privateStateProvider.setSigningKey(contractAddress, deployKey);

      // Assert.
      expect([replaced.era, replaced.public.status]).toEqual(['v8', SucceedEntirely]);
      expect(storedAfterReplace).toEqual(newKey);
      await expect(submitRemoveVerifierKeyTx(providers, contract, contractAddress, CIRCUIT_ID)).rejects.toThrow(
        MaintenanceAuthorityMismatchError
      );

      // And the new key does maintain it.
      await providers.privateStateProvider.setSigningKey(contractAddress, newKey);
      const removed = await submitRemoveVerifierKeyTx(providers, contract, contractAddress, CIRCUIT_ID);
      expect(removed.public.status).toBe(SucceedEntirely);
    },
    VERY_SLOW_TEST_TIMEOUT
  );
});
