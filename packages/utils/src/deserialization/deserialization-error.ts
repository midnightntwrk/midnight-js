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

import { PINNED_VERSIONS } from './versions';

/** Underlying library that produced the deserialization error. */
export type SourceLibrary = 'ledger' | 'compact-runtime' | 'onchain-runtime';

/** How the classifier categorized the error. */
export type Classification =
  | 'version-mismatch'
  | 'generic-param-mismatch'
  | 'format-mismatch'
  | 'unknown';

/** Direction of incompatibility when inferable from the error message. */
export type Direction = 'data-newer-than-code' | 'data-older-than-code';

/**
 * Structured fields extracted from the underlying ledger/runtime error message.
 * Populated by patterns whose `extract` callback succeeded.
 */
export interface ExtractedInfo {
  readonly dataType?: string;
  readonly expectedVersion?: number;
  readonly receivedVersion?: number;
  readonly expectedSpecifiers?: string;
  readonly receivedSpecifiers?: string;
}

/**
 * Pattern entry in the classifier table. The `classification` field can be
 * a static value (most patterns) or a function (Pattern #1, which dispatches
 * between `version-mismatch` and `generic-param-mismatch` based on captured groups).
 */
export interface PatternEntry {
  readonly regex: RegExp;
  readonly classification: Classification | ((match: RegExpExecArray) => Classification);
  readonly inferDirection?: (match: RegExpExecArray) => Direction | undefined;
  readonly extract?: (match: RegExpExecArray) => ExtractedInfo;
}

/**
 * Minimal context the caller of a deserialization wrapper must supply.
 * `dataType` may be overridden by the classifier if the error message
 * contains an extractable struct name.
 */
export interface DeserializationCallSite {
  readonly dataType: string;
  readonly source: SourceLibrary;
  readonly caller: string;
  readonly callee?: string;
}

/** Fully-classified context attached to a `DeserializationError`. */
export interface DeserializationContext extends DeserializationCallSite {
  readonly classification: Classification;
  readonly direction?: Direction;
  readonly mitigation: readonly string[];
  readonly pinnedVersions: typeof PINNED_VERSIONS;
  readonly extracted?: ExtractedInfo;
}

/**
 * Default `callee` (target library identifier) per source. Used by typed
 * wrappers when the caller does not supply an override, and internally by
 * the message formatter when the context omits `callee`.
 */
export const defaultCalleeForSource = (source: SourceLibrary): string => {
  switch (source) {
    case 'ledger':
      return `@midnight-ntwrk/ledger-${PINNED_VERSIONS.ledger}`;
    case 'compact-runtime':
      return `@midnight-ntwrk/compact-runtime`;
    case 'onchain-runtime':
      return `@midnight-ntwrk/onchain-runtime-${PINNED_VERSIONS.onchainRuntime}`;
  }
};

const formatExtracted = (e: ExtractedInfo): string => {
  const parts: string[] = [];
  if (e.dataType !== undefined) parts.push(`dataType=${e.dataType}`);
  if (e.expectedVersion !== undefined) {
    const spec = e.expectedSpecifiers !== undefined ? `(${e.expectedSpecifiers})` : '';
    parts.push(`expected=${e.expectedVersion}${spec}`);
  }
  if (e.receivedVersion !== undefined) {
    const spec = e.receivedSpecifiers !== undefined ? `(${e.receivedSpecifiers})` : '';
    parts.push(`got=${e.receivedVersion}${spec}`);
  }
  return parts.join(', ');
};

const formatMessage = (ctx: DeserializationContext): string => {
  const callee = ctx.callee ?? defaultCalleeForSource(ctx.source);
  const classificationLine =
    `  Classification: ${ctx.classification}` +
    (ctx.direction !== undefined ? ` (direction: ${ctx.direction})` : '');

  const lines: string[] = [
    `Failed to deserialize ${ctx.dataType} (${ctx.source}).`,
    `  ${ctx.caller} → ${callee}`,
    classificationLine,
    `  Pinned versions: ledger=${ctx.pinnedVersions.ledger}, ` +
      `compact-runtime=${ctx.pinnedVersions.compactRuntime}, ` +
      `onchain-runtime=${ctx.pinnedVersions.onchainRuntime}`
  ];

  if (ctx.extracted !== undefined) {
    lines.push(`  Extracted: ${formatExtracted(ctx.extracted)}`);
  }

  if (ctx.mitigation.length === 0) {
    lines.push('  Mitigation: (none)');
  } else {
    lines.push('  Mitigation:');
    for (const hint of ctx.mitigation) {
      lines.push(`    - ${hint}`);
    }
  }

  return lines.join('\n');
};

/**
 * An error thrown by the deserialization wrappers when a ledger / compact-runtime /
 * onchain-runtime `.deserialize`/`.decode` call fails. Carries structured context
 * for diagnosis: data type, call site, classification, direction, mitigation.
 */
export class DeserializationError extends Error {
  readonly context: DeserializationContext;

  /**
   * @param context Structured diagnostic context.
   * @param cause Underlying error. Typed as `unknown` to match the
   *   `Error.cause` ECMA spec and to support unconditional flat-chain
   *   propagation in `withRuntimeContext` (spec §7.5) — the inner error's
   *   cause is passed through as-is rather than narrowed and silently
   *   dropped when it is not an `Error`. Primary call sites (typed
   *   wrappers) always pass an `Error` via `withDeserializationContext`.
   */
  constructor(context: DeserializationContext, cause?: unknown) {
    super(formatMessage(context), cause === undefined ? undefined : { cause });
    this.name = 'DeserializationError';
    this.context = context;
  }
}

/**
 * Type guard for `DeserializationError`. Uses `instanceof` first; falls back
 * to a structural brand check for cross-realm scenarios (Web Worker
 * `postMessage`, npm hoist mismatches) where `instanceof` returns `false`.
 */
export const isDeserializationError = (e: unknown): e is DeserializationError => {
  if (e instanceof DeserializationError) return true;
  if (e === null || typeof e !== 'object') return false;
  const obj = e as { name?: unknown };
  return obj.name === 'DeserializationError' && 'context' in (e as object);
};
