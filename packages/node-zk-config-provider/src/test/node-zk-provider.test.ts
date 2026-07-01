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

import { computeSha256Hex, ZkArtifactIntegrityError } from '@midnight-ntwrk/midnight-js-utils';
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

// Builds a self-contained base dir: keys/, zkir/, and compiler/contract-manifest.json.
// `proverHashOverride` lets a test inject a wrong hash for the prover entry.
const buildBaseDir = async (proverHashOverride?: string): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-zk-it-'));
  await fs.mkdir(path.join(dir, 'keys'));
  await fs.mkdir(path.join(dir, 'zkir'));
  await fs.mkdir(path.join(dir, 'compiler'));
  const prover = await fs.readFile(`${resourceDir}/keys/set_topic.prover`);
  const verifier = await fs.readFile(`${resourceDir}/keys/set_topic.verifier`);
  const zkir = await fs.readFile(`${resourceDir}/zkir/set_topic.bzkir`);
  await fs.writeFile(path.join(dir, 'keys', 'set_topic.prover'), prover);
  await fs.writeFile(path.join(dir, 'keys', 'set_topic.verifier'), verifier);
  await fs.writeFile(path.join(dir, 'zkir', 'set_topic.bzkir'), zkir);
  const manifest = {
    'manifest-version': '1',
    keys: {
      type: 'directory',
      'set_topic.prover': { type: 'file', size: prover.length, hash: proverHashOverride ?? computeSha256Hex(prover) },
      'set_topic.verifier': { type: 'file', size: verifier.length, hash: computeSha256Hex(verifier) }
    },
    zkir: {
      type: 'directory',
      'set_topic.bzkir': { type: 'file', size: zkir.length, hash: computeSha256Hex(zkir) }
    }
  };
  await fs.writeFile(path.join(dir, 'compiler', 'contract-manifest.json'), JSON.stringify(manifest));
  return dir;
};

describe('Node ZK config Provider', () => {
  const PROVER_KEY_HASH = 'DnbPkv3mY0+nHwt3NGuaWlMRC+2QhtG+COdhjFd0xB8=';

  let manifestDir: string;
  beforeAll(async () => {
    manifestDir = await buildBaseDir();
  });

  test('reads prover key correctly', async () => {
    const proverKey = await new NodeZkConfigProvider(manifestDir).getProverKey('set_topic');
    expect(createHash(proverKey)).toEqual(PROVER_KEY_HASH);
  });

  const VERIFIER_KEY_HASH = 'sbTZdCx3Kz4RA5OUSaBg2+WZupNdCwd13XmQV9j4pd4=';

  test('reads verifier key correctly', async () => {
    const verifierKey = await new NodeZkConfigProvider(manifestDir).getVerifierKey('set_topic');
    expect(createHash(verifierKey)).toEqual(VERIFIER_KEY_HASH);
  });

  const ZKIR_HASH = 'CW4hEb7fRkPiS85+l0/kvN+6IbISWJycOrwW5Jn+AI0=';

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
      const dir = await buildBaseDir('d'.repeat(64));
      await expect(new NodeZkConfigProvider(dir).getProverKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
      await expect(new NodeZkConfigProvider(dir).getProverKey('set_topic')).rejects.toThrow(/keys\/set_topic\.prover/);
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
