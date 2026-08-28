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

import { type VersionedRecord,versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol/version';

import { EraUnsupportedError } from './errors';

/**
 * Resolves the ledger era of a record read from the indexer and confirms this
 * provider can decode it.
 *
 * The `version` discriminant on a finalized-transaction record is derived from
 * the record's own `protocolVersion`, never asserted: stamping a literal
 * `'v9'` would let the discriminant disagree with the `protocolVersion` in the
 * same record, and a consumer that narrows on it would be misled.
 *
 * The read path deserializes with the v9-only ledger runtime, so a record that
 * resolves to any other era is reported rather than mislabelled. That makes
 * this the one place an unsupported network is named, instead of surfacing as a
 * deserialization failure deep inside the codec.
 *
 * @param record The indexer record, carrying the raw `protocolVersion`.
 * @param seam The read-surface method resolving the era, for the error message.
 * @returns `'v9'`, the only era this provider decodes.
 * @throws EraUnsupportedError if the record resolves to a different era.
 * @throws UnknownProtocolVersionError if `protocolVersion` maps to no era at
 *         all — a network outside the node 1.x/2.x range this framework
 *         supports.
 */
export const requireV9Era = (record: VersionedRecord, seam: string): 'v9' => {
  const era = versionOfRecord(record);
  if (era !== 'v9') {
    throw new EraUnsupportedError(seam, era, record.protocolVersion);
  }
  return era;
};
