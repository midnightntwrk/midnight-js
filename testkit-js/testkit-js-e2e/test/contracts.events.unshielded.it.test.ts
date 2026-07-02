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
  AMOUNT,
  assertBaseEvent,
  createIdMonotonicityCheck,
  deployEventsEnvironment,
  type EventsEnvironment,
  findEvent,
  teardownEventsEnvironment,
  TOKEN_TYPE,
  TOKEN_TYPE_HEX,
  ZERO32_HEX,
  ZSWAP_KEY_HEX
} from './utils/events-test-utils';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts-events-unshielded_${new Date().toISOString()}.log`)
);

/**
 * MIP-0002 Unshielded* contract events — each variant emitted by its own single-event circuit in its
 * own test. Requires events indexer >= pre-alpha.13, which fixed the Either-address `kind` decode
 * (midnightntwrk/midnight-indexer#1279: a left<ZswapCoinPublicKey, ContractAddress> address is 65
 * bytes on the wire, previously truncated to 33 — which had surfaced kind as 'contract').
 *
 * Mint and Burn pass under pre-alpha.13. Spend and Receive remain `test.skip`: their
 * sender/recipient `kind` is now correct ('user') but the `value` still decodes as an empty string
 * instead of the emitted key bytes, even though Burn decodes the same left<...> address correctly —
 * a residual indexer decode bug (midnightntwrk/midnight-indexer#1279).
 */
describe('Contract events — Unshielded* (E2E)', () => {
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

  test.skip('emits an UnshieldedSpend event with sender, token type and amount', async () => {
    await api.emitUnshieldedSpend(env.deployedContract, TOKEN_TYPE, AMOUNT);
    const event = findEvent(await query(), 'UnshieldedSpend');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'UnshieldedSpend') throw new Error('unreachable');
    expect(event.sender).toEqual({ kind: 'user', value: ZSWAP_KEY_HEX });
    expect(event.domainSep).toBe(ZERO32_HEX);
    expect(event.tokenType).toBe(TOKEN_TYPE_HEX);
    expect(event.amount).toBe('1000');
  });

  test.skip('emits an UnshieldedReceive event with recipient, token type and amount', async () => {
    await api.emitUnshieldedReceive(env.deployedContract, TOKEN_TYPE, AMOUNT);
    const event = findEvent(await query(), 'UnshieldedReceive');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'UnshieldedReceive') throw new Error('unreachable');
    expect(event.recipient).toEqual({ kind: 'user', value: ZSWAP_KEY_HEX });
    expect(event.domainSep).toBe(ZERO32_HEX);
    expect(event.tokenType).toBe(TOKEN_TYPE_HEX);
    expect(event.amount).toBe('1000');
  });

  test('emits an UnshieldedMint event with domain separator, token type and amount', async () => {
    await api.emitUnshieldedMint(env.deployedContract, TOKEN_TYPE, AMOUNT);
    const event = findEvent(await query(), 'UnshieldedMint');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'UnshieldedMint') throw new Error('unreachable');
    expect(event.domainSep).toBe(ZERO32_HEX);
    expect(event.tokenType).toBe(TOKEN_TYPE_HEX);
    expect(event.amount).toBe('1000');
  });

  test('emits an UnshieldedBurn event with sender, token type and amount', async () => {
    await api.emitUnshieldedBurn(env.deployedContract, TOKEN_TYPE, AMOUNT);
    const event = findEvent(await query(), 'UnshieldedBurn');
    assertBaseEvent(event, env.contractAddress);
    checkId(event);
    if (event.eventType !== 'UnshieldedBurn') throw new Error('unreachable');
    expect(event.sender).toEqual({ kind: 'user', value: ZSWAP_KEY_HEX });
    expect(event.tokenType).toBe(TOKEN_TYPE_HEX);
    expect(event.amount).toBe('1000');
  });
});
