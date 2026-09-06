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

// Codes for higher layers are declared here because `contracts` and the
// provider packages depend on `utils`; protocol's own codes are imported
// rather than re-declared. Add a constant here in the same change that first
// throws with it.
//
// The two groups below hold to that. The imported PROTOCOL_ERROR_CODES do not:
// LEDGER8_INSTANCE_MISMATCH, DOWN_CONVERT_FAILED and MERKLE_NOT_REHASHED have
// no thrower yet, and are reserved for the era-conversion work. Do not read
// membership of MIDNIGHT_JS_ERROR_CODES as proof that something throws it.
export const CONTRACTS_ERROR_CODES = Object.freeze({
  ERA_INVARIANT_VIOLATION: 'MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION',
  ERA_ARTIFACT_MISMATCH: 'MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH',
  LEDGER8_DEPLOY_ON_V9: 'MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9',
  HEAD_STATE_ERA_MISMATCH: 'MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH',
  INDEXER_INCONSISTENCY: 'MIDNIGHT_JS_C_INDEXER_INCONSISTENCY',
  BLANK_VERIFIER_KEY_SLOT: 'MIDNIGHT_JS_C_BLANK_VERIFIER_KEY_SLOT',
  VERIFIER_KEY_MISMATCH: 'MIDNIGHT_JS_C_VERIFIER_KEY_MISMATCH',
  LEDGER8_SHIELDED_SPEND_UNSUPPORTED: 'MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED',
  LEDGER8_SEAM_FAILED: 'MIDNIGHT_JS_C_LEDGER8_SEAM_FAILED',
  STALE_HEAD: 'MIDNIGHT_JS_C_STALE_HEAD',
  SUBMIT_REJECTION_UNDIAGNOSED: 'MIDNIGHT_JS_C_SUBMIT_REJECTION_UNDIAGNOSED',
  SCOPED_TX_ERA_UNSUPPORTED: 'MIDNIGHT_JS_C_SCOPED_TX_ERA_UNSUPPORTED',
  MIXED_ERA_SCOPE: 'MIDNIGHT_JS_C_MIXED_ERA_SCOPE'
} as const);
export type ContractsErrorCode = (typeof CONTRACTS_ERROR_CODES)[keyof typeof CONTRACTS_ERROR_CODES];

export const PROVIDER_ERROR_CODES = Object.freeze({
  V8_PAYLOAD_UNSUPPORTED: 'MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED',
  UNTAGGED_PAYLOAD: 'MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD',
  ERA_UNSUPPORTED: 'MIDNIGHT_JS_PR_ERA_UNSUPPORTED',
  ERA_UNRESOLVABLE: 'MIDNIGHT_JS_PR_ERA_UNRESOLVABLE'
} as const);
export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[keyof typeof PROVIDER_ERROR_CODES];

export const UTILS_ERROR_CODES = Object.freeze({ TAG_PARSE_FAILED: 'MIDNIGHT_JS_U_TAG_PARSE_FAILED' } as const);
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
