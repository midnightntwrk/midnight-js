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

import * as onchainRuntimeV3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
// The `-alt` packages are npm aliases of the same versions resolved under a
// different package name, so Node gives each its own physical module
// instance — real second copies, not test doubles, of the exact dual-WASM
// failure mode these guards exist to catch.
import * as ledgerV9Alt from 'ledger-v9-alt';
import * as onchainRuntimeV3Alt from 'onchain-runtime-v3-alt';
import { describe, expect, it } from 'vitest';

import { assertLedger8RuntimePresent, assertSharedLedger8Instances } from '../engine/instance-guard';
import { Ledger8InstanceMismatchError, Ledger8RuntimeMissingError, PROTOCOL_ERROR_CODES } from '../errors';

describe('assertSharedLedger8Instances', () => {
  it('does not throw when the same physical module instance is passed on both axes', () => {
    expect(() =>
      assertSharedLedger8Instances(onchainRuntimeV3, onchainRuntimeV3, ledgerV9, ledgerV9)
    ).not.toThrow();
  });

  it('throws Ledger8InstanceMismatchError naming the onchain-runtime-v3 axis when the 0.16 runtime is a second physical copy', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(onchainRuntimeV3, onchainRuntimeV3Alt, ledgerV9, ledgerV9);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
    expect(error.axis).toBe('onchain-runtime-v3');
  });

  it('throws Ledger8InstanceMismatchError naming the ledger-v9 axis when the 0.16 runtime matches but ledger-v9 is a second physical copy', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(onchainRuntimeV3, onchainRuntimeV3, ledgerV9, ledgerV9Alt);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
    expect(error.axis).toBe('ledger-v9');
  });

  it('throws naming the onchain-runtime-v3 axis when both sides of that axis are undefined (nullish probes are not a proof of a shared instance)', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(undefined, undefined, ledgerV9, ledgerV9);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.axis).toBe('onchain-runtime-v3');
  });

  it('throws naming the onchain-runtime-v3 axis when both sides of that axis are null', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(null, null, ledgerV9, ledgerV9);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.axis).toBe('onchain-runtime-v3');
  });

  it('throws naming the onchain-runtime-v3 axis when only one side of that axis is nullish', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(onchainRuntimeV3, undefined, ledgerV9, ledgerV9);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.axis).toBe('onchain-runtime-v3');
  });

  it('throws naming the ledger-v9 axis when both sides of that axis are undefined and the onchain-runtime-v3 axis matches', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(onchainRuntimeV3, onchainRuntimeV3, undefined, undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.axis).toBe('ledger-v9');
  });

  it('throws naming the ledger-v9 axis when only one side of that axis is nullish and the onchain-runtime-v3 axis matches', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(onchainRuntimeV3, onchainRuntimeV3, ledgerV9, null);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.axis).toBe('ledger-v9');
  });

  it('throws naming the onchain-runtime-v3 axis when every probe is undefined (all-nullish input)', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instances(undefined, undefined, undefined, undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.axis).toBe('onchain-runtime-v3');
  });
});

describe('assertLedger8RuntimePresent', () => {
  it('resolves without throwing when the injected loader succeeds', async () => {
    await expect(assertLedger8RuntimePresent(() => Promise.resolve({}))).resolves.toBeUndefined();
  });

  it('wraps an unresolvable retained runtime in Ledger8RuntimeMissingError naming the pinned versions, never the raw resolution error', async () => {
    const rawError = new Error('Cannot find module "@midnightntwrk/ledger-v8" ERR_MODULE_NOT_FOUND');
    let caught: unknown;

    try {
      await assertLedger8RuntimePresent(() => Promise.reject(rawError));
      throw new Error('expected assertLedger8RuntimePresent to reject');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8RuntimeMissingError);
    const error = caught as Ledger8RuntimeMissingError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING);
    expect(error.cause).toBe(rawError);
    expect(error.message).toContain('8.1.1');
    expect(error.message).toContain('3.1.0');
    expect(error.message).toContain('0.16.0');
    expect(error.message).not.toContain('ERR_MODULE_NOT_FOUND');
  });

  it('does not double-wrap when the injected loader already rejects with Ledger8RuntimeMissingError', async () => {
    const alreadyWrapped = new Ledger8RuntimeMissingError(new Error('inner resolution failure'));
    let caught: unknown;

    try {
      await assertLedger8RuntimePresent(() => Promise.reject(alreadyWrapped));
      throw new Error('expected assertLedger8RuntimePresent to reject');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(alreadyWrapped);
  });

  it('defaults to the real v8 runtime loader and never surfaces a raw error when no loader is injected', async () => {
    await assertLedger8RuntimePresent().then(
      (value) => expect(value).toBeUndefined(),
      (error: unknown) => expect(error).toBeInstanceOf(Ledger8RuntimeMissingError)
    );
  });
});
