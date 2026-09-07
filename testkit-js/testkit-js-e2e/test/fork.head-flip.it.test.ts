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
import { networkHeadVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { createLogger, type EnvironmentConfiguration, ForkTestEnvironment } from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { VERY_SLOW_TEST_TIMEOUT } from '../src/constants';

const logger = createLogger(path.resolve(`${process.cwd()}`, 'logs', 'tests', `fork_${new Date().toISOString()}.log`));

/**
 * How long the indexer is given to catch up with the chain after the fork applies. The chain is
 * already finalized past the applying block by the time `enactFork` returns, so this covers indexer
 * lag alone, not block production.
 */
const INDEXER_CATCHUP_TIMEOUT = 5 * 60_000;
const INDEXER_POLL_INTERVAL = 2_000;

/**
 * Polls the head reading until it resolves to `expected`, and answers with the raw protocol version
 * that got it there.
 *
 * Polling is the indexer catching up, not the assertion being retried until it passes: a head that
 * never reaches `expected` fails on the deadline, and the era is asserted once more by the caller.
 */
const waitForHeadVersion = async (
  provider: IndexerPublicDataProvider,
  expected: string,
  deadline: number
): Promise<number> => {
  for (;;) {
    const protocolVersion = await provider.queryLatestProtocolVersion();
    const era = await networkHeadVersion(provider);
    if (era === expected) {
      return protocolVersion;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Indexer never reported a '${expected}' head; it is still on '${era}' (protocolVersion ${protocolVersion})`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, INDEXER_POLL_INTERVAL));
  }
};

describe('Fork-crossing environment', () => {
  let testEnvironment: ForkTestEnvironment;
  let preForkConfiguration: EnvironmentConfiguration;
  let publicDataProvider: IndexerPublicDataProvider;

  beforeAll(async () => {
    testEnvironment = new ForkTestEnvironment(logger);
    preForkConfiguration = await testEnvironment.start();
    publicDataProvider = indexerPublicDataProvider({
      queryURL: preForkConfiguration.indexer,
      subscriptionURL: preForkConfiguration.indexerWS
    });
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    publicDataProvider?.dispose();
    await testEnvironment?.shutdown();
  }, VERY_SLOW_TEST_TIMEOUT);

  test(
    'reports a ledger-8 head before the fork and a ledger-9 head after it, through one unchanged provider',
    async () => {
      // Arrange: the chain starts on the runtime genesis carries, which is the pre-fork one.
      const beforeVersion = await publicDataProvider.queryLatestProtocolVersion();
      const beforeEra = await networkHeadVersion(publicDataProvider);
      expect(beforeEra).toBe('v8');

      // Act: enact the fork through governance, then let the indexer catch up.
      const enactment = await testEnvironment.enactFork();
      const afterVersion = await waitForHeadVersion(
        publicDataProvider,
        'v9',
        Date.now() + INDEXER_CATCHUP_TIMEOUT
      );

      // Assert: the same provider instance, never reconfigured, now dates the head in the new era.
      expect(await networkHeadVersion(publicDataProvider)).toBe('v9');
      expect(afterVersion).toBeGreaterThan(beforeVersion);
      expect(enactment.newSpecVersion).toBeGreaterThan(enactment.oldSpecVersion);
      expect(enactment.appliedAt).toBeGreaterThan(0);
      expect(testEnvironment.hasForked).toBe(true);
    },
    VERY_SLOW_TEST_TIMEOUT
  );

  test('serves one proof server per era and moves the reported endpoint across the boundary', () => {
    // Arrange / Act: both endpoints exist for the whole run; the reported one follows the chain.
    const preForkProofServer = testEnvironment.getPreForkProofServer();
    const postForkProofServer = testEnvironment.getPostForkProofServer();

    // Assert.
    expect(preForkProofServer).not.toBe(postForkProofServer);
    expect(preForkConfiguration.proofServer).toBe(preForkProofServer);
    expect(testEnvironment.getEnvironmentConfiguration().proofServer).toBe(postForkProofServer);
  });

  test('refuses a second enactment on a chain that has already forked', async () => {
    await expect(testEnvironment.enactFork()).rejects.toThrow('already been enacted');
  });
});
