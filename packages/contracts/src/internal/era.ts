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

import {
  type FinalizedTxData,
  UntaggedPayloadError,
  type VersionedFinalizedTxData,
  type VersionedTx
} from '@midnight-ntwrk/midnight-js-types';

import { EraInvariantViolationError, type EraSeam } from '../errors';

/**
 * Unwraps the v9 arm of a versioned payload a provider returned. The flows in
 * this package only ever send v9 payloads, so a v8 response cannot be handled.
 *
 * Distinct from `unwrapV9` in `@midnight-ntwrk/midnight-js-types`, which guards
 * the *inbound* direction of a v9-only provider. This is the outbound
 * direction: a v8 answer here is a broken provider, not an unsupported
 * request, so it reports {@link EraInvariantViolationError} rather than
 * `V8PayloadUnsupportedError`.
 *
 * The seam types do not tie a provider's output era to its input era, so this
 * runtime check is what upholds that invariant for these flows.
 *
 * @param payload The payload a provider returned.
 * @param seam The provider method that returned it.
 * @param circuitId The circuit, or circuits, this flow is running, for the error message.
 * @returns The live v9 ledger transaction.
 * @throws EraInvariantViolationError if the payload carries the v8 arm.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised.
 */
export function requireV9<T>(
  payload: VersionedTx<T>,
  seam: EraSeam,
  circuitId?: string | readonly string[]
): T {
  if (typeof payload !== 'object' || payload === null) {
    throw new UntaggedPayloadError(seam, payload);
  }
  switch (payload.version) {
    case 'v9':
      return payload.tx;
    case 'v8':
      throw new EraInvariantViolationError(seam, circuitId);
    default: {
      const unhandled: never = payload;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
}

/**
 * Narrows a finalized-transaction record from the read surface to its v9 arm.
 *
 * `PublicDataProvider` reports both eras, but the flows in this package are
 * v9-only, so they keep returning {@link FinalizedTxData} and reject a v8-era
 * record here rather than widening their own public return types.
 *
 * @param record The record the read surface returned.
 * @param seam The read-surface method that returned it.
 * @param circuitId The circuit, or circuits, this flow is running, for the error message.
 * @returns The v9 finalized-transaction record.
 * @throws EraInvariantViolationError if the record carries the v8 arm.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised.
 */
export function requireV9Record(
  record: VersionedFinalizedTxData,
  seam: EraSeam,
  circuitId?: string | readonly string[]
): FinalizedTxData {
  if (typeof record !== 'object' || record === null) {
    throw new UntaggedPayloadError(seam, record);
  }
  switch (record.version) {
    case 'v9':
      return record;
    case 'v8':
      throw new EraInvariantViolationError(seam, circuitId);
    default: {
      const unhandled: never = record;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
}
