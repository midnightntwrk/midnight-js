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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type ContractEvent, type ContractEventType, type PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { getTestEnvironment, initializeMidnightProviders, type TestEnvironment } from '@midnight-ntwrk/testkit-js';
import type { Logger } from 'pino';
import { expect } from 'vitest';

import * as api from '@/events-api';
import { EventsConfiguration } from '@/events-api';
import type { DeployedEventsContract } from '@/types/events-types';

export const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

export const encodeFixed = (text: string, length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  bytes.set(new TextEncoder().encode(text));
  return bytes;
};

// Shared emitted fixture values — the events contract circuits disclose exactly these.
export const NAME = encodeFixed('Greeting', 32);
export const PAYLOAD = encodeFixed('hello world', 256);
export const NULLIFIER = new Uint8Array(32).fill(7);
export const COMMITMENT = new Uint8Array(32).fill(9);
export const TOKEN_TYPE = new Uint8Array(32).fill(3);
export const AMOUNT = 1000n;

export const NAME_HEX = toHex(NAME);
export const PAYLOAD_HEX = toHex(PAYLOAD);
export const NULLIFIER_HEX = toHex(NULLIFIER);
export const COMMITMENT_HEX = toHex(COMMITMENT);
export const TOKEN_TYPE_HEX = toHex(TOKEN_TYPE);
export const ZERO32_HEX = toHex(new Uint8Array(32));
export const ZSWAP_KEY_HEX = ZERO32_HEX;

export const findEvent = (events: ContractEvent[], eventType: ContractEventType): ContractEvent => {
  const event = events.find((e) => e.eventType === eventType);
  if (!event) throw new Error(`event ${eventType} not found`);
  return event;
};

export const assertBaseEvent = (event: ContractEvent, contractAddress: ContractEvent['contractAddress']): void => {
  expect(typeof event.id).toBe('number');
  expect(typeof event.maxId).toBe('number');
  expect(event.version).toBe(1);
  expect(event.contractAddress).toBe(contractAddress);
  expect(typeof event.transactionId).toBe('number');
  expect(typeof event.raw).toBe('string');
  expect(event.raw.length).toBeGreaterThan(0);
};

/**
 * Returns a checker that asserts each event surfaces with a strictly increasing `id`, i.e. in
 * emission order. Tests within a file run sequentially, so calling the checker in the order events
 * were emitted verifies the provider preserves emission order without a global ordering snapshot.
 */
export const createIdMonotonicityCheck = (): ((event: ContractEvent) => void) => {
  let prevId = Number.NEGATIVE_INFINITY;
  return (event: ContractEvent): void => {
    expect(event.id).toBeGreaterThan(prevId);
    prevId = event.id;
  };
};

export interface EventsEnvironment {
  testEnvironment: TestEnvironment;
  publicDataProvider: PublicDataProvider;
  deployedContract: DeployedEventsContract;
  contractAddress: ContractAddress;
}

/** Starts a test environment and deploys a fresh events contract. Shared by the per-family suites. */
export const deployEventsEnvironment = async (logger: Logger): Promise<EventsEnvironment> => {
  const testEnvironment = getTestEnvironment(logger);
  const environmentConfiguration = await testEnvironment.start();
  api.setLogger(logger);
  const wallet = await testEnvironment.getMidnightWalletProvider();
  const providers = initializeMidnightProviders(wallet, environmentConfiguration, new EventsConfiguration());
  const deployedContract = await api.deploy(providers);
  return {
    testEnvironment,
    publicDataProvider: providers.publicDataProvider,
    deployedContract,
    contractAddress: deployedContract.deployTxData.public.contractAddress
  };
};

/** Stops the test environment (and its containers). Shared by the per-family suites. */
export const teardownEventsEnvironment = async (env: EventsEnvironment): Promise<void> => {
  await env.testEnvironment.shutdown();
};
