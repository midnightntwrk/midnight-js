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

import { PROTOCOL_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol';

// Codes for higher layers live here because `contracts`/providers depend on
// `utils`; protocol's own codes are imported rather than re-declared.
export const CONTRACTS_ERROR_CODES = {
  ERA_ARTIFACT_MISMATCH: 'MJS_C_ERA_ARTIFACT_MISMATCH',
  LEDGER8_DEPLOY_ON_V9: 'MJS_C_LEDGER8_DEPLOY_ON_V9',
  HEAD_STATE_ERA_MISMATCH: 'MJS_C_HEAD_STATE_ERA_MISMATCH',
  INDEXER_INCONSISTENCY: 'MJS_C_INDEXER_INCONSISTENCY',
  STALE_HEAD: 'MJS_C_STALE_HEAD',
  KEY_SET_CONTRADICTION: 'MJS_C_KEY_SET_CONTRADICTION',
  UNSUPPORTED_KEY_SET: 'MJS_C_UNSUPPORTED_KEY_SET',
  PROOF_VERSION_UNRESOLVED: 'MJS_C_PROOF_VERSION_UNRESOLVED',
  ERA_INVARIANT_VIOLATION: 'MJS_C_ERA_INVARIANT_VIOLATION',
  UNSANCTIONED_MIXING: 'MJS_C_UNSANCTIONED_MIXING',
  MIXED_ERA_SCOPE: 'MJS_C_MIXED_ERA_SCOPE'
} as const;

export const PROVIDER_ERROR_CODES = {
  DECODE_VERSION_MISMATCH: 'MJS_PR_DECODE_VERSION_MISMATCH',
  MOCK_VERSION_INVARIANT: 'MJS_PR_MOCK_VERSION_INVARIANT'
} as const;

export const UTILS_ERROR_CODES = { TAG_PARSE_FAILED: 'MJS_U_TAG_PARSE_FAILED' } as const;

export const MIDNIGHT_JS_ERROR_CODES: readonly string[] = Object.freeze([
  ...Object.values(PROTOCOL_ERROR_CODES),
  ...Object.values(CONTRACTS_ERROR_CODES),
  ...Object.values(PROVIDER_ERROR_CODES),
  ...Object.values(UTILS_ERROR_CODES)
]);

export const hasErrorCode = <C extends string>(e: unknown, code?: C): e is Error & { code: C } =>
  e instanceof Error &&
  'code' in e &&
  typeof (e as Error & { code: unknown }).code === 'string' &&
  (code === undefined || (e as Error & { code: string }).code === code);
