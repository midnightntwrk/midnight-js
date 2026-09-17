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

import { computeSha256Hex, ZkArtifactContractInfoError, ZkArtifactIntegrityError } from '@midnight-ntwrk/midnight-js-utils';
import type { BinaryLike } from 'crypto';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { beforeAll, describe, expect, it, test, vi } from 'vitest';

import { NodeZkConfigProvider } from '../index';

const resourceDir = `${process.cwd()}/src/test/resources`;

const createHash = (binaryLike: BinaryLike): string => {
  return crypto.createHash('sha256').update(binaryLike).digest().toString('base64');
};

// Synthetic artifacts. Content is irrelevant to what these tests exercise (path handling, manifest
// verification, caching), so we avoid the real 7.3MB prover key: hashing it with pure-JS SHA-256
// under v8 coverage instrumentation crosses the default 5s vitest timeout on slow CI runners.
const SET_TOPIC_PROVER = Buffer.from('synthetic prover key artifact');
const SET_TOPIC_VERIFIER = Buffer.from('synthetic verifier key artifact');
const SET_TOPIC_ZKIR = Buffer.from('synthetic zkir artifact');

// Builds a self-contained base dir: keys/, zkir/, and compiler/contract-manifest.json.
// `hashOverrides` lets a test inject a wrong hash for individual manifest entries.
const buildBaseDir = async (
  hashOverrides: { prover?: string; verifier?: string; zkir?: string } = {}
): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-zk-it-'));
  await fs.mkdir(path.join(dir, 'keys'));
  await fs.mkdir(path.join(dir, 'zkir'));
  await fs.mkdir(path.join(dir, 'compiler'));
  await fs.writeFile(path.join(dir, 'keys', 'set_topic.prover'), SET_TOPIC_PROVER);
  await fs.writeFile(path.join(dir, 'keys', 'set_topic.verifier'), SET_TOPIC_VERIFIER);
  await fs.writeFile(path.join(dir, 'zkir', 'set_topic.bzkir'), SET_TOPIC_ZKIR);
  const manifest = {
    'manifest-version': '1',
    keys: {
      type: 'directory',
      'set_topic.prover': {
        type: 'file',
        size: SET_TOPIC_PROVER.length,
        hash: hashOverrides.prover ?? computeSha256Hex(SET_TOPIC_PROVER)
      },
      'set_topic.verifier': {
        type: 'file',
        size: SET_TOPIC_VERIFIER.length,
        hash: hashOverrides.verifier ?? computeSha256Hex(SET_TOPIC_VERIFIER)
      }
    },
    zkir: {
      type: 'directory',
      'set_topic.bzkir': {
        type: 'file',
        size: SET_TOPIC_ZKIR.length,
        hash: hashOverrides.zkir ?? computeSha256Hex(SET_TOPIC_ZKIR)
      }
    }
  };
  await fs.writeFile(path.join(dir, 'compiler', 'contract-manifest.json'), JSON.stringify(manifest));
  return dir;
};

describe('Node ZK config Provider', () => {
  const PROVER_KEY_HASH = createHash(SET_TOPIC_PROVER);

  let manifestDir: string;
  beforeAll(async () => {
    manifestDir = await buildBaseDir();
  });

  test('reads prover key correctly', async () => {
    const proverKey = await new NodeZkConfigProvider(manifestDir).getProverKey('set_topic');
    expect(createHash(proverKey)).toEqual(PROVER_KEY_HASH);
  });

  const VERIFIER_KEY_HASH = createHash(SET_TOPIC_VERIFIER);

  test('reads verifier key correctly', async () => {
    const verifierKey = await new NodeZkConfigProvider(manifestDir).getVerifierKey('set_topic');
    expect(createHash(verifierKey)).toEqual(VERIFIER_KEY_HASH);
  });

  const ZKIR_HASH = createHash(SET_TOPIC_ZKIR);

  test('reads ZKIR correctly', async () => {
    const zkProvider = await new NodeZkConfigProvider(manifestDir).getZKIR('set_topic');
    expect(createHash(zkProvider)).toEqual(ZKIR_HASH);
  });

  test('throws on relative path', async () => {
    await expect(async () => new NodeZkConfigProvider('.', { verify: 'off' }).getVerifierKey('set_topic')).rejects.toThrowError(
      /ENOENT: no such file or directory, open '.*keys\/set_topic\.verifier'/
    );
  });

  describe('rejects unsafe circuitId', () => {
    const provider = new NodeZkConfigProvider(resourceDir, { verify: 'off' });

    test.each([
      '..',
      '.',
      '../../etc/passwd',
      '../keys/set_topic',
      '/absolute/path',
      'foo/bar',
      'foo\\bar',
      '',
      'foo bar'
    ])('getProverKey rejects %s', async (circuitId) => {
      // Arrange
      const target = circuitId as unknown as 'set_topic';
      // Act + Assert
      await expect(provider.getProverKey(target)).rejects.toThrow(/Invalid circuitId/);
    });

    test('getVerifierKey rejects "../etc/passwd"', async () => {
      const target = '../etc/passwd' as unknown as 'set_topic';
      await expect(provider.getVerifierKey(target)).rejects.toThrow(/Invalid circuitId/);
    });

    test('getZKIR rejects ".."', async () => {
      const target = '..' as unknown as 'set_topic';
      await expect(provider.getZKIR(target)).rejects.toThrow(/Invalid circuitId/);
    });
  });

  describe('accepts unusual but safe circuitId names', () => {
    const provider = new NodeZkConfigProvider(resourceDir, { verify: 'off' });

    test.each([
      '..foo',
      '..foo..',
      'foo..bar',
      '...'
    ])('getProverKey lets %s reach the filesystem (no false-positive containment reject)', async (circuitId) => {
      const target = circuitId as unknown as 'set_topic';
      await expect(provider.getProverKey(target)).rejects.toThrow(/ENOENT/);
    });
  });

  describe('ZK artifact integrity verification', () => {
    it('verifies and resolves under the default (require) when the manifest matches', async () => {
      const dir = await buildBaseDir();
      const proverKey = await new NodeZkConfigProvider(dir).getProverKey('set_topic');
      expect(proverKey.length).toBeGreaterThan(0);
    });

    it('rejects a tampered prover key (manifest hash wrong) and names the path', async () => {
      const dir = await buildBaseDir({ prover: 'd'.repeat(64) });
      await expect(new NodeZkConfigProvider(dir).getProverKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
      await expect(new NodeZkConfigProvider(dir).getProverKey('set_topic')).rejects.toThrow(/keys\/set_topic\.prover/);
    });

    it('rejects a tampered verifier key and names the path', async () => {
      const dir = await buildBaseDir({ verifier: 'd'.repeat(64) });
      await expect(new NodeZkConfigProvider(dir).getVerifierKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
      await expect(new NodeZkConfigProvider(dir).getVerifierKey('set_topic')).rejects.toThrow(
        /keys\/set_topic\.verifier/
      );
    });

    it('rejects a tampered ZKIR and names the path', async () => {
      const dir = await buildBaseDir({ zkir: 'd'.repeat(64) });
      await expect(new NodeZkConfigProvider(dir).getZKIR('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
      await expect(new NodeZkConfigProvider(dir).getZKIR('set_topic')).rejects.toThrow(/zkir\/set_topic\.bzkir/);
    });

    it('get() assembles all three artifacts through the verified getters', async () => {
      const config = await new NodeZkConfigProvider(manifestDir).get('set_topic');
      expect(config.circuitId).toBe('set_topic');
      expect(createHash(config.proverKey)).toEqual(PROVER_KEY_HASH);
      expect(createHash(config.verifierKey)).toEqual(VERIFIER_KEY_HASH);
      expect(createHash(config.zkir)).toEqual(ZKIR_HASH);
    });

    it('get() rejects when any single artifact fails verification', async () => {
      const dir = await buildBaseDir({ verifier: 'd'.repeat(64) });
      await expect(new NodeZkConfigProvider(dir).get('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
    });

    it('getVerifierKeys() returns verified [circuitId, key] pairs', async () => {
      const pairs = await new NodeZkConfigProvider(manifestDir).getVerifierKeys(['set_topic']);
      expect(pairs).toHaveLength(1);
      expect(pairs[0][0]).toBe('set_topic');
      expect(createHash(pairs[0][1])).toEqual(VERIFIER_KEY_HASH);
    });

    it('reads the manifest once per provider instance (later deletion goes unnoticed)', async () => {
      const dir = await buildBaseDir();
      const provider = new NodeZkConfigProvider(dir);
      await provider.getProverKey('set_topic');
      await fs.rm(path.join(dir, 'compiler', 'contract-manifest.json'));
      // Cached manifest still in effect for this instance...
      const key = await provider.getProverKey('set_topic');
      expect(key.length).toBeGreaterThan(0);
      // ...while a fresh instance sees the deletion and fails closed, proving the cache did the work.
      await expect(new NodeZkConfigProvider(dir).getProverKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
    });

    it('rethrows non-ENOENT manifest read errors and does not memoize them', async () => {
      const dir = await buildBaseDir();
      const manifestPath = path.join(dir, 'compiler', 'contract-manifest.json');
      // Replace the manifest file with a directory: fs.readFile fails with EISDIR, which must
      // surface as-is (only ENOENT means "absent") and must not be cached as a permanent failure.
      const manifestBytes = await fs.readFile(manifestPath);
      await fs.rm(manifestPath);
      await fs.mkdir(manifestPath);
      const provider = new NodeZkConfigProvider(dir);
      await expect(provider.getProverKey('set_topic')).rejects.toThrow(/EISDIR/);
      // Restore the manifest; the same instance recovers, proving the failure was not memoized.
      await fs.rmdir(manifestPath);
      await fs.writeFile(manifestPath, manifestBytes);
      const key = await provider.getProverKey('set_topic');
      expect(key.length).toBeGreaterThan(0);
    });

    it('rejects when the manifest is absent under the default (require) and names the opt-out hatches', async () => {
      // resourceDir has keys/ and zkir/ but no compiler/contract-manifest.json
      await expect(new NodeZkConfigProvider(resourceDir).getProverKey('set_topic')).rejects.toThrow(
        ZkArtifactIntegrityError
      );
      await expect(new NodeZkConfigProvider(resourceDir).getProverKey('set_topic')).rejects.toThrow(
        /recompile with a manifest-emitting compactc.*verify: 'warn'.*verify: 'off'/is
      );
    });

    it('warns and resolves when the manifest is absent in require-if-present mode', async () => {
      const onWarn = vi.fn();
      const key = await new NodeZkConfigProvider(resourceDir, { verify: 'require-if-present', onWarn }).getProverKey(
        'set_topic'
      );
      expect(key.length).toBeGreaterThan(0);
      expect(onWarn).toHaveBeenCalledOnce();
      expect(onWarn.mock.calls[0][0]).toMatch(/^midnight-js:.*set_topic\.prover/);
    });

    it('rejects in require-if-present mode when a present manifest has no entry for the artifact', async () => {
      const onWarn = vi.fn();
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-zk-partial-rip-'));
      await fs.mkdir(path.join(dir, 'keys'));
      await fs.mkdir(path.join(dir, 'compiler'));
      await fs.writeFile(
        path.join(dir, 'keys', 'set_topic.prover'),
        await fs.readFile(`${resourceDir}/keys/set_topic.prover`)
      );
      await fs.writeFile(
        path.join(dir, 'compiler', 'contract-manifest.json'),
        JSON.stringify({
          'manifest-version': '1',
          keys: { type: 'directory', 'other.prover': { type: 'file', size: 1, hash: 'f'.repeat(64) } }
        })
      );

      await expect(
        new NodeZkConfigProvider(dir, { verify: 'require-if-present', onWarn }).getProverKey('set_topic')
      ).rejects.toThrow(ZkArtifactIntegrityError);
      expect(onWarn).not.toHaveBeenCalled();
    });

    it('warns and resolves when the manifest is absent in warn mode', async () => {
      const onWarn = vi.fn();
      const key = await new NodeZkConfigProvider(resourceDir, { verify: 'warn', onWarn }).getProverKey('set_topic');
      expect(key.length).toBeGreaterThan(0);
      expect(onWarn).toHaveBeenCalledOnce();
      expect(onWarn.mock.calls[0][0]).toMatch(/^midnight-js:.*set_topic\.prover/);
    });

    it('resolves when the manifest is absent in off mode', async () => {
      const key = await new NodeZkConfigProvider(resourceDir, { verify: 'off' }).getProverKey('set_topic');
      expect(key.length).toBeGreaterThan(0);
    });

    it('rejects when expectedManifestHash does not match', async () => {
      const dir = await buildBaseDir();
      await expect(
        new NodeZkConfigProvider(dir, { expectedManifestHash: 'e'.repeat(64) }).getProverKey('set_topic')
      ).rejects.toThrow(ZkArtifactIntegrityError);
    });

    it('rejects in warn mode when expectedManifestHash is set but the manifest is absent', async () => {
      await expect(
        new NodeZkConfigProvider(resourceDir, { verify: 'warn', expectedManifestHash: 'e'.repeat(64) }).getProverKey('set_topic')
      ).rejects.toThrow(ZkArtifactIntegrityError);
    });

    it('treats a present manifest missing the requested entry as absent (require throws)', async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-zk-partial-'));
      await fs.mkdir(path.join(dir, 'keys'));
      await fs.mkdir(path.join(dir, 'compiler'));
      await fs.writeFile(
        path.join(dir, 'keys', 'set_topic.prover'),
        await fs.readFile(`${resourceDir}/keys/set_topic.prover`)
      );
      await fs.writeFile(
        path.join(dir, 'compiler', 'contract-manifest.json'),
        JSON.stringify({ 'manifest-version': '1', keys: { type: 'directory', 'other.prover': { type: 'file', size: 1, hash: 'f'.repeat(64) } } })
      );
      await expect(new NodeZkConfigProvider(dir).getProverKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
    });

    it('verifies a small pool-eligible artifact read as a Buffer (nonzero byteOffset)', async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-zk-small-'));
      await fs.mkdir(path.join(dir, 'keys'));
      await fs.mkdir(path.join(dir, 'compiler'));
      const small = Buffer.from('integrity-small-artifact');
      await fs.writeFile(path.join(dir, 'keys', 'tiny.prover'), small);
      await fs.writeFile(
        path.join(dir, 'compiler', 'contract-manifest.json'),
        JSON.stringify({ 'manifest-version': '1', keys: { type: 'directory', 'tiny.prover': { type: 'file', size: small.length, hash: computeSha256Hex(small) } } })
      );
      const key = await new NodeZkConfigProvider(dir).getProverKey('tiny' as 'set_topic');
      expect(key.length).toBe(small.length);
      // Deterministically prove offset handling: a nonzero-byteOffset view must hash its slice,
      // not the whole backing buffer (the mis-hash a naive `new Uint8Array(buf.buffer)` would produce).
      const backing = new Uint8Array(3 + small.length);
      backing.set(small, 3);
      const offsetView = backing.subarray(3);
      expect(offsetView.byteOffset).toBe(3);
      expect(computeSha256Hex(offsetView)).toBe(computeSha256Hex(small));
      expect(computeSha256Hex(new Uint8Array(offsetView.buffer))).not.toBe(computeSha256Hex(offsetView));
    });
  });
});

describe('NodeZkConfigProvider.getArtifactRuntimeVersion', () => {
  // A bundle carrying only what this member reads: the compiler's own description of the artifact
  // set. `contract-info.json` is emitted by every compactc, including the retained toolchain that
  // emits no integrity manifest, which is why the era is read from it rather than from the manifest.
  // A bundle with NO integrity manifest is the retained (pre-compactc-0.33) case, so every provider
  // over one is constructed with the mode the manifest documentation names for exactly that:
  // `require-if-present`. Under the default `require` the absence is itself a refusal, which is
  // asserted separately below.
  const RETAINED_BUNDLE_OPTIONS = { verify: 'require-if-present' } as const;

  const buildInfoDir = async (contractInfo?: string): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-zk-info-'));
    await fs.mkdir(path.join(dir, 'keys'));
    await fs.mkdir(path.join(dir, 'zkir'));
    if (contractInfo !== undefined) {
      await fs.mkdir(path.join(dir, 'compiler'));
      await fs.writeFile(path.join(dir, 'compiler', 'contract-info.json'), contractInfo);
    }
    return dir;
  };

  it('reports the runtime version the compiler recorded', async () => {
    // Arrange
    const dir = await buildInfoDir(JSON.stringify({ 'compiler-version': '0.31.1', 'runtime-version': '0.16.0' }));
    const provider = new NodeZkConfigProvider(dir, RETAINED_BUNDLE_OPTIONS);

    // Act
    const runtimeVersion = await provider.getArtifactRuntimeVersion();

    // Assert
    expect(runtimeVersion).toBe('0.16.0');
  });

  it('refuses a bundle that ships no compiler description, naming the file it looked for', async () => {
    const provider = new NodeZkConfigProvider(await buildInfoDir(), RETAINED_BUNDLE_OPTIONS);

    await expect(provider.getArtifactRuntimeVersion()).rejects.toThrow(ZkArtifactContractInfoError);
    await expect(provider.getArtifactRuntimeVersion()).rejects.toThrow(/contract-info\.json/);
  });

  it('refuses a compiler description that is not readable as one', async () => {
    const provider = new NodeZkConfigProvider(await buildInfoDir('<!doctype html>'), RETAINED_BUNDLE_OPTIONS);

    await expect(provider.getArtifactRuntimeVersion()).rejects.toThrow(ZkArtifactContractInfoError);
  });

  it('takes the runtime version from the INTEGRITY MANIFEST when there is one', async () => {
    // The manifest is the only file in the bundle an application can anchor to a hash it controls
    // (`expectedManifestHash`). Where it declares the version, reading it from anywhere else would
    // let whoever serves the artifacts decide which ledger pipeline runs.
    const dir = await buildInfoDir(JSON.stringify({ 'runtime-version': '0.16.0' }));
    await fs.writeFile(
      path.join(dir, 'compiler', 'contract-manifest.json'),
      JSON.stringify({ 'manifest-version': '1', 'runtime-version': '0.19.0' })
    );
    const provider = new NodeZkConfigProvider(dir, RETAINED_BUNDLE_OPTIONS);

    await expect(provider.getArtifactRuntimeVersion()).resolves.toBe('0.19.0');
  });

  it('refuses a contract description the manifest does not vouch for', async () => {
    // A manifest that covers the file but does not declare the version itself: the description is
    // read, and it has to survive the same integrity gate every key and ZKIR passes.
    const contractInfo = JSON.stringify({ 'runtime-version': '0.16.0' });
    const dir = await buildInfoDir(contractInfo);
    await fs.writeFile(
      path.join(dir, 'compiler', 'contract-manifest.json'),
      JSON.stringify({
        'manifest-version': '1',
        compiler: {
          type: 'directory',
          'contract-info.json': { type: 'file', size: contractInfo.length, hash: '00'.repeat(32) }
        }
      })
    );
    const provider = new NodeZkConfigProvider(dir);

    await expect(provider.getArtifactRuntimeVersion()).rejects.toThrow(ZkArtifactIntegrityError);
  });

  it('refuses to read an unvouched-for description at all under the default require mode', async () => {
    // Consistent with every other artifact this provider serves: with verification required and no
    // manifest present, nothing is trusted -- including the file that decides the ledger era.
    const provider = new NodeZkConfigProvider(await buildInfoDir(JSON.stringify({ 'runtime-version': '0.16.0' })));

    await expect(provider.getArtifactRuntimeVersion()).rejects.toThrow(ZkArtifactIntegrityError);
  });

  it('propagates a read failure that is not a missing file, unwrapped', async () => {
    // Only ABSENCE is translated into an era refusal. Anything else -- a permissions fault, a
    // directory where the file belongs -- is a fault in the caller's environment and is reported as
    // itself, so it is not mistaken for an artifact set that declares nothing.
    const dir = await buildInfoDir();
    await fs.mkdir(path.join(dir, 'compiler'));
    await fs.mkdir(path.join(dir, 'compiler', 'contract-info.json'));
    const provider = new NodeZkConfigProvider(dir, RETAINED_BUNDLE_OPTIONS);

    // Asserted POSITIVELY: `not.toBeInstanceOf` alone would pass for any unrelated fault, including
    // one that never reached the file at all, so it would not test what this test is named for.
    await expect(provider.getArtifactRuntimeVersion()).rejects.toMatchObject({ code: 'EISDIR' });
    await expect(provider.getArtifactRuntimeVersion()).rejects.not.toBeInstanceOf(ZkArtifactContractInfoError);
  });

  it('reads the description once and answers later calls from that reading', async () => {
    // Arrange: a bundle that answers, then loses the file underneath the provider.
    const dir = await buildInfoDir(JSON.stringify({ 'runtime-version': '0.16.0' }));
    const provider = new NodeZkConfigProvider(dir, RETAINED_BUNDLE_OPTIONS);
    await provider.getArtifactRuntimeVersion();
    await fs.rm(path.join(dir, 'compiler', 'contract-info.json'));

    // Act + Assert: a second read would now fail, so answering proves the first was retained.
    await expect(provider.getArtifactRuntimeVersion()).resolves.toBe('0.16.0');
  });

  it('retries after a failed read rather than caching the failure', async () => {
    const dir = await buildInfoDir();
    const provider = new NodeZkConfigProvider(dir, RETAINED_BUNDLE_OPTIONS);
    await expect(provider.getArtifactRuntimeVersion()).rejects.toThrow(ZkArtifactContractInfoError);

    await fs.mkdir(path.join(dir, 'compiler'));
    await fs.writeFile(path.join(dir, 'compiler', 'contract-info.json'), JSON.stringify({ 'runtime-version': '0.16.0' }));

    await expect(provider.getArtifactRuntimeVersion()).resolves.toBe('0.16.0');
  });
});
