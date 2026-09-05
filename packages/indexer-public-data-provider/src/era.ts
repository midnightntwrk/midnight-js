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

import { UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  type LedgerVersion,
  type VersionedRecord,
  versionOfRecord
} from '@midnight-ntwrk/midnight-js-protocol/version';
import type { ReadSeam } from '@midnight-ntwrk/midnight-js-types';

import { EraUnresolvableError } from './errors';

/**
 * Resolves the ledger era of a record read from the indexer, so the read path
 * can dispatch the decode to the runtime that wrote the bytes.
 *
 * The `version` discriminant on a finalized-transaction record is derived from
 * the record's own `protocolVersion`, never asserted: stamping a literal
 * `'v9'` would let the discriminant disagree with the `protocolVersion` in the
 * same record, and a consumer that narrows on it would be misled.
 *
 * Resolved BEFORE any deserializer runs, deliberately. Each era has its own
 * decoder, and handing bytes to the wrong one yields a header-tag failure that
 * says nothing about which runtime should have read them. Settling the era
 * first is what lets {@link decodeVersionedTransaction} name the era it
 * dispatched to when a decode does fail.
 *
 * A `protocolVersion` this client cannot place on the era timeline is reported
 * as an {@link IndexerError} subclass, so the package's documented "catch any
 * indexer error with one `instanceof` check" contract holds on this path too.
 *
 * @param record The indexer record, carrying the raw `protocolVersion`.
 * @param seam The read-surface method resolving the era, for the error message.
 * @param recordRef The transaction id or contract address being read, so a
 *                  failure names which record it was. Optional only because
 *                  not every call site has one to hand.
 * @returns The era the record was written under.
 * @throws EraUnresolvableError if `protocolVersion` maps to no era at all — a
 *         network outside the node 1.x/2.x range this framework supports, or a
 *         value that is not a non-negative integer.
 */
export const resolveReadEra = (record: VersionedRecord, seam: ReadSeam, recordRef?: string): LedgerVersion => {
  try {
    return versionOfRecord(record);
  } catch (error) {
    // Re-reported rather than propagated so that an unmappable era reaches
    // consumers as an IndexerError like every other failure from this package.
    // The original is preserved on `cause`.
    if (error instanceof UnknownProtocolVersionError) {
      throw new EraUnresolvableError(seam, record.protocolVersion, { cause: error }, recordRef);
    }
    throw error;
  }
};
