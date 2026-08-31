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

import { type ProviderSeam, UntaggedPayloadError, V8PayloadUnsupportedError } from './errors';
import type { VersionedTx } from './versioned';

/**
 * Narrows a version-tagged transaction payload to its live v9 ledger object,
 * throwing if it carries any other era.
 *
 * Use this at the top of a provider that implements only the v9 era, and in
 * consumer code that only ever sends v9 payloads. It is the narrowing the seam
 * types require, written once. The alternative — an ad-hoc
 * `if (payload.version !== 'v9') throw new Error(...)` — produces an error with
 * no `code`, which a caller cannot act on, and silently reports "expected v9"
 * for an era that does not exist yet.
 *
 * @param payload The version-tagged payload to narrow.
 * @param seam The provider method being implemented, used in error messages.
 * @returns The live v9 ledger transaction.
 * @throws V8PayloadUnsupportedError if the payload carries the v8 arm.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised. The
 *         types make that unrepresentable, so it is reachable only from
 *         JavaScript, from a consumer built against a pre-5.0.0
 *         `midnight-js-types`, or across an untyped boundary.
 *
 * @example
 * ```typescript
 * const proven = unwrapV9(
 *   await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
 *   'proveTx'
 * );
 * ```
 */
export const unwrapV9 = <T>(payload: VersionedTx<T>, seam: ProviderSeam): T => {
  // Guards the JavaScript-caller case before the switch, so a null or
  // primitive payload reports the same coded error as a bad tag rather than
  // throwing a bare TypeError on property access.
  if (typeof payload !== 'object' || payload === null) {
    throw new UntaggedPayloadError(seam, payload);
  }
  switch (payload.version) {
    case 'v9':
      return payload.tx;
    case 'v8':
      // `txBytes` is required by the type, so the instance check is for the
      // same JavaScript caller the object guard above exists for. Passing
      // `undefined` rather than reading `.byteLength` off whatever arrived
      // makes the message say the field was malformed instead of quietly
      // omitting the size.
      throw new V8PayloadUnsupportedError(
        seam,
        payload.txBytes instanceof Uint8Array ? payload.txBytes.byteLength : undefined
      );
    default: {
      // Keeps the switch exhaustive: if an era is added to `VersionedTx`
      // without an arm here, `payload` stops being `never` and this
      // assignment fails to compile.
      const unhandled: never = payload;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
};
