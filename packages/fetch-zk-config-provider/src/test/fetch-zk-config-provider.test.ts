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
import { fetch } from 'cross-fetch';
import type { BinaryLike } from 'crypto';
import * as crypto from 'crypto';
import express from 'express';
import * as fs from 'fs/promises';
import type { Server } from 'http';
import { vi } from 'vitest';

import { FetchZkConfigProvider } from '../index';

const createHashHex = (binaryLike: BinaryLike): string => crypto.createHash('sha256').update(binaryLike).digest('hex');

describe('Fetch ZK config Provider', () => {
  const resourceDir = `${process.cwd()}/src/test/resources`;

  let server: Server;
  let serverURL: string;

  beforeAll(async () => {
    const proverKey = await fs.readFile(`${resourceDir}/keys/set_topic.prover`);
    const verifierKey = await fs.readFile(`${resourceDir}/keys/set_topic.verifier`);
    const zkir = await fs.readFile(`${resourceDir}/zkir/set_topic.bzkir`).then((buffer) => buffer.toString('utf-8'));
    const app = express();
    app.get('/keys/set_topic.prover', (_, res) => {
      res.send(proverKey);
    });
    app.get('/keys/set_topic.verifier', (_, res) => {
      res.send(verifierKey);
    });
    app.get('/zkir/set_topic.bzkir', (_, res) => {
      res.type('application/octet-stream').send(zkir);
    });
    const manifest = JSON.stringify({
      'manifest-version': '1',
      keys: {
        type: 'directory',
        'set_topic.prover': { type: 'file', size: proverKey.length, hash: computeSha256Hex(new Uint8Array(proverKey)) },
        'set_topic.verifier': {
          type: 'file',
          size: verifierKey.length,
          hash: computeSha256Hex(new Uint8Array(verifierKey))
        }
      },
      zkir: {
        type: 'directory',
        'set_topic.bzkir': {
          type: 'file',
          size: Buffer.byteLength(zkir),
          hash: computeSha256Hex(new Uint8Array(Buffer.from(zkir)))
        }
      }
    });
    app.get('/compiler/contract-manifest.json', (_, res) => {
      res.type('application/json').send(manifest);
    });
    server = app.listen();
    const serverAddress = server.address();
    if (serverAddress === null) {
      throw new Error('Expected server address to be defined');
    } else if (typeof serverAddress === 'object') {
      serverURL = `http://localhost:${serverAddress.port}`;
    }
  });

  afterAll(() => {
    server.close();
  });

  const createHash = (binaryLike: BinaryLike): string => {
    return crypto.createHash('sha256').update(binaryLike).digest().toString('base64');
  };

  const PROVER_KEY_HASH = 'DnbPkv3mY0+nHwt3NGuaWlMRC+2QhtG+COdhjFd0xB8=';

  test('reads prover key correctly', async () => {
    const proverKey = await new FetchZkConfigProvider(serverURL).getProverKey('set_topic');
    expect(createHash(proverKey)).toEqual(PROVER_KEY_HASH);
  });

  const VERIFIER_KEY_HASH = 'sbTZdCx3Kz4RA5OUSaBg2+WZupNdCwd13XmQV9j4pd4=';

  test('reads verifier key correctly', async () => {
    const verifierKey = await new FetchZkConfigProvider(serverURL).getVerifierKey('set_topic');
    expect(createHash(verifierKey)).toEqual(VERIFIER_KEY_HASH);
  });

  const ZKIR_HASH = 'o4RX/Cgm/+GLJwptMkkbsrYYhX0z9DpQCaF0eaOVMU0=';

  test('reads ZKIR correctly', async () => {
    const zkProvider = await new FetchZkConfigProvider(serverURL).getZKIR('set_topic');
    expect(createHash(zkProvider)).toEqual(ZKIR_HASH);
  });

  test('throws on invalid url', () => {
    expect(() => new FetchZkConfigProvider('ws://localhost:5000')).toThrow(/^Invalid protocol scheme: 'ws:'/);
  });

  describe('rejects unsafe circuitId before issuing the request', () => {
    const FETCH_NEVER = (() => {
      throw new Error('fetch must not be called for invalid circuitId');
    }) as unknown as typeof fetch;

    test.each([
      '..',
      '.',
      '../../etc/passwd',
      '/etc/passwd',
      'foo/bar',
      'foo\\bar',
      '%2e%2e%2fpasswd',
      '',
      'foo bar'
    ])('getProverKey rejects %s without calling fetch', async (circuitId) => {
      // Arrange
      const provider = new FetchZkConfigProvider(serverURL, { fetchFunc: FETCH_NEVER });
      const target = circuitId as unknown as 'set_topic';
      // Act + Assert
      await expect(provider.getProverKey(target)).rejects.toThrow(/Invalid circuitId/);
    });

    test('getVerifierKey rejects "../etc/passwd" without calling fetch', async () => {
      const provider = new FetchZkConfigProvider(serverURL, { fetchFunc: FETCH_NEVER });
      const target = '../etc/passwd' as unknown as 'set_topic';
      await expect(provider.getVerifierKey(target)).rejects.toThrow(/Invalid circuitId/);
    });

    test('getZKIR rejects ".." without calling fetch', async () => {
      const provider = new FetchZkConfigProvider(serverURL, { fetchFunc: FETCH_NEVER });
      const target = '..' as unknown as 'set_topic';
      await expect(provider.getZKIR(target)).rejects.toThrow(/Invalid circuitId/);
    });
  });

  describe('rejects HTML responses from SPA fallback', () => {
    let spaServer: Server;
    let spaServerURL: string;

    beforeAll(() => {
      const app = express();
      app.use((_, res) => {
        res.type('text/html').send('<html><body>SPA fallback</body></html>');
      });
      spaServer = app.listen();
      const addr = spaServer.address();
      if (addr === null) {
        throw new Error('Expected server address to be defined');
      } else if (typeof addr === 'object') {
        spaServerURL = `http://localhost:${addr.port}`;
      }
    });

    afterAll(() => {
      spaServer.close();
    });

    test('rejects HTML response when fetching prover key', async () => {
      const provider = new FetchZkConfigProvider(spaServerURL);
      await expect(provider.getProverKey('nonexistent')).rejects.toThrow(/text\/html/);
      await expect(provider.getProverKey('nonexistent')).rejects.toThrow(/nonexistent/);
    });

    test('rejects HTML response when fetching verifier key', async () => {
      const provider = new FetchZkConfigProvider(spaServerURL);
      await expect(provider.getVerifierKey('nonexistent')).rejects.toThrow(/text\/html/);
    });

    test('rejects HTML response when fetching ZKIR', async () => {
      const provider = new FetchZkConfigProvider(spaServerURL);
      await expect(provider.getZKIR('nonexistent')).rejects.toThrow(/text\/html/);
    });
  });

  describe('includes URL and status in error for failed requests', () => {
    let errorServer: Server;
    let errorServerURL: string;

    beforeAll(() => {
      const app = express();
      app.use((_, res) => {
        res.status(404).send('Not Found');
      });
      errorServer = app.listen();
      const addr = errorServer.address();
      if (addr === null) {
        throw new Error('Expected server address to be defined');
      } else if (typeof addr === 'object') {
        errorServerURL = `http://localhost:${addr.port}`;
      }
    });

    afterAll(() => {
      errorServer.close();
    });

    test('error includes URL and status code for non-ok response', async () => {
      const provider = new FetchZkConfigProvider(errorServerURL);
      await expect(provider.getProverKey('missing_circuit')).rejects.toThrow(/missing_circuit/);
      await expect(provider.getProverKey('missing_circuit')).rejects.toThrow(/404/);
    });
  });

  describe('ZK artifact integrity verification', () => {
    const realProver = () => fs.readFile(`${resourceDir}/keys/set_topic.prover`);

    it('verifies and resolves under the default (require) when the manifest matches', async () => {
      const proverKey = await new FetchZkConfigProvider(serverURL).getProverKey('set_topic');
      expect(proverKey.length).toBeGreaterThan(0);
    });

    it('rejects a tampered prover key (digest mismatch) and names the path and digests', async () => {
      const genuine = await realProver();
      const tampered = Buffer.from(genuine);
      tampered[tampered.length - 1] ^= 0xff;
      const goodHash = createHashHex(genuine);
      const app = express();
      app.get('/keys/set_topic.prover', (_, res) => res.send(tampered));
      app.get('/compiler/contract-manifest.json', (_, res) =>
        res.type('application/json').send(
          JSON.stringify({
            'manifest-version': '1',
            keys: { type: 'directory', 'set_topic.prover': { type: 'file', size: genuine.length, hash: goodHash } }
          })
        )
      );
      const tamperServer = app.listen();
      const addr = tamperServer.address();
      const url = typeof addr === 'object' && addr ? `http://localhost:${addr.port}` : '';
      try {
        await expect(new FetchZkConfigProvider(url).getProverKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
        await expect(new FetchZkConfigProvider(url).getProverKey('set_topic')).rejects.toThrow(/keys\/set_topic\.prover/);
        await expect(new FetchZkConfigProvider(url).getProverKey('set_topic')).rejects.toThrow(new RegExp(goodHash));
      } finally {
        tamperServer.close();
      }
    });

    it('rejects when the manifest is absent under the default (require)', async () => {
      // spaServer-style server with no manifest route and real-looking keys is overkill;
      // reuse the SPA-fallback server which 404s the manifest. Here: a server that serves the prover but no manifest.
      const app = express();
      app.get('/keys/set_topic.prover', async (_, res) => res.send(await realProver()));
      const noManifestServer = app.listen();
      const addr = noManifestServer.address();
      const url = typeof addr === 'object' && addr ? `http://localhost:${addr.port}` : '';
      try {
        await expect(new FetchZkConfigProvider(url).getProverKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
      } finally {
        noManifestServer.close();
      }
    });

    it('warns and resolves when the manifest is absent in warn mode', async () => {
      const app = express();
      app.get('/keys/set_topic.prover', async (_, res) => res.send(await realProver()));
      const noManifestServer = app.listen();
      const addr = noManifestServer.address();
      const url = typeof addr === 'object' && addr ? `http://localhost:${addr.port}` : '';
      const onWarn = vi.fn();
      try {
        const key = await new FetchZkConfigProvider(url, { verify: 'warn', onWarn }).getProverKey('set_topic');
        expect(key.length).toBeGreaterThan(0);
        expect(onWarn).toHaveBeenCalledOnce();
        expect(onWarn.mock.calls[0][0]).toMatch(/^midnight-js:.*set_topic\.prover/);
      } finally {
        noManifestServer.close();
      }
    });

    it('rejects when expectedManifestHash does not match the served manifest', async () => {
      await expect(
        new FetchZkConfigProvider(serverURL, { expectedManifestHash: 'b'.repeat(64) }).getProverKey('set_topic')
      ).rejects.toThrow(ZkArtifactIntegrityError);
    });

    it('rejects in warn mode when expectedManifestHash is set but the manifest is absent', async () => {
      const app = express();
      app.get('/keys/set_topic.prover', async (_, res) => res.send(await realProver()));
      const noManifestServer = app.listen();
      const addr = noManifestServer.address();
      const url = typeof addr === 'object' && addr ? `http://localhost:${addr.port}` : '';
      try {
        await expect(
          new FetchZkConfigProvider(url, { verify: 'warn', expectedManifestHash: 'b'.repeat(64) }).getProverKey(
            'set_topic'
          )
        ).rejects.toThrow(ZkArtifactIntegrityError);
      } finally {
        noManifestServer.close();
      }
    });

    it('fetches the manifest exactly once across concurrent getProverKey() calls', async () => {
      let manifestHits = 0;
      const counting: typeof fetch = (input, init) => {
        if (String(input).endsWith('/compiler/contract-manifest.json')) {
          manifestHits += 1;
        }
        return fetch(input, init);
      };
      const provider = new FetchZkConfigProvider(serverURL, { fetchFunc: counting });
      await Promise.all([provider.getProverKey('set_topic'), provider.getProverKey('set_topic')]);
      expect(manifestHits).toBe(1);
    });

    it('does not memoize a transient manifest failure (fetchFunc throws)', async () => {
      let manifestFetchAttempts = 0;
      // Fixture server: real prover key + manifest with a WRONG prover hash (triggers digest mismatch).
      const proverBytes = await realProver();
      const app = express();
      app.get('/keys/set_topic.prover', (_, res) => res.send(proverBytes));
      app.get('/compiler/contract-manifest.json', (_, res) => {
        res.type('application/json').send(
          JSON.stringify({
            'manifest-version': '1',
            keys: { type: 'directory', 'set_topic.prover': { type: 'file', size: proverBytes.length, hash: 'c'.repeat(64) } }
          })
        );
      });
      const flaky = app.listen();
      const addr = flaky.address();
      const url = typeof addr === 'object' && addr ? `http://localhost:${addr.port}` : '';

      // fetchFunc: throws on the first manifest request (simulates a transient network error);
      // delegates to real fetch for all subsequent requests.
      let firstManifestThrown = false;
      const flakyFetch: typeof fetch = (input, init) => {
        if (String(input).endsWith('/compiler/contract-manifest.json')) {
          manifestFetchAttempts += 1;
          if (!firstManifestThrown) {
            firstManifestThrown = true;
            return Promise.reject(new Error('transient network error'));
          }
        }
        return fetch(input, init);
      };

      const provider = new FetchZkConfigProvider(url, { fetchFunc: flakyFetch });
      try {
        // First call: fetchFunc throws on manifest → fetchManifest rejects → cache cleared → getProverKey rejects.
        await expect(provider.getProverKey('set_topic')).rejects.toThrow('transient network error');
        // Second call: manifest now fetched successfully (wrong hash) → digest mismatch error,
        // proving the cache was cleared and the manifest was re-fetched on retry.
        await expect(provider.getProverKey('set_topic')).rejects.toThrow(/failed integrity verification: expected sha-256/);
        // Manifest endpoint must have been attempted at least twice: once (thrown) + once (successful retry).
        expect(manifestFetchAttempts).toBeGreaterThanOrEqual(2);
      } finally {
        flaky.close();
      }
    });
  });
});
