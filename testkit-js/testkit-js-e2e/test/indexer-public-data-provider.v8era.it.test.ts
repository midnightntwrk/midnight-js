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

import { type IndexerPublicDataProvider,indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { networkHeadVersion, versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';
import { createLogger, getTestEnvironment, type TestEnvironment } from '@midnight-ntwrk/testkit-js';
import fetch from 'cross-fetch';
import path from 'path';

import { UNDEPLOYED_CONTRACT_ADDRESS, VERY_SLOW_TEST_TIMEOUT } from '../src/constants';

const logger = createLogger(path.resolve(`${process.cwd()}`, 'logs', 'tests', `v8era_${new Date().toISOString()}.log`));

/**
 * The pre-fork era environment (spec QA-6).
 *
 * This file runs against the `v8era` docker image set -- node 1.0.0, indexer
 * 4.4.0-rc.5, proof server 8.1.0 -- which is a real ledger-v8 network, not a mock
 * and not a recorded response. It is excluded from the default e2e matrix by its
 * `.v8era.` filename segment and driven by the dedicated lane in
 * `ci-testkit-js.yml`, because the default lane pins the current-era images and
 * every assertion here would be wrong there.
 *
 * If it is ever pointed at a non-v8 stack it fails naming the era it found,
 * rather than skipping: a silently skipped era assertion is indistinguishable
 * from a passing one, and this file is the only place the pre-fork era is
 * exercised against a live network.
 */
describe('Indexer API on a pre-fork (ledger v8) network', () => {
  let testEnvironment: TestEnvironment;
  let publicDataProvider: IndexerPublicDataProvider;
  let indexerQueryUrl: string;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    const environmentConfiguration = await testEnvironment.start();
    indexerQueryUrl = environmentConfiguration.indexer;
    publicDataProvider = indexerPublicDataProvider({
      queryURL: environmentConfiguration.indexer,
      subscriptionURL: environmentConfiguration.indexerWS
    });
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    publicDataProvider?.dispose();
    await testEnvironment?.shutdown();
  }, VERY_SLOW_TEST_TIMEOUT);

  test('the network under test is a pre-fork one', async () => {
    // Arrange / Act.
    const protocolVersion = await publicDataProvider.queryLatestProtocolVersion();

    // Assert: the guard for every other assertion in this file. The message names
    // the integer, because "this lane ran against the wrong images" and "the era
    // mapping regressed" are different failures and the version tells them apart.
    expect({ era: versionOfRecord({ protocolVersion }), protocolVersion }).toEqual({
      era: 'v8',
      protocolVersion
    });
  });

  test('reports exactly the protocolVersion the indexer serves on its head block', async () => {
    // Arrange: read the source field directly, bypassing the provider, so this
    // compares against the indexer rather than against a second reading taken the
    // same way.
    const response = await fetch(indexerQueryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'query { block { protocolVersion } }' })
    });
    const payload = (await response.json()) as { data: { block: { protocolVersion: number } } };

    // Act.
    const version = await publicDataProvider.queryLatestProtocolVersion();

    // Assert.
    expect(version).toEqual(payload.data.block.protocolVersion);
  });

  test('the construct path and the read path agree on the era of a pre-fork network', async () => {
    // Arrange / Act: the two resolvers answer different questions -- which era a
    // transaction built now lands in, and which era produced a record -- and tag
    // their errors with different codes. On a settled network they must agree.
    const headEra = await networkHeadVersion(publicDataProvider);
    const recordEra = versionOfRecord({ protocolVersion: await publicDataProvider.queryLatestProtocolVersion() });

    // Assert.
    expect(headEra).toBe('v8');
    expect(recordEra).toBe('v8');
  });

  test('dates a state read on a pre-fork network without refusing it', async () => {
    // Arrange / Act: an absent contract is the read path's cheapest exercise --
    // it still resolves the era of the read before it can answer.
    const raw = await publicDataProvider.queryRawContractState(UNDEPLOYED_CONTRACT_ADDRESS);
    const parsed = await publicDataProvider.queryContractState(UNDEPLOYED_CONTRACT_ADDRESS);

    // Assert: null, not a thrown era failure.
    expect(raw).toBeNull();
    expect(parsed).toBeNull();
  });
});
