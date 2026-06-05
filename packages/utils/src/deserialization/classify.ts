/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import type {
  Classification,
  DeserializationCallSite,
  DeserializationContext,
  ExtractedInfo,
  PatternEntry,
  SourceLibrary
} from './deserialization-error';
import { PATTERNS } from './patterns';
import { PINNED_VERSIONS } from './versions';

const versionMismatchBaseline = (): readonly string[] => [
  `Confirm @midnight-ntwrk/midnight-js-protocol pinned versions match the network protocol of the target environment ` +
    `(ledger=${PINNED_VERSIONS.ledger}, compact-runtime=${PINNED_VERSIONS.compactRuntime}, ` +
    `onchain-runtime=${PINNED_VERSIONS.onchainRuntime}).`,
  'If reading data from an indexer, confirm the indexer protocol version matches the dApp.'
];

const formatMismatchBaseline = (): readonly string[] => [
  'This error indicates malformed or truncated bytes — not necessarily a version mismatch.',
  'Verify the source produces canonical encoding (no double-encoding, no trailing bytes, no truncation).',
  'Check intermediate transports (HTTP gateways, GraphQL serialization) for byte corruption.'
];

const unknownBaseline = (): readonly string[] => [
  'Classification could not be determined from the error message.',
  'Inspect the underlying error (Caused by:) for context.',
  'If the cause looks version-related, verify pinned versions in @midnight-ntwrk/midnight-js-protocol.'
];

const PER_SOURCE_HINT: Readonly<Record<SourceLibrary, string>> = {
  ledger:
    `Each ledger type has a structural version tag (e.g. "contract-state[v6]") that is independent of the ` +
    `@midnight-ntwrk/ledger-${PINNED_VERSIONS.ledger} npm package version. ` +
    `Inspect the error's "expected ... got" tag to identify the mismatched type and version, then either ` +
    `align the data source to that structural version or pin a ledger npm version that supports the data's tag.`,
  'compact-runtime':
    'Verify the compactc compiler version used to build the contract matches the compact-runtime pinned ' +
    'in @midnight-ntwrk/midnight-js-protocol. Compact-runtime depends on onchain-runtime — ' +
    'version drift in either propagates here.',
  'onchain-runtime':
    `Verify @midnight-ntwrk/onchain-runtime-${PINNED_VERSIONS.onchainRuntime} pin matches the contract operations runtime. ` +
    'Structural version tags (e.g. "state-value[vN]") may diverge from the npm package version.'
};

const buildMitigation = (
  classification: Classification,
  source: SourceLibrary
): readonly string[] => {
  switch (classification) {
    case 'version-mismatch':
    case 'generic-param-mismatch':
      return [...versionMismatchBaseline(), PER_SOURCE_HINT[source]];
    case 'format-mismatch':
      return formatMismatchBaseline();
    case 'unknown':
      return [...unknownBaseline(), PER_SOURCE_HINT[source]];
  }
};

const resolveClassification = (
  entry: PatternEntry,
  match: RegExpExecArray
): Classification =>
  typeof entry.classification === 'function' ? entry.classification(match) : entry.classification;

/**
 * Classify a deserialization error against the shared pattern table.
 * Returns a fully-populated `DeserializationContext` ready to attach to a
 * `DeserializationError`.
 *
 * Rules (spec §7.1):
 *  - First matching pattern wins.
 *  - `extracted.dataType` (when populated by a pattern) overrides `callSite.dataType`.
 *  - Mitigation is dispatched on `(classification, source)` (D12).
 *  - `extracted` is `undefined` (not `{}`) when no pattern populated it.
 */
export const classify = (
  callSite: DeserializationCallSite,
  cause: Error
): DeserializationContext => {
  const message = cause.message;

  for (const entry of PATTERNS) {
    const match = entry.regex.exec(message);
    if (match === null) continue;

    const classification = resolveClassification(entry, match);
    const direction = entry.inferDirection?.(match);
    const extracted: ExtractedInfo | undefined = entry.extract?.(match);
    const dataType = extracted?.dataType ?? callSite.dataType;
    const mitigation = buildMitigation(classification, callSite.source);

    // Conditional spread: omit `extracted` from the resulting object when no
    // pattern populated it. Avoids `extracted: undefined` (would break under
    // exactOptionalPropertyTypes if ever enabled).
    return {
      dataType,
      source: callSite.source,
      caller: callSite.caller,
      callee: callSite.callee,
      classification,
      direction,
      mitigation,
      pinnedVersions: PINNED_VERSIONS,
      ...(extracted !== undefined ? { extracted } : {})
    };
  }

  return {
    dataType: callSite.dataType,
    source: callSite.source,
    caller: callSite.caller,
    callee: callSite.callee,
    classification: 'unknown',
    mitigation: buildMitigation('unknown', callSite.source),
    pinnedVersions: PINNED_VERSIONS
  };
};
