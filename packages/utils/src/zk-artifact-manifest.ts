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

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/** Directory (relative to a provider's base location) holding the manifest. */
export const ZK_MANIFEST_DIR = 'compiler';
/** File name of the `compactc`-emitted integrity manifest. */
export const ZK_MANIFEST_FILE_NAME = 'contract-manifest.json';

const SUPPORTED_MANIFEST_VERSION = '1';
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** How a provider reacts to a missing manifest. A digest mismatch always throws (except `off`). */
export type ZkArtifactIntegrityMode = 'require' | 'warn' | 'off';

/** Integrity options shared by both ZK config providers' constructor option bags. */
export interface ZkConfigIntegrityOptions {
  /**
   * Default `'require'` (fail-closed). Trust boundary: without {@link expectedManifestHash} the
   * manifest is loaded from the same base location as the artifacts, so `require`/`warn` detect
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
export class ZkArtifactIntegrityError extends Error {
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** Lowercase hex SHA-256 of the given bytes. */
export const computeSha256Hex = (bytes: Uint8Array): string => bytesToHex(sha256(bytes));

/**
 * Parses a `compactc` `contract-manifest.json`. Asserts `manifest-version === '1'`, flattens exactly
 * one directory level into `"<dir>/<fileName>"` keys (nested sub-directories are ignored), validates
 * each file entry, and throws {@link ZkArtifactIntegrityError} on any structural violation.
 */
export function parseZkArtifactManifest(rawJson: string): ZkArtifactManifest {
  let root: unknown;
  try {
    root = JSON.parse(rawJson);
  } catch (error) {
    throw new ZkArtifactIntegrityError('ZK artifact manifest is not valid JSON', { cause: error });
  }
  if (!isRecord(root)) {
    throw new ZkArtifactIntegrityError('ZK artifact manifest must be a JSON object');
  }
  if (root['manifest-version'] !== SUPPORTED_MANIFEST_VERSION) {
    throw new ZkArtifactIntegrityError(
      `Unsupported ZK artifact manifest-version: expected ${JSON.stringify(SUPPORTED_MANIFEST_VERSION)}, got ${JSON.stringify(root['manifest-version'])}`
    );
  }

  const files = new Map<string, ZkArtifactManifestFile>();
  for (const [dirName, dirValue] of Object.entries(root)) {
    if (!isRecord(dirValue) || dirValue.type !== 'directory') {
      continue;
    }
    for (const [childName, childValue] of Object.entries(dirValue)) {
      if (childName === 'type' || !isRecord(childValue) || childValue.type !== 'file') {
        continue; // ignore the `type` discriminator and nested sub-directories (depth > 1)
      }
      const key = `${dirName}/${childName}`;
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
 * - missing manifest/entry: `require` throws, `warn` warns and returns.
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
  const entry = manifest?.files.get(relativePath);
  if (entry === undefined) {
    const reason =
      manifest === undefined
        ? `no ZK artifact manifest (${ZK_MANIFEST_DIR}/${ZK_MANIFEST_FILE_NAME}) was found`
        : `ZK artifact manifest has no entry for "${relativePath}"`;
    if (mode === 'require') {
      throw new ZkArtifactIntegrityError(
        `${reason}; integrity verification is required. Recompile with a manifest-emitting compactc, ` +
          `or construct the provider with { verify: 'warn' } or { verify: 'off' } to opt out.`
      );
    }
    (params.onWarn ?? defaultOnWarn)(
      `midnight-js: ${reason}; skipping ZK artifact integrity verification for "${relativePath}"`
    );
    return;
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
