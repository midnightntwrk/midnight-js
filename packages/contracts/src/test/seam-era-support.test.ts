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

import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import {
  type AnyProvableCircuitId,
  SeamEraUnsupportedError,
  V8PayloadUnsupportedError
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { acquireLedger8Runtime, type Ledger8RuntimeProviders } from '../internal/ledger8-entry';
import { submitTx, type SubmitTxOptions } from '../submit-tx';
import { createMockProviders, createMockUnprovenTx } from './test-mocks';

// Only the retained ENGINE acquisition is replaced, exactly as `breadcrumbs.test.ts`
// does it: nothing here executes a circuit, and the real `loadLedgerEra` keeps
// every era name on the genuine timeline.
const ENGINE_STAND_IN = vi.hoisted((): Record<string, never> => ({}));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof Protocol>();
  return { ...actual, loadLedger8Engine: (): Promise<unknown> => Promise.resolve(ENGINE_STAND_IN) };
});

// The era timeline's own scheme. A pre-fork head puts the retained pipeline on
// the retained seam arm; a post-fork head is keep-state, which composes on the
// CURRENT era and therefore crosses the seams on the current arm.
const V8_HEAD = 1_000_000;
const V9_HEAD = 2_000_000;

const BOTH_ERAS: readonly LedgerVersion[] = ['v8', 'v9'];

type MockProviders = ReturnType<typeof createMockProviders>;

const declaring = (eras: readonly LedgerVersion[]) => ({ supportedEras: Object.freeze([...eras]) });

/**
 * Exactly what acquisition consults, built by hand rather than cast down from
 * the full mock set: the narrow parameter type is what lets this be written
 * without a cast, and spelling it out is what shows the check reads nothing
 * else.
 *
 * The proving spy is handed back separately because that narrow type does not
 * name `proveTx` — which is the point being made, so it is not worked around by
 * widening the parameter.
 */
const retainedSetup = (
  overrides: Partial<Ledger8RuntimeProviders> = {},
  head: number = V8_HEAD
): { readonly providers: Ledger8RuntimeProviders; readonly proveTx: Mock } => {
  const proveTx: Mock = vi.fn();
  const proofProvider = { ...declaring(BOTH_ERAS), proveTx };
  const providers: Ledger8RuntimeProviders = {
    publicDataProvider: { queryLatestProtocolVersion: vi.fn().mockResolvedValue(head) },
    proofProvider,
    walletProvider: declaring(BOTH_ERAS),
    midnightProvider: declaring(BOTH_ERAS),
    ...overrides
  };
  return { providers, proveTx };
};

describe('a retained-era operation checks the write seams before it pays for a proof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses when the wallet serves only the current era, and never asks for a proof', async () => {
    const { providers, proveTx } = retainedSetup({ walletProvider: declaring(['v9']) });

    const refusal = await acquireLedger8Runtime(providers, 'call').then(
      () => undefined,
      (error: unknown) => error
    );

    expect(refusal).toBeInstanceOf(SeamEraUnsupportedError);
    expect((refusal as SeamEraUnsupportedError).seam).toBe('balanceTx');
    // The HEAD era, which is what picks the seam arm: on a pre-fork head the
    // payloads cross as retained-era bytes.
    expect((refusal as SeamEraUnsupportedError).era).toBe('v8');
    // The whole point of moving the check to the front of the operation: a
    // proof is the expensive step, and a wallet that cannot balance the result
    // makes paying for one pure waste.
    expect(proveTx).not.toHaveBeenCalled();
  });

  it('refuses when the submitter serves only the current era', async () => {
    const { providers } = retainedSetup({ midnightProvider: declaring(['v9']) });

    const refusal = await acquireLedger8Runtime(providers, 'call').then(
      () => undefined,
      (error: unknown) => error
    );

    expect(hasErrorCode(refusal, PROVIDER_ERROR_CODES.SEAM_ERA_UNSUPPORTED)).toBe(true);
    expect((refusal as SeamEraUnsupportedError).seam).toBe('submitTx');
  });

  // The check must be invisible to a provider set that can do the work — a gate
  // that refuses correct configurations is worse than no gate.
  it('lets a set that serves both eras through', async () => {
    const runtime = await acquireLedger8Runtime(retainedSetup().providers, 'call');

    expect(runtime.resolved.head).toBe('v8');
  });

  // The case that makes the era checked a variable rather than the constant
  // 'v8'. Keep-state runs a RETAINED-era artifact against a POST-FORK head, and
  // composes on the current era -- so its payloads cross the seams as
  // `{ version: 'v9', tx }`. A wallet that serves only the current era is the
  // ordinary post-fork wallet, and refusing it here would refuse exactly the
  // operations keep-state exists to allow.
  it('admits keep-state on a post-fork head with seams that serve only the current era', async () => {
    const currentOnly = declaring(['v9']);
    const { providers } = retainedSetup(
      { walletProvider: currentOnly, midnightProvider: currentOnly },
      V9_HEAD
    );

    const runtime = await acquireLedger8Runtime(providers, 'call');

    expect(runtime.resolved.head).toBe('v9');
  });

  it('refuses keep-state when a seam serves neither the head era nor anything else', async () => {
    const { providers } = retainedSetup({ walletProvider: declaring(['v8']) }, V9_HEAD);

    const refusal = await acquireLedger8Runtime(providers, 'call').then(
      () => undefined,
      (error: unknown) => error
    );

    expect((refusal as SeamEraUnsupportedError).era).toBe('v9');
    expect((refusal as SeamEraUnsupportedError).seam).toBe('balanceTx');
  });
});

describe('a current-era submission checks the write seams at its entry', () => {
  let providers: MockProviders;

  beforeEach(() => {
    vi.clearAllMocks();
    providers = createMockProviders();
  });

  const options: SubmitTxOptions<AnyProvableCircuitId> = { unprovenTx: createMockUnprovenTx() };

  const withProofEras = (eras: readonly LedgerVersion[]): MockProviders => ({
    ...providers,
    proofProvider: { ...providers.proofProvider, ...declaring(eras) }
  });

  it('refuses a proof provider that does not serve the current era, and never asks for a proof', async () => {
    const gapped = withProofEras(['v8']);

    const refusal = await submitTx(gapped, options).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(refusal).toBeInstanceOf(SeamEraUnsupportedError);
    expect((refusal as SeamEraUnsupportedError).seam).toBe('proveTx');
    expect((refusal as SeamEraUnsupportedError).era).toBe('v9');
    expect(gapped.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  // Defence in depth: the declaration is a claim by the implementation, and the
  // narrowing at each seam is what actually enforces the arm. A provider that
  // declares an era it does not serve must still fail the way it failed before
  // this check existed, not silently succeed.
  it('does not weaken the runtime narrowing when a provider declares an era it cannot serve', async () => {
    const lying = withProofEras(BOTH_ERAS);
    lying.proofProvider.proveTx = vi.fn().mockRejectedValue(new V8PayloadUnsupportedError('proveTx', 3));

    const rejection = await submitTx(lying, options).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
    expect(lying.proofProvider.proveTx).toHaveBeenCalled();
  });
});
