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
// The `-alt` package is an npm alias of the same version resolved under a
// different package name, so Node gives it its own physical module
// instance — a real second copy, not a test double, of the exact dual-WASM
// failure mode this guard exists to catch.
import * as onchainRuntimeV3Alt from 'onchain-runtime-v3-alt';
import { describe, expect, it } from 'vitest';

import { assertSharedLedger8Instance } from '../engine/instance-guard';
import { Ledger8InstanceMismatchError, PROTOCOL_ERROR_CODES } from '../errors';

describe('assertSharedLedger8Instance', () => {
  it('does not throw when both probes reference the same physical module instance', () => {
    expect(() => assertSharedLedger8Instance('onchain-runtime-v3', onchainRuntimeV3, onchainRuntimeV3)).not.toThrow();
  });

  it('throws Ledger8InstanceMismatchError naming the axis when the probes come from two physical copies', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instance('onchain-runtime-v3', onchainRuntimeV3, onchainRuntimeV3Alt);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    const error = caught as Ledger8InstanceMismatchError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
    expect(error.axis).toBe('onchain-runtime-v3');
  });

  it('throws when both probes are undefined (nullish probes are not a proof of a shared instance)', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instance('onchain-runtime-v3', undefined, undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    expect((caught as Ledger8InstanceMismatchError).axis).toBe('onchain-runtime-v3');
  });

  it('throws when both probes are null', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instance('onchain-runtime-v3', null, null);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    expect((caught as Ledger8InstanceMismatchError).axis).toBe('onchain-runtime-v3');
  });

  it('throws when only one probe is nullish', () => {
    let caught: unknown;
    try {
      assertSharedLedger8Instance('onchain-runtime-v3', onchainRuntimeV3, undefined);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8InstanceMismatchError);
    expect((caught as Ledger8InstanceMismatchError).axis).toBe('onchain-runtime-v3');
  });
});
