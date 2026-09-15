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

import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { UntaggedPayloadError, V8PayloadUnsupportedError } from '../errors';
import { unwrapV9 } from '../unwrap-v9';
import type { VersionedTx } from '../versioned';

// Covered directly rather than through the `create*Provider` adapters. Those
// route through `narrowToEraArm` now, so exercising `unwrapV9` only through
// them would leave this published helper — the narrowing every v9-only
// consumer and third-party provider is told to use — with no test of its own.

const caught = (payload: unknown): unknown => {
  try {
    unwrapV9(payload as VersionedTx<string>, 'proveTx');
  } catch (error) {
    return error;
  }
  throw new Error('unwrapV9 accepted a payload it should have refused');
};

describe('unwrapV9', () => {
  it('returns the carried ledger object for the v9 arm', () => {
    expect(unwrapV9({ version: 'v9', tx: 'the-transaction' }, 'proveTx')).toBe('the-transaction');
  });

  it('refuses the v8 arm with the registered code, naming the seam and the payload size', () => {
    const refusal = caught({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) });

    expect(refusal).toBeInstanceOf(V8PayloadUnsupportedError);
    expect(hasErrorCode(refusal, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    expect((refusal as V8PayloadUnsupportedError).seam).toBe('proveTx');
    expect((refusal as V8PayloadUnsupportedError).byteLength).toBe(3);
  });

  // Reachable only from JavaScript or across an untyped boundary, which is
  // exactly the caller that most needs the size reported honestly rather than
  // silently omitted.
  it('reports an unknown size when the v8 arm carries no byte array', () => {
    expect((caught({ version: 'v8', txBytes: 'not-bytes' }) as V8PayloadUnsupportedError).byteLength).toBeUndefined();
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
