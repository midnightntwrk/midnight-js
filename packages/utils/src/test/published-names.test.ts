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

import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { namingViolations, publishedNames } from '../../../../build-tools/published-names.mjs';

const names = publishedNames(resolve(__dirname, '../..'));

const EXPECTED_PUBLISHED_NAMES = [
  'assertDefined',
  'assertIsContractAddress',
  'assertIsHex',
  'assertManifestHash',
  'assertNever',
  'assertSafeName',
  'assertSemVer',
  'assertUndefined',
  'assertValidMidnightConfig',
  'CallSiteContext',
  'Classification',
  'classify',
  'computeSha256Hex',
  'CONTRACTS_ERROR_CATEGORIES',
  'CONTRACTS_ERROR_CODES',
  'ContractsErrorCode',
  'createMidnightProviders',
  'decodeLedger9StateValue',
  'DeserializationCallSite',
  'DeserializationContext',
  'DeserializationError',
  'deserializeLedger9CompactContractState',
  'deserializeLedger9ContractState',
  'deserializeLedger9Parameters',
  'deserializeLedger9ZswapChainState',
  'deserializeLedgerTransaction',
  'Direction',
  'errorCategory',
  'ExtractedInfo',
  'fromHex',
  'hasErrorCode',
  'hasForeignErrorCode',
  'intentTtl',
  'isDeserializationError',
  'isHex',
  'isMidnightJsError',
  'isValidSigningKey',
  'ledgerVersionOfContractState',
  'ledgerVersionOfLedgerParameters',
  'MAX_CONSECUTIVE_REPEATED',
  'MAX_SAFE_NAME_LENGTH',
  'MIDNIGHT_JS_ERROR_CATEGORIES',
  'MIDNIGHT_JS_ERROR_CATEGORY_BY_CODE',
  'MIDNIGHT_JS_ERROR_CODES',
  'MidnightJsErrorCategory',
  'MidnightJsErrorCode',
  'MidnightNetwork',
  'MIN_CHARACTER_CLASSES',
  'MIN_PASSWORD_LENGTH',
  'MIN_SEQUENTIAL_LENGTH',
  'networks',
  'parseCoinPublicKeyToHex',
  'ParsedHexString',
  'ParsedSerializedTag',
  'parseEncPublicKeyToHex',
  'parseHex',
  'parseSerializedTag',
  'parseZkArtifactManifest',
  'parseZkArtifactRuntimeVersion',
  'PasswordValidationError',
  'PasswordValidationFailure',
  'PatternEntry',
  'PATTERNS',
  'PROVIDER_ERROR_CATEGORIES',
  'PROVIDER_ERROR_CODES',
  'ProviderErrorCode',
  'SOURCE_PACKAGES',
  'SourceLibrary',
  'TagParseError',
  'toHex',
  'ttlOneHour',
  'UnhandledUnionMemberError',
  'UTILS_ERROR_CATEGORIES',
  'UTILS_ERROR_CODES',
  'UtilsErrorCode',
  'validatePassword',
  'verifyZkArtifactIntegrity',
  'warnIfInsecureRemoteUrl',
  'withDeserializationContext',
  'ZK_CONTRACT_INFO_FILE_NAME',
  'ZK_MANIFEST_DIR',
  'ZK_MANIFEST_FILE_NAME',
  'ZkArtifactContractInfoError',
  'ZkArtifactIntegrityError',
  'ZkArtifactIntegrityMode',
  'ZkArtifactManifest',
  'ZkArtifactManifestFile',
  'ZkConfigIntegrityOptions'
];

describe('published names', () => {
  it('reads every entry point the package publishes', () => {
    expect(names).toContain('parseSerializedTag');
  });

  it('publishes exactly this surface from every entry point', () => {
    expect([...new Set(names)].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(EXPECTED_PUBLISHED_NAMES);
  });

  it('follow the naming rules of the public API', () => {
    expect(namingViolations(names)).toEqual([]);
  });
});
