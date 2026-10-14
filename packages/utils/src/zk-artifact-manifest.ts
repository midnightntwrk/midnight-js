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

import { MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { UTILS_ERROR_CATEGORIES, UTILS_ERROR_CODES } from './error-codes';
import { isJsonObject } from './internal/json-object';

/** Directory (relative to a provider's base location) holding the manifest. */
export const ZK_MANIFEST_DIR = 'compiler';
/** File name of the `compactc`-emitted integrity manifest. */
export const ZK_MANIFEST_FILE_NAME = 'contract-manifest.json';

const SUPPORTED_MANIFEST_VERSION = '1';
const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * How a provider reacts to a manifest that does not cover an artifact. A digest mismatch always
 * throws (except `off`).
 *
 * - `require`: both a wholly absent manifest and a manifest without an entry for the artifact throw.
 * - `require-if-present`: a wholly absent manifest warns; a manifest that exists must cover the
 *   artifact, so a missing entry throws. `compactc` only began emitting the manifest in 0.33, so
 *   this is the mode for artifacts compiled by a toolchain that never produced one.
 * - `warn`: both cases warn.
 * - `off`: no verification at all.
 */
export type ZkArtifactIntegrityMode = 'require' | 'require-if-present' | 'warn' | 'off';

/** Integrity options shared by both ZK config providers' constructor option bags. */
export interface ZkConfigIntegrityOptions {
  /**
   * Default `'require'` (fail-closed). Trust boundary: without {@link expectedManifestHash} the
   * manifest is loaded from the same base location as the artifacts, so every verifying mode detects
   * corruption (partial deploy, truncation, a stale or wrong artifact set) but NOT an adversary who
   * can rewrite both the artifacts and the co-located manifest. Set {@link expectedManifestHash} to
   * defend against that coordinated substitution.
   */
  readonly verify?: ZkArtifactIntegrityMode;
  /**
   * SHA-256 hex of the manifest file's bytes, pinned by the application at build time. This is the
   * only mode that resists a coordinated swap of the artifacts and their co-located manifest: it
   * anchors the whole chain to a hash the application controls rather than one fetched alongside the
   * artifacts it certifies.
   */
  readonly expectedManifestHash?: string;
  /** Warning sink for `warn` mode. Default: `console.warn`. */
  readonly onWarn?: (message: string) => void;
}

/** Thrown when a ZK artifact (or the manifest itself) fails integrity verification. */
export class ZkArtifactIntegrityError extends MidnightJsError {
  readonly code = UTILS_ERROR_CODES.ZK_ARTIFACT_INTEGRITY_FAILED;
  readonly category = UTILS_ERROR_CATEGORIES[UTILS_ERROR_CODES.ZK_ARTIFACT_INTEGRITY_FAILED];

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ZkArtifactIntegrityError';
  }
}

/** A single file entry from the manifest. */
export interface ZkArtifactManifestFile {
  readonly size: number;
  readonly hash: string;
}

/** The parsed manifest: metadata plus files flattened to `"<dir>/<fileName>"` keys. */
export interface ZkArtifactManifest {
  readonly version: string;
  readonly compilerVersion?: string;
  readonly languageVersion?: string;
  readonly runtimeVersion?: string;
  readonly files: ReadonlyMap<string, ZkArtifactManifestFile>;
}

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** Lowercase hex SHA-256 of the given bytes. */
export const computeSha256Hex = (bytes: Uint8Array): string => bytesToHex(sha256(bytes));

/**
 * Scans raw JSON text for a duplicate object key, returning the first duplicated key it finds.
 *
 * `JSON.parse` silently collapses duplicate keys and keeps the last one, so a duplicate is
 * invisible in the parsed value: the only layer where the ambiguity is still visible is the raw
 * text. Keys are compared after JSON string decoding, so a key spelled with an escape (for
 * example `"cle\u0061r.verifier"`) still counts as a duplicate of its plain spelling. Strings
 * inside arrays and string values are never mistaken for keys, and braces inside a string value
 * are never mistaken for structure.
 *
 * Ported from compact-js's `ZKManifest` duplicate-key scan (midnightntwrk/midnight-sdk#277),
 * which fixed the same bug there; the two parsers must agree on the same manifest input.
 */
const findDuplicateKey = (json: string): string | undefined => {
  const stack: (Set<string> | null)[] = []; // Set → keys seen in an object frame; null → array frame
  let awaitingKey = false;
  const n = json.length;
  let i = 0;
  while (i < n) {
    const ch = json[i];
    switch (ch) {
      case '{':
        stack.push(new Set());
        awaitingKey = true;
        i++;
        break;
      case '[':
        stack.push(null);
        awaitingKey = false;
        i++;
        break;
      case '}':
      case ']':
        stack.pop();
        awaitingKey = false;
        i++;
        break;
      case ',':
        awaitingKey = stack[stack.length - 1] instanceof Set;
        i++;
        break;
      case ':':
        awaitingKey = false;
        i++;
        break;
      case '"': {
        // Find the closing quote, honouring backslash escapes so a `\"` (or a `{`/`}`) inside a string
        // value is never mistaken for structure.
        const start = i++;
        while (i < n && json[i] !== '"') {
          if (json[i] === '\\') i++; // skip the escaped character
          i++;
        }
        if (i >= n) return undefined; // unterminated string → let JSON.parse report it
        i++; // consume the closing quote
        const top = stack[stack.length - 1];
        if (awaitingKey && top instanceof Set) {
          let key: string;
          try {
            key = JSON.parse(json.slice(start, i)) as string; // decode escapes for a faithful compare
          } catch {
            return undefined;
          }
          if (top.has(key)) return key;
          top.add(key);
        }
        awaitingKey = false;
        break;
      }
      default:
        i++;
        break;
    }
  }
  return undefined;
};

/**
 * Parses a `compactc` `contract-manifest.json`. Asserts `manifest-version === '1'`, flattens exactly
 * one directory level into `"<dir>/<fileName>"` keys (nested sub-directories are ignored), validates
 * each file entry, and throws {@link ZkArtifactIntegrityError} on any structural violation. A
 * duplicate object key at any level also throws: `JSON.parse` would keep only the last occurrence,
 * so an ambiguous manifest could certify an artifact its reviewer never saw.
 */
export function parseZkArtifactManifest(rawJson: string): ZkArtifactManifest {
  // Reject duplicate keys before decoding: by the time `JSON.parse` returns, the duplicates have
  // already been merged and the honest entry a reviewer pinned has been silently replaced.
  const duplicateKey = findDuplicateKey(rawJson);
  if (duplicateKey !== undefined) {
    throw new ZkArtifactIntegrityError(
      `ZK artifact manifest contains a duplicate key "${duplicateKey}"; an ambiguous manifest cannot be trusted as an integrity check`
    );
  }
  let root: unknown;
  try {
    root = JSON.parse(rawJson);
  } catch (error) {
    throw new ZkArtifactIntegrityError('ZK artifact manifest is not valid JSON', { cause: error });
  }
  if (!isJsonObject(root)) {
    throw new ZkArtifactIntegrityError('ZK artifact manifest must be a JSON object');
  }
  if (root['manifest-version'] !== SUPPORTED_MANIFEST_VERSION) {
    throw new ZkArtifactIntegrityError(
      `Unsupported ZK artifact manifest-version: expected ${JSON.stringify(SUPPORTED_MANIFEST_VERSION)}, got ${JSON.stringify(root['manifest-version'])}`
    );
  }

  const files = new Map<string, ZkArtifactManifestFile>();
  for (const [dirName, dirValue] of Object.entries(root)) {
    if (!isJsonObject(dirValue) || dirValue.type !== 'directory') {
      continue;
    }
    for (const [childName, childValue] of Object.entries(dirValue)) {
      if (childName === 'type' || !isJsonObject(childValue) || childValue.type !== 'file') {
        continue; // ignore the `type` discriminator and nested sub-directories (depth > 1)
      }
      const key = `${dirName}/${childName}`;
      // Unreachable while duplicate raw keys are rejected above (each directory name and each
      // child name within it is unique in the parsed object); kept as a defensive check in case
      // the flattening ever changes.
      if (files.has(key)) {
        throw new ZkArtifactIntegrityError(`Duplicate entry "${key}" in ZK artifact manifest`);
      }
      const { size } = childValue;
      const hash = typeof childValue.hash === 'string' ? childValue.hash.toLowerCase() : undefined;
      if (typeof size !== 'number' || !Number.isInteger(size) || size < 0) {
        throw new ZkArtifactIntegrityError(`ZK artifact manifest entry "${key}" has an invalid size`);
      }
      if (hash === undefined || !SHA256_HEX.test(hash)) {
        throw new ZkArtifactIntegrityError(`ZK artifact manifest entry "${key}" has an invalid sha-256 hash`);
      }
      files.set(key, { size, hash });
    }
  }

  return {
    version: SUPPORTED_MANIFEST_VERSION,
    compilerVersion: asOptionalString(root['compiler-version']),
    languageVersion: asOptionalString(root['language-version']),
    runtimeVersion: asOptionalString(root['runtime-version']),
    files
  };
}

/** Verifies raw manifest bytes against a build-time pin. Throws on mismatch. */
export function assertManifestHash(rawBytes: Uint8Array, expectedHash: string): void {
  const actual = computeSha256Hex(rawBytes);
  const expected = expectedHash.toLowerCase();
  if (actual !== expected) {
    throw new ZkArtifactIntegrityError(
      `ZK artifact manifest failed integrity verification: expected sha-256 ${expected}, got ${actual}`
    );
  }
}

const defaultOnWarn = (message: string): void => {
  console.warn(message);
};

/**
 * Verifies one artifact's bytes against the manifest entry for `relativePath`.
 * - `off`: no-op.
 * - no manifest at all: `require` throws, every other mode warns and returns.
 * - manifest present but no entry for the artifact: `require` and `require-if-present` throw,
 *   `warn` warns and returns.
 * - length or digest mismatch: always throws (except `off`). Length is checked first as a cheap
 *   pre-hash guard so a truncated artifact fails with a clear "expected N bytes" error.
 */
export function verifyZkArtifactIntegrity(params: {
  readonly manifest: ZkArtifactManifest | undefined;
  readonly relativePath: string;
  readonly bytes: Uint8Array;
  readonly mode: ZkArtifactIntegrityMode;
  readonly onWarn?: (message: string) => void;
}): void {
  const { manifest, relativePath, bytes, mode } = params;
  if (mode === 'off') {
    return;
  }
  if (manifest === undefined) {
    if (mode === 'require') {
      throw new ZkArtifactIntegrityError(
        `no ZK artifact manifest (${ZK_MANIFEST_DIR}/${ZK_MANIFEST_FILE_NAME}) was found; integrity ` +
          `verification is required. Recompile with a manifest-emitting compactc, or construct the ` +
          `provider with { verify: 'require-if-present' }, { verify: 'warn' } or { verify: 'off' } to ` +
          `opt out.`
      );
    }
    (params.onWarn ?? defaultOnWarn)(
      `midnight-js: no ZK artifact manifest (${ZK_MANIFEST_DIR}/${ZK_MANIFEST_FILE_NAME}) was found; ` +
        `skipping ZK artifact integrity verification for "${relativePath}"`
    );
    return;
  }
  const entry = manifest.files.get(relativePath);
  if (entry === undefined) {
    if (mode === 'warn') {
      (params.onWarn ?? defaultOnWarn)(
        `midnight-js: ZK artifact manifest has no entry for "${relativePath}"; skipping ZK artifact ` +
          `integrity verification for it`
      );
      return;
    }
    throw new ZkArtifactIntegrityError(
      `ZK artifact manifest has no entry for "${relativePath}"; integrity verification is required. ` +
        `The manifest does not certify this artifact, so the artifact set is stale or partial. ` +
        `Construct the provider with { verify: 'warn' } or { verify: 'off' } to opt out.`
    );
  }
  if (bytes.length !== entry.size) {
    throw new ZkArtifactIntegrityError(
      `ZK artifact "${relativePath}" failed integrity verification: expected ${entry.size} bytes, got ${bytes.length}`
    );
  }
  const actual = computeSha256Hex(bytes);
  if (actual !== entry.hash) {
    throw new ZkArtifactIntegrityError(
      `ZK artifact "${relativePath}" failed integrity verification: expected sha-256 ${entry.hash}, got ${actual}`
    );
  }
}
