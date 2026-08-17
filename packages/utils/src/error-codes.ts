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

// Imported from the `./errors` leaf subpath rather than the package root:
// the root barrel re-exports the ledger/compact-js/onchain-runtime/platform
// namespaces too, and pulling those into every `utils` consumer just to read
// a handful of error-code strings would be a needless dependency footprint.
import { PROTOCOL_ERROR_CODES, type ProtocolErrorCode } from '@midnight-ntwrk/midnight-js-protocol/errors';

// Codes for higher layers live here because `contracts`/providers depend on
// `utils`; protocol's own codes are imported rather than re-declared.
export const CONTRACTS_ERROR_CODES = Object.freeze({
  ERA_ARTIFACT_MISMATCH: 'MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH',
  LEDGER8_DEPLOY_ON_V9: 'MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9',
  HEAD_STATE_ERA_MISMATCH: 'MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH',
  INDEXER_INCONSISTENCY: 'MIDNIGHT_JS_C_INDEXER_INCONSISTENCY',
  STALE_HEAD: 'MIDNIGHT_JS_C_STALE_HEAD',
  KEY_SET_CONTRADICTION: 'MIDNIGHT_JS_C_KEY_SET_CONTRADICTION',
  UNSUPPORTED_KEY_SET: 'MIDNIGHT_JS_C_UNSUPPORTED_KEY_SET',
  PROOF_VERSION_UNRESOLVED: 'MIDNIGHT_JS_C_PROOF_VERSION_UNRESOLVED',
  ERA_INVARIANT_VIOLATION: 'MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION',
  UNSANCTIONED_MIXING: 'MIDNIGHT_JS_C_UNSANCTIONED_MIXING',
  MIXED_ERA_SCOPE: 'MIDNIGHT_JS_C_MIXED_ERA_SCOPE'
} as const);
export type ContractsErrorCode = (typeof CONTRACTS_ERROR_CODES)[keyof typeof CONTRACTS_ERROR_CODES];

export const PROVIDER_ERROR_CODES = Object.freeze({
  DECODE_VERSION_MISMATCH: 'MIDNIGHT_JS_PR_DECODE_VERSION_MISMATCH',
  MOCK_VERSION_INVARIANT: 'MIDNIGHT_JS_PR_MOCK_VERSION_INVARIANT'
} as const);
export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[keyof typeof PROVIDER_ERROR_CODES];

export const UTILS_ERROR_CODES = Object.freeze({ TAG_PARSE_FAILED: 'MIDNIGHT_JS_U_TAG_PARSE_FAILED' } as const);
export type UtilsErrorCode = (typeof UTILS_ERROR_CODES)[keyof typeof UTILS_ERROR_CODES];

/** Union of every error code any midnight-js layer can produce. */
export type MidnightJsErrorCode = ProtocolErrorCode | ContractsErrorCode | ProviderErrorCode | UtilsErrorCode;

export const MIDNIGHT_JS_ERROR_CODES: readonly MidnightJsErrorCode[] = Object.freeze([
  ...Object.values(PROTOCOL_ERROR_CODES),
  ...Object.values(CONTRACTS_ERROR_CODES),
  ...Object.values(PROVIDER_ERROR_CODES),
  ...Object.values(UTILS_ERROR_CODES)
]);

const MIDNIGHT_JS_ERROR_CODE_SET: ReadonlySet<string> = new Set(MIDNIGHT_JS_ERROR_CODES);

/**
 * Type guard for "this is one of midnight-js's own coded errors" — narrows
 * to `Error & { code: MidnightJsErrorCode }` only when `e.code` is present
 * in the {@link MIDNIGHT_JS_ERROR_CODES} registry. A foreign coded error
 * (e.g. Node's `ECONNREFUSED`) returns `false`.
 */
export function hasErrorCode(e: unknown): e is Error & { code: MidnightJsErrorCode };
/**
 * Type guard for "this error carries exactly `code`" — narrows to
 * `Error & { code: C }` when `e.code === code`. `C` is not required to be a
 * member of {@link MidnightJsErrorCode}, so this form also works for
 * comparing against a specific foreign code.
 */
export function hasErrorCode<C extends string>(e: unknown, code: C): e is Error & { code: C };
export function hasErrorCode<C extends string>(e: unknown, code?: C): boolean {
  if (!(e instanceof Error) || !('code' in e) || typeof e.code !== 'string') {
    return false;
  }
  if (code === undefined) {
    return MIDNIGHT_JS_ERROR_CODE_SET.has(e.code);
  }
  return e.code === code;
}
