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

import { describe, expect, it, vi } from 'vitest';

import {
  assertManifestHash,
  computeSha256Hex,
  parseZkArtifactManifest,
  verifyZkArtifactIntegrity,
  ZkArtifactIntegrityError
} from '../zk-artifact-manifest';

const BYTES = new Uint8Array([1, 2, 3]);
// sha-256 of bytes 0x01 0x02 0x03
const BYTES_SHA256 = '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81';
const OTHER_HASH = 'a'.repeat(64);

const manifestJson = (proverHash: string): string =>
  JSON.stringify({
    'manifest-version': '1',
    'compiler-version': '0.32.108',
    keys: {
      type: 'directory',
      'increment.prover': { type: 'file', size: 3, hash: proverHash }
    },
    zkir: {
      type: 'directory',
      'increment.bzkir': { type: 'file', size: 3, hash: BYTES_SHA256 },
      nested: { type: 'directory', 'deep.bzkir': { type: 'file', size: 3, hash: OTHER_HASH } }
    }
  });

describe('parseZkArtifactManifest', () => {
  it('flattens exactly one directory level into "dir/file" keys with their hashes', () => {
    const manifest = parseZkArtifactManifest(manifestJson(BYTES_SHA256));

    expect(manifest.version).toBe('1');
    expect(manifest.compilerVersion).toBe('0.32.108');
    expect([...manifest.files.keys()].sort()).toEqual(['keys/increment.prover', 'zkir/increment.bzkir'].sort());
    expect(manifest.files.get('keys/increment.prover')?.hash).toBe(BYTES_SHA256);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseZkArtifactManifest('{not json')).toThrow(ZkArtifactIntegrityError);
  });

  it('throws on an unsupported manifest-version', () => {
    expect(() => parseZkArtifactManifest(JSON.stringify({ 'manifest-version': '2' }))).toThrow(
      /manifest-version/
    );
  });

  it('throws on a non-hex or wrong-length hash', () => {
    const bad = JSON.stringify({
      'manifest-version': '1',
      keys: { type: 'directory', 'a.prover': { type: 'file', size: 1, hash: 'XYZ' } }
    });
    expect(() => parseZkArtifactManifest(bad)).toThrow(ZkArtifactIntegrityError);
  });

  // Note: a *duplicate flattened key* cannot arise from valid JSON (object keys are unique and each key is
  // prefixed by its top-level directory name, so sections cannot collide). The `files.has(key)` guard in the
  // parser is therefore defensive-only and is intentionally not exercised by a unit test — there is no valid
  // input that reaches it, and a contrived prototype-pollution input is out of scope.
});

describe('computeSha256Hex', () => {
  it('returns the lowercase hex sha-256 digest', () => {
    expect(computeSha256Hex(BYTES)).toBe(BYTES_SHA256);
  });

  it('hashes only the view of an offset array, not its backing buffer', () => {
    const backing = new Uint8Array(3 + BYTES.length);
    backing.set(BYTES, 3);
    const view = backing.subarray(3);

    expect(view.byteOffset).toBe(3);
    expect(computeSha256Hex(view)).toBe(BYTES_SHA256);
    expect(computeSha256Hex(new Uint8Array(view.buffer))).not.toBe(BYTES_SHA256);
  });
});

describe('verifyZkArtifactIntegrity', () => {
  const manifest = parseZkArtifactManifest(manifestJson(BYTES_SHA256));

  it('passes silently when the digest matches', () => {
    expect(() =>
      verifyZkArtifactIntegrity({ manifest, relativePath: 'zkir/increment.bzkir', bytes: BYTES, mode: 'require' })
    ).not.toThrow();
  });

  it('throws on a digest mismatch in warn mode', () => {
    const wrong = parseZkArtifactManifest(manifestJson(OTHER_HASH));
    expect(() =>
      verifyZkArtifactIntegrity({ manifest: wrong, relativePath: 'keys/increment.prover', bytes: BYTES, mode: 'warn' })
    ).toThrow(ZkArtifactIntegrityError);
  });

  it('throws on a digest mismatch in require mode', () => {
    const wrong = parseZkArtifactManifest(manifestJson(OTHER_HASH));
    expect(() =>
      verifyZkArtifactIntegrity({ manifest: wrong, relativePath: 'keys/increment.prover', bytes: BYTES, mode: 'require' })
    ).toThrow(ZkArtifactIntegrityError);
  });

  it('warns (does not throw) when the manifest is absent in warn mode', () => {
    const onWarn = vi.fn();
    verifyZkArtifactIntegrity({ manifest: undefined, relativePath: 'keys/increment.prover', bytes: BYTES, mode: 'warn', onWarn });
    expect(onWarn).toHaveBeenCalledOnce();
    expect(onWarn.mock.calls[0][0]).toMatch(/^midnight-js:/);
  });

  it('warns when the manifest is present but the entry is missing (treated as absent)', () => {
    const onWarn = vi.fn();
    verifyZkArtifactIntegrity({ manifest, relativePath: 'keys/missing.prover', bytes: BYTES, mode: 'warn', onWarn });
    expect(onWarn).toHaveBeenCalledOnce();
  });

  it('throws when the manifest is absent in require mode', () => {
    expect(() =>
      verifyZkArtifactIntegrity({ manifest: undefined, relativePath: 'keys/increment.prover', bytes: BYTES, mode: 'require' })
    ).toThrow(ZkArtifactIntegrityError);
  });

  it('names the opt-out hatches when it throws for a missing manifest in require mode', () => {
    expect(() =>
      verifyZkArtifactIntegrity({ manifest: undefined, relativePath: 'keys/increment.prover', bytes: BYTES, mode: 'require' })
    ).toThrow(/recompile with a manifest-emitting compactc.*verify: 'warn'.*verify: 'off'/is);
  });

  it('rejects an artifact whose length differs from the manifest size before hashing', () => {
    const wrongSize = parseZkArtifactManifest(
      JSON.stringify({
        'manifest-version': '1',
        keys: { type: 'directory', 'increment.prover': { type: 'file', size: BYTES.length + 1, hash: BYTES_SHA256 } }
      })
    );
    expect(() =>
      verifyZkArtifactIntegrity({ manifest: wrongSize, relativePath: 'keys/increment.prover', bytes: BYTES, mode: 'require' })
    ).toThrow(new RegExp(`expected ${BYTES.length + 1} bytes, got ${BYTES.length}`));
  });

  it('skips verification entirely in off mode (even on mismatch)', () => {
    const wrong = parseZkArtifactManifest(manifestJson(OTHER_HASH));
    expect(() =>
      verifyZkArtifactIntegrity({ manifest: wrong, relativePath: 'keys/increment.prover', bytes: BYTES, mode: 'off' })
    ).not.toThrow();
  });
});

describe('assertManifestHash', () => {
  it('throws when the manifest bytes do not match the pin', () => {
    expect(() => assertManifestHash(BYTES, OTHER_HASH)).toThrow(ZkArtifactIntegrityError);
  });

  it('passes when the manifest bytes match the pin (case-insensitive)', () => {
    expect(() => assertManifestHash(BYTES, BYTES_SHA256.toUpperCase())).not.toThrow();
  });
});
