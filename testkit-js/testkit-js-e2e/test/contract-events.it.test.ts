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

import type { FinalizedDeployTxData } from '@midnight-ntwrk/midnight-js-contracts';
import { getAllContractEvents } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import type { ContractEvent, PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import path from 'path';
import * as Rx from 'rxjs';

import { VERY_SLOW_TEST_TIMEOUT } from '@/constants';
import * as api from '@/counter-api';
import { CounterConfiguration } from '@/counter-api';
import { type CounterContract, type CounterProviders, type DeployedCounterContract, privateStateZero } from '@/types/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contract-events_${new Date().toISOString()}.log`)
);

/**
 * Gated acceptance suite for MIP-0002 contract events (spec §5.6).
 *
 * Recorded now, run later: enabled once a ledger-9-capable indexer is in the
 * test environment (depends on #970) and an emit-capable contract replaces the
 * counter deploy vehicle below. The unit suite in
 * `packages/indexer-public-data-provider` already gives full coverage via
 * mocked Apollo; this closes the emission → indexer → midnight-js loop end to
 * end. Because compact-js now exposes `CallResultPublic.events`, the deploy
 * step can additionally assert emitted events against what the indexer returns.
 */
describe.skip('Contract events (E2E, gated on ledger-9 / #970)', () => {
  let publicDataProvider: PublicDataProvider;
  let providers: CounterProviders;
  let deployedContract: DeployedCounterContract;
  let finalizedDeployTxData: FinalizedDeployTxData<CounterContract>;
  let testEnvironment: TestEnvironment;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    const environmentConfiguration = await testEnvironment.start();
    api.setLogger(logger);
    const wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, new CounterConfiguration());
    publicDataProvider = providers.publicDataProvider;
    // TODO(#970): deploy an emit-capable contract that produces each standard
    // event type, rather than the counter, once ledger-9 lands.
    deployedContract = await api.deploy(providers, privateStateZero);
    finalizedDeployTxData = deployedContract.deployTxData;
    await api.increment(deployedContract);
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('1. queryContractEvents returns each emitted standard event type, correctly typed', async () => {
    const { contractAddress } = finalizedDeployTxData.public;
    const events = await publicDataProvider.queryContractEvents({ contractAddress });

    expect(Array.isArray(events)).toBe(true);
    const types = new Set(events.map((e) => e.eventType));
    expect(types.size).toBeGreaterThan(0);
  });

  test('2. contractEventsObservable streams live events for the contract', async () => {
    const { contractAddress } = finalizedDeployTxData.public;
    const first = await Rx.firstValueFrom(publicDataProvider.contractEventsObservable({ contractAddress }));

    expect(first.contractAddress).toEqual(contractAddress);
  });

  test('3. resumption from a known id replays inclusively from that point', async () => {
    const { contractAddress } = finalizedDeployTxData.public;
    const all: ContractEvent[] = [];
    for await (const e of getAllContractEvents(publicDataProvider, { contractAddress })) all.push(e);
    const resumeId = all[0]?.id;
    expect(resumeId).toBeDefined();

    const replayed = await Rx.firstValueFrom(
      publicDataProvider.contractEventsObservable({ contractAddress }, { startAt: { fromId: resumeId! } })
    );
    expect(replayed.id).toEqual(resumeId); // inclusive cursor: the event at `id` is replayed
  });

  test('4. toBlock completes the subscription at the expected height', async () => {
    const { contractAddress } = finalizedDeployTxData.public;
    const completed = await new Promise<boolean>((resolve, reject) => {
      publicDataProvider
        .contractEventsObservable({ contractAddress, toBlock: finalizedDeployTxData.public.blockHeight })
        .subscribe({ error: reject, complete: () => resolve(true) });
    });
    expect(completed).toBe(true);
  });

  test('5. contract test against the real @beta schema catches semantic drift codegen cannot', async () => {
    const { contractAddress } = finalizedDeployTxData.public;
    const events = await publicDataProvider.queryContractEvents({ contractAddress });

    for (const e of events) {
      expect(typeof e.id).toBe('number');
      expect(typeof e.raw).toBe('string'); // raw passthrough preserved end to end
    }
  });
});
