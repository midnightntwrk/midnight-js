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

import { describe, expect, it } from 'vitest';

import { Ledger8PayloadUnsupportedError,PROVIDER_ERROR_CODES, UntaggedPayloadError } from '../errors';
import { unwrapLedger9 } from '../unwrap-ledger9';
import type { VersionedTransaction } from '../versioned';

// Covered directly rather than through the `create*Provider` adapters. Those
// route through `narrowToEra` now, so exercising `unwrapLedger9` only through
// them would leave this published helper — the narrowing every v9-only
// consumer and third-party provider is told to use — with no test of its own.

const caught = (payload: unknown): unknown => {
  try {
    unwrapLedger9(payload as VersionedTransaction<string>, 'proveTx');
  } catch (error) {
    return error;
  }
  throw new Error('unwrapLedger9 accepted a payload it should have refused');
};

describe('unwrapLedger9', () => {
  it('returns the carried ledger object for the v9 variant', () => {
    expect(unwrapLedger9({ version: 'v9', tx: 'the-transaction' }, 'proveTx')).toBe('the-transaction');
  });

  it('refuses the v8 variant with its stable code, naming the method and the payload size', () => {
    const refusal = caught({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) });

    expect(refusal).toBeInstanceOf(Ledger8PayloadUnsupportedError);
    expect((refusal as Ledger8PayloadUnsupportedError).code).toBe(PROVIDER_ERROR_CODES.LEDGER8_PAYLOAD_UNSUPPORTED);
    expect((refusal as Ledger8PayloadUnsupportedError).method).toBe('proveTx');
    expect((refusal as Ledger8PayloadUnsupportedError).byteLength).toBe(3);
  });

  // Reachable only from JavaScript or across an untyped boundary, which is
  // exactly the caller that most needs the size reported honestly rather than
  // silently omitted.
  it('reports an unknown size when the v8 variant carries no byte array', () => {
    expect((caught({ version: 'v8', txBytes: 'not-bytes' }) as Ledger8PayloadUnsupportedError).byteLength).toBeUndefined();
  });

  it('refuses an untagged payload — the shape a pre-5.0.0 caller passes', () => {
    const refusal = caught({ tx: 'untagged' });

    expect(refusal).toBeInstanceOf(UntaggedPayloadError);
    expect((refusal as UntaggedPayloadError).received).toBe('no version field');
  });

  it('refuses a payload with an unrecognised era rather than reading it', () => {
    expect((caught({ version: 'v7', tx: 'from-the-future' }) as UntaggedPayloadError).received).toBe("'v7'");
  });

  // Guarded before the property access, so this reports the same coded error
  // as a bad tag instead of a bare TypeError three frames away.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a primitive', 42]
  ])('refuses %s without throwing a bare TypeError', (_label, payload) => {
    expect(caught(payload)).toBeInstanceOf(UntaggedPayloadError);
  });
});
