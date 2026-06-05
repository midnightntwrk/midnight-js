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

import type { Classification, ExtractedInfo, PatternEntry } from './deserialization-error';

/**
 * Secondary regex applied to the `got` capture group of Pattern #1.
 * Parses the well-formed `<type-name>[vN](specifiers):` shape when present.
 * Real ledger errors often produce empty, garbage, or truncated `got` values
 * (verified against ledger-v8@8.1.0) — this secondary match is opportunistic.
 */
const GOT_SUBPATTERN =
  /^(?<gotType>[A-Za-z:-]+)\[v(?<gotVersion>\d+)\](?:\((?<gotSpecifiers>[^)]+)\))?:$/;

/**
 * Parsed result of Pattern #1 (primary + secondary). Computed once per match
 * via {@link parsePattern1} and consumed by the three callbacks below — keeps
 * NaN and undefined handling in one place and avoids re-running the secondary
 * regex three times per pattern hit.
 */
interface Pattern1Parsed {
  readonly what?: string;
  readonly expectedVersion?: number;
  readonly expectedSpecifiers?: string;
  readonly secondaryMatched: boolean;
  readonly gotVersion?: number;
  readonly gotSpecifiers?: string;
}

const parsePattern1 = (match: RegExpExecArray): Pattern1Parsed => {
  const got = match.groups?.got ?? '';
  const sec = GOT_SUBPATTERN.exec(got);
  const expectedVersionRaw = match.groups?.expectedVersion;
  const gotVersionRaw = sec?.groups?.gotVersion;
  return {
    what: match.groups?.what,
    expectedVersion: expectedVersionRaw === undefined ? undefined : Number(expectedVersionRaw),
    expectedSpecifiers: match.groups?.expectedSpecifiers,
    secondaryMatched: sec !== null,
    gotVersion: gotVersionRaw === undefined ? undefined : Number(gotVersionRaw),
    gotSpecifiers: sec?.groups?.gotSpecifiers
  };
};

const pattern1Classification = (match: RegExpExecArray): Classification => {
  const p = parsePattern1(match);
  if (!p.secondaryMatched) return 'version-mismatch';
  if (p.expectedVersion !== p.gotVersion) return 'version-mismatch';
  if (p.expectedSpecifiers !== p.gotSpecifiers) return 'generic-param-mismatch';
  return 'version-mismatch';
};

const pattern1Direction = (match: RegExpExecArray) => {
  const p = parsePattern1(match);
  if (!p.secondaryMatched || p.expectedVersion === undefined || p.gotVersion === undefined) {
    return undefined;
  }
  if (p.gotVersion < p.expectedVersion) return 'data-older-than-code' as const;
  if (p.gotVersion > p.expectedVersion) return 'data-newer-than-code' as const;
  return undefined;
};

const pattern1Extract = (match: RegExpExecArray): ExtractedInfo => {
  const p = parsePattern1(match);
  const info: {
    dataType?: string;
    expectedVersion?: number;
    receivedVersion?: number;
    expectedSpecifiers?: string;
    receivedSpecifiers?: string;
  } = {};

  if (p.what !== undefined) info.dataType = p.what;
  if (p.expectedVersion !== undefined) info.expectedVersion = p.expectedVersion;
  if (p.expectedSpecifiers !== undefined) info.expectedSpecifiers = p.expectedSpecifiers;
  if (p.gotVersion !== undefined) info.receivedVersion = p.gotVersion;
  if (p.gotSpecifiers !== undefined) info.receivedSpecifiers = p.gotSpecifiers;

  return info;
};

/**
 * Shared pattern table across all three sources (ledger / compact-runtime / onchain-runtime).
 * Sources share the same `serialize` Rust crate, so error message formats are identical.
 * Order matters — more specific patterns come first; first match wins.
 *
 * Patterns sourced from `midnight-ledger` repo audit (spec §7.1):
 *  - `serialize/src/deserializable.rs`, `serialize/src/util.rs`
 *  - `serialize-macros/src/lib.rs`
 *  - `ledger/src/structure.rs`, `ledger/src/error.rs`
 *  - `ledger-wasm/src/conversions.rs`, `onchain-runtime-wasm/src/lib.rs`
 */
export const PATTERNS: readonly PatternEntry[] = [
  // #1 — primary version mismatch (tag header), two-stage match
  {
    regex:
      /(?:Unable to deserialize (?<what>[A-Za-z]+)\. Error: )?expected header tag '(?<expectedType>[A-Za-z:-]+)\[v(?<expectedVersion>\d+)\](?:\((?<expectedSpecifiers>[^)]+)\))?:', got '(?<got>[^']*)'/,
    classification: pattern1Classification,
    inferDirection: pattern1Direction,
    extract: pattern1Extract
  },
  // #3 — versioned enum old discriminant → data is older
  {
    regex: /invalid old discriminant/i,
    classification: 'version-mismatch',
    inferDirection: () => 'data-older-than-code'
  },
  // #4 — versioned enum unknown discriminant → data is newer
  {
    regex: /unknown discriminant/i,
    classification: 'version-mismatch',
    inferDirection: () => 'data-newer-than-code'
  },
  // #5 — auto-derived enum extension (serialize-macros)
  {
    regex: /unrecognised discriminant/i,
    classification: 'version-mismatch'
  },
  // #6 — explicit unsupported version at higher layer
  {
    regex: /unsupported (?:proof|guaranteed transcript|fallible transcript) version/i,
    classification: 'version-mismatch'
  },
  // #7 — over-read
  {
    regex: /Not all bytes read/,
    classification: 'format-mismatch'
  },
  // #8 — recursion overflow
  {
    regex: /exceeded recursion depth/,
    classification: 'format-mismatch'
  },
  // #9 — scale encoding violation
  {
    regex: /non-canonical scale encoding/,
    classification: 'format-mismatch'
  },
  // #10 — integer range
  {
    regex: /out of range for /,
    classification: 'format-mismatch'
  },
  // #11 — bool decode
  {
    regex: /cannot deserialize \S+ as bool/,
    classification: 'format-mismatch'
  },
  // #12 — Option discriminant (case-sensitive to distinguish from #3/#4)
  {
    regex: /Invalid discriminant: /,
    classification: 'format-mismatch'
  },
  // #13 — Rust std UnexpectedEof
  {
    regex: /failed to fill whole buffer/,
    classification: 'format-mismatch'
  }
];
