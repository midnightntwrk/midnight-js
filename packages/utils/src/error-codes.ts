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
// Same leaf-subpath reasoning as above: the `types` root barrel pulls `effect`
// and the protocol ledger namespace, neither of which reading a code needs.
import { PROVIDER_ERROR_CODES, type ProviderErrorCode } from '@midnight-ntwrk/midnight-js-types/errors';

// Declared here, above the package that throws them, because the no-argument
// `hasErrorCode` needs a COMPLETE registry and is consulted from `contracts`
// (`internal/ledger8-entry.ts`, `internal/transaction.ts`) and by
// `src/test/troubleshooting-coverage.test.ts`. Both sit at or above `utils`, so
// the registry cannot move up with them. Every other group is imported from its
// owner. Add a constant here in the same change that first throws with it.
export const CONTRACTS_ERROR_CODES = Object.freeze({
  ERA_INVARIANT_VIOLATION: 'MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION',
  ERA_ARTIFACT_MISMATCH: 'MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH',
  UNRECOGNISED_RESULT_ERA: 'MIDNIGHT_JS_C_UNRECOGNISED_RESULT_ERA',
  TX_FAILED: 'MIDNIGHT_JS_C_TX_FAILED',
  LEDGER8_DEPLOY_ON_V9: 'MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9',
  HEAD_STATE_ERA_MISMATCH: 'MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH',
  INDEXER_INCONSISTENCY: 'MIDNIGHT_JS_C_INDEXER_INCONSISTENCY',
  RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE: 'MIDNIGHT_JS_C_RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE',
  BLANK_VERIFIER_KEY_SLOT: 'MIDNIGHT_JS_C_BLANK_VERIFIER_KEY_SLOT',
  VERIFIER_KEY_MISMATCH: 'MIDNIGHT_JS_C_VERIFIER_KEY_MISMATCH',
  LEDGER8_SHIELDED_SPEND_UNSUPPORTED: 'MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED',
  LEDGER8_SEAM_FAILED: 'MIDNIGHT_JS_C_LEDGER8_SEAM_FAILED',
  STALE_HEAD: 'MIDNIGHT_JS_C_STALE_HEAD',
  SUBMIT_REJECTION_UNDIAGNOSED: 'MIDNIGHT_JS_C_SUBMIT_REJECTION_UNDIAGNOSED',
  SCOPED_TX_ERA_UNSUPPORTED: 'MIDNIGHT_JS_C_SCOPED_TX_ERA_UNSUPPORTED',
  MIXED_ERA_SCOPE: 'MIDNIGHT_JS_C_MIXED_ERA_SCOPE',
  LEDGER_PARAMETERS_UNSERVED: 'MIDNIGHT_JS_C_LEDGER_PARAMETERS_UNSERVED'
} as const);
export type ContractsErrorCode = (typeof CONTRACTS_ERROR_CODES)[keyof typeof CONTRACTS_ERROR_CODES];

// Re-exported, not re-declared: the group is owned by `@midnight-ntwrk/midnight-js-types`.
// Kept on this module so the published surface of this package is unchanged.
export { PROVIDER_ERROR_CODES, type ProviderErrorCode };

export const UTILS_ERROR_CODES = Object.freeze({
  TAG_PARSE_FAILED: 'MIDNIGHT_JS_U_TAG_PARSE_FAILED',
  UNHANDLED_UNION_MEMBER: 'MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER'
} as const);
export type UtilsErrorCode = (typeof UTILS_ERROR_CODES)[keyof typeof UTILS_ERROR_CODES];

/**
 * Union of every error code carried by a *coded* midnight-js error.
 *
 * Not every midnight-js error carries a code, so `hasErrorCode(e) === false`
 * does not mean the error came from somewhere else.
 */
export type MidnightJsErrorCode = ProtocolErrorCode | ContractsErrorCode | ProviderErrorCode | UtilsErrorCode;

export const MIDNIGHT_JS_ERROR_CODES: readonly MidnightJsErrorCode[] = Object.freeze([
  ...Object.values(PROTOCOL_ERROR_CODES),
  ...Object.values(CONTRACTS_ERROR_CODES),
  ...Object.values(PROVIDER_ERROR_CODES),
  ...Object.values(UTILS_ERROR_CODES)
]);

const MIDNIGHT_JS_ERROR_CODE_SET: ReadonlySet<string> = new Set(MIDNIGHT_JS_ERROR_CODES);

const codeOf = (e: unknown): e is Error & { code: string } =>
  e instanceof Error && 'code' in e && typeof e.code === 'string';

/**
 * Type guard for "this is one of midnight-js's own coded errors" — narrows
 * to `Error & { code: MidnightJsErrorCode }` only when `e.code` is present
 * in the {@link MIDNIGHT_JS_ERROR_CODES} registry. A foreign coded error
 * (e.g. Node's `ECONNREFUSED`) returns `false`.
 */
export function hasErrorCode(e: unknown): e is Error & { code: MidnightJsErrorCode };
/**
 * Type guard for "this error carries exactly `code`" — narrows to
 * `Error & { code: C }` when `e.code === code`.
 *
 * `code` must be one of this framework's own codes, so a typo is a compile
 * error rather than a guard that silently never matches. To compare against a
 * code this framework does not own, use {@link hasForeignErrorCode}.
 */
export function hasErrorCode<C extends MidnightJsErrorCode>(e: unknown, code: C): e is Error & { code: C };
export function hasErrorCode<C extends MidnightJsErrorCode>(e: unknown, code?: C): boolean {
  if (!codeOf(e)) {
    return false;
  }
  if (code === undefined) {
    return MIDNIGHT_JS_ERROR_CODE_SET.has(e.code);
  }
  return e.code === code;
}

/**
 * Type guard for "this error carries exactly `code`", where `code` belongs to
 * someone else — Node's `ECONNREFUSED`, a driver's own vocabulary, anything
 * outside {@link MidnightJsErrorCode}.
 *
 * Separate from {@link hasErrorCode} so that reaching outside this framework's
 * codes is deliberate and visible at the call site, instead of being the same
 * call that a typo degrades into.
 */
export function hasForeignErrorCode<C extends string>(e: unknown, code: C): e is Error & { code: C } {
  return codeOf(e) && e.code === code;
}
