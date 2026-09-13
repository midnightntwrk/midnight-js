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

import {
  type IndexerPublicDataProvider,
  indexerPublicDataProvider
} from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol';
import { createLogger, delay, type EnvironmentConfiguration, ForkTestEnvironment } from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { MINUTE } from '../src/constants';

const logger = createLogger(path.resolve(`${process.cwd()}`, 'logs', 'tests', `fork_${new Date().toISOString()}.log`));

/**
 * How long the indexer is given to catch up with the chain after the fork applies. The chain is
 * already finalized past the applying block by the time `enactFork` returns, so this covers indexer
 * lag alone, not block production.
 */
const INDEXER_CATCHUP_TIMEOUT = 2 * MINUTE;
const INDEXER_POLL_INTERVAL = 2_000;

/**
 * Timeouts for the crossing test and for bringing the stack up.
 *
 * `enactFork`'s own deadlines sum to 12 minutes, and the indexer catch-up adds two more, so the
 * crossing test is given 18: an inner deadline has to be the thing that fires, because those are
 * the ones that name what went wrong. A bare `Test timed out` discards all of them.
 */
const FORK_CROSSING_TIMEOUT = 18 * MINUTE;
/** Comfortably above the stack's own per-service startup budget, since this lane also pulls six uncached images. */
const FORK_STARTUP_TIMEOUT = 20 * MINUTE;
const FAST_ASSERTION_TIMEOUT = 1 * MINUTE;

/**
 * Polls the head until it dates in `expected`, and answers with the protocol version that put it
 * there.
 *
 * One read per iteration, and the era is derived from that same integer: reading the version and the
 * era through separate queries would let the head move between them and report a pre-fork number
 * against a post-fork era. A failed read is retried until the deadline rather than ending the wait,
 * because an indexer that has not yet indexed a block answers with an error before it answers with a
 * version -- and that is precisely the condition being waited out.
 */
const waitForHeadVersion = async (
  provider: IndexerPublicDataProvider,
  expected: string,
  deadline: number
): Promise<number> => {
  let lastError: unknown;
  let lastEra: string | undefined;
  let lastProtocolVersion: number | undefined;
  for (;;) {
    try {
      lastProtocolVersion = await provider.queryLatestProtocolVersion();
      lastEra = protocolVersionToLedger(lastProtocolVersion);
      lastError = undefined;
      if (lastEra === expected) {
        return lastProtocolVersion;
      }
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Indexer never reported a '${expected}' head; it is still on '${lastEra ?? 'an unreadable version'}' ` +
          `(protocolVersion ${lastProtocolVersion === undefined ? 'unread' : lastProtocolVersion})`,
        { cause: lastError }
      );
    }
    await delay(INDEXER_POLL_INTERVAL);
  }
};

/** Asks a proof server for its version, so "the endpoint is up" means it answered rather than that a socket is open. */
const proofServerVersion = async (baseUrl: string): Promise<string> => {
  const response = await fetch(`${baseUrl}/version`);
  if (!response.ok) {
    throw new Error(`${baseUrl}/version -> HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
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
  }, FORK_STARTUP_TIMEOUT);

  afterAll(async () => {
    // Awaited, and in a `finally`: an unawaited dispose becomes an unhandled rejection whose owner
    // is unclear, and the stack has to come down even when the provider fails to close.
    try {
      await publicDataProvider?.dispose();
    } finally {
      await testEnvironment?.shutdown();
    }
  }, FORK_STARTUP_TIMEOUT);

  test(
    'reports a ledger-8 head before the fork and a ledger-9 head after it, through one unchanged provider',
    async () => {
      // Arrange: the chain starts on the runtime genesis carries, which is the pre-fork one.
      const beforeVersion = await publicDataProvider.queryLatestProtocolVersion();
      expect(protocolVersionToLedger(beforeVersion)).toBe('v8');
      expect(testEnvironment.hasForked).toBe(false);
      expect(testEnvironment.getEnvironmentConfiguration().proofServer).toBe(testEnvironment.getPreForkProofServer());

      // Act: enact the fork through governance, then let the indexer catch up.
      const enactment = await testEnvironment.enactFork();
      const afterVersion = await waitForHeadVersion(publicDataProvider, 'v9', Date.now() + INDEXER_CATCHUP_TIMEOUT);

      // Assert: the same provider instance, never reconfigured, now dates the head in the new era.
      expect(protocolVersionToLedger(afterVersion)).toBe('v9');
      expect(afterVersion).toBeGreaterThan(beforeVersion);
      // Read back from the node, which is a source independent of both the wait above and the
      // record `enactFork` returned -- otherwise every assertion here restates that record.
      expect(await testEnvironment.specVersionAtFinalizedHead()).toBe(enactment.newSpecVersion);
      expect(enactment.newSpecVersion).toBeGreaterThan(enactment.oldSpecVersion);
      expect(enactment.appliedAtBlockHeight).toBeGreaterThan(0);
      // The reported endpoint moved with the chain. Asserted here, either side of the one call that
      // crosses the boundary, rather than in a later test that would depend on this one having run.
      expect(testEnvironment.hasForked).toBe(true);
      expect(testEnvironment.getEnvironmentConfiguration().proofServer).toBe(testEnvironment.getPostForkProofServer());
    },
    FORK_CROSSING_TIMEOUT
  );

  test(
    'serves a reachable proof server on each side of the boundary',
    async () => {
      // Arrange: both endpoints exist for the whole run, one per era.
      const preForkProofServer = testEnvironment.getPreForkProofServer();
      const postForkProofServer = testEnvironment.getPostForkProofServer();

      // Act / Assert: each answers for itself, so a mispointed image tag fails here.
      expect(preForkProofServer).not.toBe(postForkProofServer);
      await expect(proofServerVersion(preForkProofServer)).resolves.toMatch(/\S/);
      await expect(proofServerVersion(postForkProofServer)).resolves.toMatch(/\S/);
    },
    FAST_ASSERTION_TIMEOUT
  );

  test(
    'refuses a second enactment on a chain that has already forked',
    async () => {
      // A precondition, not decoration: if the crossing above failed, the guard under test would not
      // be armed and calling enactFork() here would drive a real second governance upgrade.
      expect(testEnvironment.hasForked).toBe(true);

      await expect(testEnvironment.enactFork()).rejects.toThrow('already been enacted');
    },
    FAST_ASSERTION_TIMEOUT
  );
});
