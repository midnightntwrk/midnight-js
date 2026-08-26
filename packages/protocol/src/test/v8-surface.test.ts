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

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadLedger8 } from '../lib/v8/load';
// Type-only import: erased at compile time, so it costs nothing at runtime,
// but a vendor rename or removal of any of these 30 OQ3_SURFACE type-only
// members breaks the build. This is the only check available for them —
// they never appear in `Object.keys()`.
import type {
  AlignedValue,
  Bindingish,
  CoinCommitment,
  CoinPublicKey,
  ContractAddress,
  EncodedStateValue,
  EncPublicKey,
  FinalizedTransaction,
  IntentHash,
  Nullifier,
  PartitionedTranscript,
  Proofish,
  ProvingKeyMaterial,
  ProvingProvider,
  PublicAddress,
  QualifiedShieldedCoinInfo,
  RawTokenType,
  ShieldedCoinInfo,
  Signaturish,
  SigningKey,
  TokenType,
  TransactionHash,
  TransactionId,
  Transcript,
  UnprovenInput,
  UnprovenOffer,
  UnprovenOutput,
  UnprovenTransaction,
  UnprovenTransient,
  UtxoOutput
} from '../v8.js';

// Prefixed `_`: this type exists only to force the compiler to resolve every
// name in the import above — it is never instantiated.
type _OQ3SurfaceTypeOnlyMembers = [
  AlignedValue,
  Bindingish,
  CoinCommitment,
  CoinPublicKey,
  ContractAddress,
  EncPublicKey,
  EncodedStateValue,
  FinalizedTransaction,
  IntentHash,
  Nullifier,
  PartitionedTranscript,
  Proofish,
  ProvingKeyMaterial,
  ProvingProvider,
  PublicAddress,
  QualifiedShieldedCoinInfo,
  RawTokenType,
  ShieldedCoinInfo,
  Signaturish,
  SigningKey,
  TokenType,
  TransactionHash,
  TransactionId,
  Transcript<AlignedValue>,
  UnprovenInput,
  UnprovenOffer,
  UnprovenOutput,
  UnprovenTransaction,
  UnprovenTransient,
  UtxoOutput
];

// OQ3_SURFACE (79 names, MJS-01 plan Task 1.4 appendix) mixes runtime and
// type-only vendor exports; `Object.keys()` on the loaded module only ever
// sees the runtime half. The 30 type-only members are covered above instead.
// This is the runtime-visible subset — the consumption contract this
// framework depends on. Checked as a subset (assertion B below), not an
// exhaustive list: the vendor's full runtime surface is larger than what
// OQ3_SURFACE consumes, and assertion A below already pins that full list.
const OQ3_SURFACE_RUNTIME = [
  'Binding',
  'ChargedState',
  'CoinSecretKey',
  'ContractCallPrototype',
  'ContractDeploy',
  'ContractOperation',
  'ContractState',
  'CostModel',
  'DustSecretKey',
  'EncryptionSecretKey',
  'Intent',
  'LedgerParameters',
  'MaintenanceUpdate',
  'PreBinding',
  'PreTranscript',
  'Proof',
  'QueryContext',
  'SignatureEnabled',
  'StateValue',
  'Transaction',
  'UnshieldedOffer',
  'ZswapChainState',
  'ZswapInput',
  'ZswapOffer',
  'ZswapOutput',
  'ZswapSecretKeys',
  'ZswapTransient',
  'addressFromKey',
  'coinCommitment',
  'communicationCommitment',
  'communicationCommitmentRandomness',
  'createCheckPayload',
  'createProvingPayload',
  'createShieldedCoinInfo',
  'feeToken',
  'nativeToken',
  'parseCheckResult',
  'partitionTranscripts',
  'sampleCoinPublicKey',
  'sampleContractAddress',
  'sampleDustSecretKey',
  'sampleEncryptionPublicKey',
  'sampleRawTokenType',
  'sampleSigningKey',
  'sampleUserAddress',
  'shieldedToken',
  'signatureVerifyingKey',
  'signingKeyFromBip340',
  'unshieldedToken'
].sort();

// Full glue-filtered vendor runtime surface (leak/ACL detector — repo rule:
// export surfaces are asserted with strict equality, not subset containment).
// wasm-bindgen glue (`__wbg_*` / `__wbindgen_*`, ~150 names at last count) is
// excluded because it churns across WASM rebuilds and would make this test
// flaky without protecting anything midnight-js relies on. This list is
// larger than OQ3_SURFACE_RUNTIME: the vendor exports runtime helpers
// (`decode*`/`encode*` codecs, dust/zswap internals, etc.) that OQ3_SURFACE
// never names because it captures only the consumed subset.
// If a vendor bump makes this assertion fail: AUDIT the diff (which names
// were added/removed/renamed) before touching this list — never blind-update
// it to whatever the new build happens to export.
const PINNED_FULL_RUNTIME_SURFACE = [
  'AuthorizedClaim',
  'Binding',
  'ChargedState',
  'ClaimRewardsTransaction',
  'CoinSecretKey',
  'ContractCall',
  'ContractCallPrototype',
  'ContractDeploy',
  'ContractMaintenanceAuthority',
  'ContractOperation',
  'ContractOperationVersion',
  'ContractOperationVersionedVerifierKey',
  'ContractState',
  'CostModel',
  'DustActions',
  'DustGenerationState',
  'DustLocalState',
  'DustLocalStateWithChanges',
  'DustParameters',
  'DustRegistration',
  'DustSecretKey',
  'DustSpend',
  'DustState',
  'DustStateChanges',
  'DustStateMerkleTreeCollapsedUpdate',
  'DustUtxoState',
  'EncryptionSecretKey',
  'Event',
  'Intent',
  'IntoUnderlyingByteSource',
  'IntoUnderlyingSink',
  'IntoUnderlyingSource',
  'LedgerParameters',
  'LedgerState',
  'MaintenanceUpdate',
  'MerkleTreeCollapsedUpdate',
  'NoBinding',
  'NoProof',
  'PreBinding',
  'PrePartitionContractCall',
  'PreProof',
  'PreTranscript',
  'Proof',
  'QueryContext',
  'QueryResults',
  'ReplaceAuthority',
  'SignatureEnabled',
  'SignatureErased',
  'StateBoundedMerkleTree',
  'StateMap',
  'StateValue',
  'SystemTransaction',
  'Transaction',
  'TransactionContext',
  'TransactionCostModel',
  'TransactionResult',
  'UnshieldedOffer',
  'UtxoMeta',
  'UtxoState',
  'VerifiedTransaction',
  'VerifierKeyInsert',
  'VerifierKeyRemove',
  'VmResults',
  'VmStack',
  'WellFormedStrictness',
  'ZswapChainState',
  'ZswapInput',
  'ZswapLocalState',
  'ZswapLocalStateWithChanges',
  'ZswapOffer',
  'ZswapOutput',
  'ZswapSecretKeys',
  'ZswapStateChanges',
  'ZswapTransient',
  'addressFromKey',
  'bigIntModFr',
  'bigIntToValue',
  'coinCommitment',
  'coinNullifier',
  'communicationCommitment',
  'communicationCommitmentRandomness',
  'createCheckPayload',
  'createCoinInfo',
  'createProvingPayload',
  'createProvingTransactionPayload',
  'createShieldedCoinInfo',
  'decodeCoinPublicKey',
  'decodeContractAddress',
  'decodeQualifiedShieldedCoinInfo',
  'decodeRawTokenType',
  'decodeShieldedCoinInfo',
  'decodeUserAddress',
  'degradeToTransient',
  'dummyContractAddress',
  'dummyUserAddress',
  'dustCommitment',
  'dustInitialNonce',
  'dustNonce',
  'dustNullifier',
  'ecAdd',
  'ecMul',
  'ecMulGenerator',
  'encodeCoinPublicKey',
  'encodeContractAddress',
  'encodeQualifiedShieldedCoinInfo',
  'encodeRawTokenType',
  'encodeShieldedCoinInfo',
  'encodeUserAddress',
  'entryPointHash',
  'feeToken',
  'hashToCurve',
  'leafHash',
  'maxAlignedSize',
  'maxField',
  'nativeToken',
  'parseCheckResult',
  'partitionTranscripts',
  'persistentCommit',
  'persistentHash',
  'proofDataIntoSerializedPreimage',
  'rawTokenType',
  'runProgram',
  'runtimeCoinCommitment',
  'runtimeCoinNullifier',
  'sampleCoinPublicKey',
  'sampleContractAddress',
  'sampleDustSecretKey',
  'sampleEncryptionPublicKey',
  'sampleIntentHash',
  'sampleRawTokenType',
  'sampleSigningKey',
  'sampleUserAddress',
  'shieldedToken',
  'signData',
  'signatureVerifyingKey',
  'signingKeyFromBip340',
  'transientCommit',
  'transientHash',
  'unshieldedToken',
  'updatedValue',
  'upgradeFromTransient',
  'valueToBigInt',
  'verifySignature'
].sort();

const GLUE_PATTERN = /^__wbg_|^__wbindgen_/;

const SRC_ROOT = resolve(__dirname, '..');
// The v8 module as its siblings under src/ address it: any number of path
// segments up, always with the `.js` extension the ESM build resolves. Built
// from parts so this file's own literal cannot trip the scan below.
const V8_MODULE_SPECIFIER = new RegExp(`['"\`](?:\\.{1,2}/)+${['v8', 'js'].join('\\.')}['"\`]`);
// Type-only imports are erased before anything runs, so they are not runtime
// references — v8's types are free to be named anywhere. Comments go too, so
// that prose naming the module does not count as reaching for it.
const TYPE_ONLY_IMPORT = /import\s+type\s[^;]*?from\s*['"`][^'"`]+['"`];?/g;
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

const runtimeCodeOf = (source: string): string => source.replace(COMMENT, '').replace(TYPE_ONLY_IMPORT, '');

const collectTsFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? collectTsFiles(fullPath) : entry.name.endsWith('.ts') ? [fullPath] : [];
  });

// loadLedger8 imports the v8 module by relative specifier, so these run
// against the sources and need no prior `yarn build` — the built artifacts are
// gated separately in dist-laziness.test.ts.
describe('loadLedger8', () => {
  it('exposes exactly the pinned glue-filtered runtime surface (assertion A: leak/ACL detector)', async () => {
    const surface = await loadLedger8();
    const actualRuntimeKeysFiltered = Object.keys(surface)
      .filter((key) => !GLUE_PATTERN.test(key))
      .sort();

    expect(actualRuntimeKeysFiltered).toEqual(PINNED_FULL_RUNTIME_SURFACE);
  });

  it('exposes every runtime-visible OQ3_SURFACE member (assertion B: consumption contract)', async () => {
    const surface = await loadLedger8();
    const actualKeys = new Set(Object.keys(surface));
    const missingFromSurface = OQ3_SURFACE_RUNTIME.filter((key) => !actualKeys.has(key));

    expect(missingFromSurface).toEqual([]);
  });

  it('memoises the module promise across calls', async () => {
    const first = loadLedger8();
    const second = loadLedger8();
    expect(second).toBe(first);
    await expect(first).resolves.toBeDefined();
  });
});

describe('sole runtime reference to the v8 module', () => {
  it('is imported at runtime only from lib/v8/load.ts within src/', () => {
    const filesImportingV8 = collectTsFiles(SRC_ROOT)
      .filter((file) => V8_MODULE_SPECIFIER.test(runtimeCodeOf(readFileSync(file, 'utf8'))))
      .map((file) => file.slice(SRC_ROOT.length + 1));

    expect(filesImportingV8).toEqual([join('lib', 'v8', 'load.ts')]);
  });
});

// The engine module as its siblings under src/ address it: any number of path
// segments up, always with the `.js` extension the ESM build resolves. Built
// from parts so this file's own literal cannot trip the scan below.
const ENGINE_MODULE_SPECIFIER = new RegExp(`['"\`](?:\\.{1,2}/)+${['engine', 'js'].join('\\.')}['"\`]`);

describe('sole runtime reference to the engine module', () => {
  it('is imported at runtime only from lib/v8/load-engine.ts within src/', () => {
    const filesImportingEngine = collectTsFiles(SRC_ROOT)
      .filter((file) => ENGINE_MODULE_SPECIFIER.test(runtimeCodeOf(readFileSync(file, 'utf8'))))
      .map((file) => file.slice(SRC_ROOT.length + 1));

    expect(filesImportingEngine).toEqual([join('lib', 'v8', 'load-engine.ts')]);
  });
});
