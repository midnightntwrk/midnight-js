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
  COMMITMENT,
  COMMITMENT_HEX,
  createIdMonotonicityCheck,
  deployEventsEnvironment,
  type EventsEnvironment,
  findEvent,
  NULLIFIER,
  NULLIFIER_HEX,
  teardownEventsEnvironment,
  ZERO32_HEX
} from './utils/events-test-utils';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts-events-shielded_${new Date().toISOString()}.log`)
);

/**
 * MIP-0002 Shielded* contract events — each variant is emitted by its own single-event circuit in
 * its own test, so a stalled proof fails only that test.
 */
describe('Contract events — Shielded* (E2E)', () => {
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

  test('emits a ShieldedSpend event with the nullifier', async () => {
    await api.emitShieldedSpend(env.deployedContract, NULLIFIER);
    const event = findEvent(await query(), 'ShieldedSpend');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'ShieldedSpend') throw new Error('unreachable');
    expect(event.nullifier).toBe(NULLIFIER_HEX);
  });

  test('emits a ShieldedReceive event with the commitment and absent optional fields', async () => {
    await api.emitShieldedReceive(env.deployedContract, COMMITMENT);
    const event = findEvent(await query(), 'ShieldedReceive');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'ShieldedReceive') throw new Error('unreachable');
    expect(event.commitment).toBe(COMMITMENT_HEX);
    expect(event.ciphertext).toBeUndefined();
    expect(event.receivingContractAddress).toBeUndefined();
  });

  test('emits a ShieldedMint event with the commitment, domain separator and amount', async () => {
    await api.emitShieldedMint(env.deployedContract, COMMITMENT);
    const event = findEvent(await query(), 'ShieldedMint');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'ShieldedMint') throw new Error('unreachable');
    expect(event.commitment).toBe(COMMITMENT_HEX);
    expect(event.domainSep).toBe(ZERO32_HEX);
    expect(event.amount).toBe('1');
  });

  test('emits a ShieldedBurn event with the nullifier and amount', async () => {
    await api.emitShieldedBurn(env.deployedContract, NULLIFIER);
    const event = findEvent(await query(), 'ShieldedBurn');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'ShieldedBurn') throw new Error('unreachable');
    expect(event.nullifier).toBe(NULLIFIER_HEX);
    expect(event.amount).toBe('1');
  });
});
