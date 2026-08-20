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

import type { Ledger8CompactRuntime } from '../engine/down-convert';
import { downConvertForExecution } from '../engine/down-convert';
import { assertSharedLedger8Instance } from '../engine/instance-guard';
import { Ledger8InstanceMismatchError, PROTOCOL_ERROR_CODES } from '../errors';

const FIELD_ALIGNMENT: onchainRuntimeV3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const cell = (byte: number): onchainRuntimeV3.StateValue =>
  onchainRuntimeV3.StateValue.newCell({ value: [new Uint8Array(32).fill(byte)], alignment: FIELD_ALIGNMENT });

describe('assertSharedLedger8Instance', () => {
  it('does not throw when two independent acquisitions resolve to the same physical copy', async () => {
    // Deliberately not `(axis, x, x)`: comparing a binding with itself is
    // `x === x` and asserts nothing. A static import and a dynamic import of
    // the same specifier are two separate acquisitions that Node resolves to
    // one module record — the condition the guard is supposed to accept.
    const viaDynamicImport = await import('@midnight-ntwrk/onchain-runtime-v3');

    expect(() => assertSharedLedger8Instance('onchain-runtime-v3', onchainRuntimeV3, viaDynamicImport)).not.toThrow();
  });

  it('throws Ledger8InstanceMismatchError naming the axis when the probes come from two physical copies', () => {
    try {
      assertSharedLedger8Instance('onchain-runtime-v3', onchainRuntimeV3, onchainRuntimeV3Alt);
      expect.unreachable('two physical copies must be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(Ledger8InstanceMismatchError);
      expect(error).toMatchObject({
        code: PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH,
        axis: 'onchain-runtime-v3'
      });
    }
  });

  it('names the npm package, not the axis label, in the remediation hint', () => {
    try {
      assertSharedLedger8Instance('onchain-runtime-v3', onchainRuntimeV3, onchainRuntimeV3Alt);
      expect.unreachable('two physical copies must be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(Ledger8InstanceMismatchError);
      expect((error as Ledger8InstanceMismatchError).message).toContain(
        'yarn why @midnight-ntwrk/onchain-runtime-v3'
      );
    }
  });

  it.each([
    { name: 'both probes undefined', a: undefined, b: undefined },
    { name: 'both probes null', a: null, b: null },
    { name: 'only one probe nullish', a: onchainRuntimeV3, b: undefined }
  ])('throws when $name (nullish probes are not a proof of a shared instance)', ({ a, b }) => {
    try {
      assertSharedLedger8Instance('onchain-runtime-v3', a, b);
      expect.unreachable('nullish probes must be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(Ledger8InstanceMismatchError);
      expect(error).toMatchObject({ axis: 'onchain-runtime-v3' });
    }
  });
});

describe('a dual-instantiation reaching the down-convert', () => {
  // Establishes what the guard is guarding against, using two genuinely
  // distinct physical copies. wasm-bindgen rejects the foreign StateValue when
  // ChargedState is constructed; downConvertForExecution must surface that as
  // a coded error rather than letting a bare WASM TypeError escape a seam
  // whose contract is code-based discrimination.
  it('fails with a coded DownConvertFailedError rather than corrupt data', () => {
    const mixedRuntime: Ledger8CompactRuntime = {
      StateValue: onchainRuntimeV3.StateValue,
      ChargedState: onchainRuntimeV3Alt.ChargedState
    };

    expect(() => downConvertForExecution(cell(0x11).encode(), mixedRuntime)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });
});
