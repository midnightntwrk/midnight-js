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
  SourceLibrary
} from './deserialization-error';
import { PATTERNS } from './patterns';
import { SOURCE_PACKAGES } from './versions';

const versionMismatchBaseline = (): readonly string[] => [
  `Inspect the structural tag in this error (e.g. "expected ... got ..."). It identifies which ` +
    `ledger/compact-runtime/onchain-runtime type your code expects and the version of the incoming data.`,
  `Align the version of ${SOURCE_PACKAGES.ledger}-vN / ${SOURCE_PACKAGES.compactRuntime} / ` +
    `${SOURCE_PACKAGES.onchainRuntime}-vN your dApp pulls in with the protocol version of the network ` +
    `and indexer you are connecting to.`
];

const formatMismatchBaseline = (): readonly string[] => [
  'This error indicates malformed or truncated bytes — not necessarily a version mismatch.',
  'Verify the source produces canonical encoding (no double-encoding, no trailing bytes, no truncation).',
  'Check intermediate transports (HTTP gateways, GraphQL serialization) for byte corruption.'
];

const unknownBaseline = (): readonly string[] => [
  'Classification could not be determined from the error message.',
  'Inspect the underlying error (Caused by:) for context.',
  'If the cause looks version-related, align the underlying ledger / compact-runtime / onchain-runtime package versions across your dApp, the network, and the indexer.'
];

const PER_SOURCE_HINT: Readonly<Record<SourceLibrary, string>> = {
  ledger:
    `Each ledger type has a structural version tag (e.g. "contract-state[v6]") embedded in the serialized ` +
    `payload. The dApp's installed ${SOURCE_PACKAGES.ledger}-vN binding expects a specific tag; ` +
    `the data source produced a different one. Resolve by aligning the version on either end.`,
  'compact-runtime':
    `${SOURCE_PACKAGES.compactRuntime} depends on ${SOURCE_PACKAGES.onchainRuntime}-vN — ` +
    `version drift in either propagates here. Verify the compactc compiler version used to build the ` +
    `contract matches the runtime your dApp uses.`,
  'onchain-runtime':
    `Confirm ${SOURCE_PACKAGES.onchainRuntime}-vN installed in your dApp matches the contract operations ` +
    `runtime in the target network. Structural tags (e.g. "state-value[vN]") may diverge from the npm major-version suffix.`
};

const buildMitigation = (
  classification: Classification,
  source: SourceLibrary
): readonly string[] => {
  switch (classification) {
    case 'version-mismatch':
      return [...versionMismatchBaseline(), PER_SOURCE_HINT[source]];
    case 'format-mismatch':
      return formatMismatchBaseline();
    case 'unknown':
      return [...unknownBaseline(), PER_SOURCE_HINT[source]];
  }
};

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

    const classification = entry.classification;
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
      classification,
      direction,
      mitigation,
      ...(extracted !== undefined ? { extracted } : {})
    };
  }

  return {
    dataType: callSite.dataType,
    source: callSite.source,
    caller: callSite.caller,
    classification: 'unknown',
    mitigation: buildMitigation('unknown', callSite.source)
  };
};
