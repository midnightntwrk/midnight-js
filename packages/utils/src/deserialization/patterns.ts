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

const pattern1Classification = (match: RegExpExecArray): Classification => {
  const got = match.groups?.got ?? '';
  const sec = GOT_SUBPATTERN.exec(got);
  if (sec === null) return 'version-mismatch';
  const expVer = Number(match.groups?.expectedVersion);
  const gotVer = Number(sec.groups?.gotVersion);
  if (expVer !== gotVer) return 'version-mismatch';
  if (match.groups?.expectedSpecifiers !== sec.groups?.gotSpecifiers) {
    return 'generic-param-mismatch';
  }
  return 'version-mismatch';
};

const pattern1Direction = (match: RegExpExecArray) => {
  const got = match.groups?.got ?? '';
  const sec = GOT_SUBPATTERN.exec(got);
  if (sec === null) return undefined;
  const expVer = Number(match.groups?.expectedVersion);
  const gotVer = Number(sec.groups?.gotVersion);
  if (gotVer < expVer) return 'data-older-than-code' as const;
  if (gotVer > expVer) return 'data-newer-than-code' as const;
  return undefined;
};

const pattern1Extract = (match: RegExpExecArray): ExtractedInfo => {
  const got = match.groups?.got ?? '';
  const sec = GOT_SUBPATTERN.exec(got);
  const info: {
    dataType?: string;
    expectedVersion?: number;
    receivedVersion?: number;
    expectedSpecifiers?: string;
    receivedSpecifiers?: string;
  } = {};

  if (match.groups?.what !== undefined) info.dataType = match.groups.what;
  if (match.groups?.expectedVersion !== undefined) {
    info.expectedVersion = Number(match.groups.expectedVersion);
  }
  if (match.groups?.expectedSpecifiers !== undefined) {
    info.expectedSpecifiers = match.groups.expectedSpecifiers;
  }
  if (sec !== null) {
    if (sec.groups?.gotVersion !== undefined) info.receivedVersion = Number(sec.groups.gotVersion);
    if (sec.groups?.gotSpecifiers !== undefined) info.receivedSpecifiers = sec.groups.gotSpecifiers;
  }

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
