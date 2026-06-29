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

import { type ContractEvent } from '@midnight-ntwrk/midnight-js-types';
import { createLogger } from '@midnight-ntwrk/testkit-js';
import path from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { VERY_SLOW_TEST_TIMEOUT } from '@/constants';
import * as api from '@/events-api';

import {
  assertBaseEvent,
  createIdMonotonicityCheck,
  deployEventsEnvironment,
  type EventsEnvironment,
  findEvent,
  NAME,
  NAME_HEX,
  PAYLOAD,
  PAYLOAD_HEX,
  teardownEventsEnvironment
} from './utils/events-test-utils';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts-events-core_${new Date().toISOString()}.log`)
);

/**
 * MIP-0002 contract events (spec §5.6) — the non-token event families (Misc and the Paused/Unpaused
 * lifecycle pair). Each circuit call lives in its own test (emission outside `beforeAll`) so a single
 * stalled proof fails only that test. Token events live in the sibling shielded/unshielded suites.
 *
 * The `PublicDataProvider` streaming surface (contractEventsObservable / getAllContractEvents) is NOT
 * exercised here: opening the events WebSocket prevents the Node process from exiting in CI even
 * after teardown leaves an empty event loop (#1001), hanging the shard to its job timeout. Streaming
 * stays covered by the provider package's own unit suites (events-provider, get-all-contract-events)
 * and the indexer-public-data-provider.observable1/2 e2e suites; re-enable here once #1001 is fixed.
 */
describe('Contract events — core (E2E)', () => {
  let env: EventsEnvironment;
  const checkId = createIdMonotonicityCheck();

  const query = (): Promise<ContractEvent[]> =>
    env.publicDataProvider.queryContractEvents({ contractAddress: env.contractAddress });

  beforeAll(async () => {
    env = await deployEventsEnvironment(logger);
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await teardownEventsEnvironment(env);
  });

  // SKIPPED: the Misc circuit is by far the heaviest proof in the suite (emitMisc.zkir is ~5x the
  // next largest). On under-provisioned CI runners its proof saturates the host and freezes the
  // node, proof-server and test worker together until the 30-min job timeout (observed in run
  // 28380102696, where the node stopped minting blocks the instant proving began). Re-enable once
  // the proof-server footprint is bounded (e.g. resource limits / NUM_WORKERS) or the runner is
  // resourced for it. Misc emission stays covered by the provider package unit suites.
  test.skip('emits a Misc event with the full structure and emitted values', async () => {
    await api.emitMisc(env.deployedContract, NAME, PAYLOAD);
    const event = findEvent(await query(), 'Misc');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'Misc') throw new Error('unreachable');
    expect(event.name).toBe(NAME_HEX);
    expect(event.payload).toBe(PAYLOAD_HEX);
  });

  test('emits Paused and Unpaused lifecycle events', async () => {
    await api.emitLifecycle(env.deployedContract);
    const events = await query();

    const paused = findEvent(events, 'Paused');
    assertBaseEvent(paused, env.contractAddress);
    checkId(paused);

    const unpaused = findEvent(events, 'Unpaused');
    assertBaseEvent(unpaused, env.contractAddress);
    checkId(unpaused);
  });
});
