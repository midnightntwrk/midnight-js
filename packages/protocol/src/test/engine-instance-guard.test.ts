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

import { assertSharedLedger8Instances } from '../engine/instance-guard';
import { Ledger8InstanceMismatchError, PROTOCOL_ERROR_CODES } from '../errors';

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
