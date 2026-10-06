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
  CURRENT_LEDGER_VERSION,
  type CurrentLedgerVersion,
  type LedgerVersion,
  RETAINED_LEDGER_VERSIONS,
  type RetainedLedgerVersion
} from '@midnight-ntwrk/midnight-js-protocol/version';

import { type ProviderSeam, UntaggedPayloadError, V8PayloadUnsupportedError } from './errors';
import type { VersionedTx } from './versioned';

/**
 * The handlers a provider registers for the eras that cross its seam as
 * serialized bytes — one optional entry per {@link RetainedLedgerVersion}.
 *
 * The current era is EXCLUDED from the key set on purpose, and that exclusion
 * is the point of the type: the current era crosses the seam as a live ledger
 * object, never as bytes, so a handler registered against it would have the
 * wrong signature and serve a request that can never arrive. Registering one is
 * a build failure rather than a comment asking implementers not to.
 *
 * The exclusion is derived from `CURRENT_LEDGER_VERSION`, so when the network
 * moves on and today's current era becomes a retained one, it becomes
 * registrable here on its own — no change to this type, and no change to any
 * provider that already declines to register it.
 *
 * @typeParam H - The handler signature for one retained era at this seam.
 */
export type RetainedEraHandlers<H> = Partial<Readonly<Record<RetainedLedgerVersion, H>>>;

/**
 * The era list a provider assembled from these arms serves.
 *
 * Derived from the arms actually supplied rather than written out beside them:
 * a hand-written list is a second statement of the same fact, and the two drift
 * the first time an arm is added or removed. The current era is always present
 * because {@link RetainedEraHandlers} is the only optional half — a provider
 * with no current-era arm cannot be constructed.
 *
 * @param retainedEras The retained arms supplied to the factory, if any.
 * @returns The eras this provider declares, frozen so a consumer cannot widen
 *          the declaration after construction and make
 *          `assertSeamsSupportEra` pass for an era the arms do not serve.
 */
export const erasServedBy = (retainedEras?: RetainedEraHandlers<unknown>): readonly LedgerVersion[] =>
  Object.freeze<LedgerVersion[]>([
    CURRENT_LEDGER_VERSION,
    ...RETAINED_LEDGER_VERSIONS.filter((era) => retainedEras?.[era] !== undefined)
  ]);

/**
 * A tagged payload narrowed to the arm that will serve it: either the live
 * current-era object, or a retained era's bytes together with the handler
 * registered for that era.
 *
 * @typeParam T - The current era's ledger transaction type at this seam.
 * @typeParam H - The retained-era handler signature at this seam.
 */
export type EraArmRequest<T, H> =
  | { readonly era: CurrentLedgerVersion; readonly tx: T }
  | { readonly era: RetainedLedgerVersion; readonly handler: H; readonly txBytes: Uint8Array };

/**
 * Narrows a version-tagged payload onto the arm that serves it, refusing an arm
 * no handler was registered for.
 *
 * This is `unwrapV9` generalised to a provider that serves more than one era,
 * and it reports the same two errors for the same two reasons — so widening a
 * provider to a second era does not change what a caller catches when it sends
 * an era that provider still does not serve.
 *
 * @param payload The version-tagged payload that arrived at the seam.
 * @param seam The provider method being implemented, used in error messages.
 * @param retainedEras The retained arms this provider was built with.
 * @returns The arm to run, and the payload it takes.
 * @throws V8PayloadUnsupportedError if the payload carries a retained era for
 *         which no handler was registered.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised. The
 *         types make that unrepresentable, so it is reachable only from
 *         JavaScript, from a consumer built against a pre-5.0.0
 *         `midnight-js-types`, or across an untyped boundary.
 */
export const narrowToEraArm = <T, H>(
  payload: VersionedTx<T>,
  seam: ProviderSeam,
  retainedEras: RetainedEraHandlers<H> | undefined
): EraArmRequest<T, H> => {
  // Guards the JavaScript-caller case before the switch, so a null or primitive
  // payload reports the same coded error as a bad tag rather than throwing a
  // bare TypeError on property access.
  if (typeof payload !== 'object' || payload === null) {
    throw new UntaggedPayloadError(seam, payload);
  }
  switch (payload.version) {
    case CURRENT_LEDGER_VERSION:
      return { era: CURRENT_LEDGER_VERSION, tx: payload.tx };
    case 'v8': {
      // Looked up through the payload's own tag rather than a second `'v8'`
      // literal, so the arm that ran and the arm that was requested cannot
      // disagree.
      const handler = retainedEras?.[payload.version];
      if (handler === undefined) {
        // The same error a v9-only provider raises, for the same reason: this
        // seam does not serve the era that arrived. `txBytes` is required by
        // the type, so the instance check is for the JavaScript caller the
        // object guard above exists for.
        throw new V8PayloadUnsupportedError(
          seam,
          payload.txBytes instanceof Uint8Array ? payload.txBytes.byteLength : undefined
        );
      }
      return { era: payload.version, handler, txBytes: payload.txBytes };
    }
    default: {
      // Keeps the switch exhaustive: if an era is added to `VersionedTx`
      // without an arm here, `payload` stops being `never` and this assignment
      // fails to compile.
      const unhandled: never = payload;
      throw new UntaggedPayloadError(seam, unhandled);
    }
  }
};
