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

import type { ProverKey, VerifierKey, ZKIR } from '@midnight-ntwrk/midnight-js-types';
import {
  createProverKey,
  createVerifierKey,
  createZKIR,
  InvalidProtocolSchemeError,
  ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import {
  assertManifestHash,
  assertSafeName,
  parseZkArtifactManifest,
  verifyZkArtifactIntegrity,
  ZK_MANIFEST_DIR,
  ZK_MANIFEST_FILE_NAME,
  ZkArtifactIntegrityError,
  type ZkArtifactManifest,
  type ZkConfigIntegrityOptions
} from '@midnight-ntwrk/midnight-js-utils';
import { fetch } from 'cross-fetch';

const KEY_PATH = 'keys';
const PROVER_EXT = '.prover';
const VERIFIER_EXT = '.verifier';
const ZKIR_PATH = 'zkir';
const ZKIR_EXT = '.bzkir';

/** Options for {@link FetchZkConfigProvider}. Carries the optional custom fetch alongside integrity options. */
export type FetchZkConfigProviderOptions = ZkConfigIntegrityOptions & { readonly fetchFunc?: typeof fetch };

/**
 * Retrieves ZK artifacts from a remote source and verifies them against the `compactc` integrity manifest.
 */
export class FetchZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  private readonly fetchFunc: typeof fetch;
  private readonly integrityOptions: FetchZkConfigProviderOptions;
  private manifestPromise?: Promise<ZkArtifactManifest | undefined>;

  /**
   * @param baseURL The endpoint to query for ZK artifacts.
   * @param options Custom fetch and integrity-verification options.
   */
  constructor(
    public readonly baseURL: string,
    options: FetchZkConfigProviderOptions = {}
  ) {
    super();
    const urlObject = new URL(baseURL);
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      throw new InvalidProtocolSchemeError(urlObject.protocol, ['http:', 'https:']);
    }
    this.fetchFunc = options.fetchFunc ?? fetch;
    this.integrityOptions = options;
  }

  private get base(): string {
    return this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`;
  }

  // Detects an SPA/CDN fallback page served in place of a missing file. Keyed on content-type:
  // a real manifest served with a wrong `text/html` type is treated as absent (fail-closed under
  // `require`), which is safe — it errs toward rejecting rather than trusting an unverified artifact.
  private static isHtmlFallback(response: Response): boolean {
    return (response.headers.get('content-type') ?? '').includes('text/html');
  }

  private async sendRequest<T extends 'text' | 'arraybuffer'>(
    url: typeof KEY_PATH | typeof ZKIR_PATH,
    circuitId: K,
    ext: typeof ZKIR_EXT | typeof PROVER_EXT | typeof VERIFIER_EXT,
    responseType: T
  ): Promise<T extends 'text' ? string : Uint8Array> {
    assertSafeName(circuitId, 'circuitId');
    const fullUrl = new URL(`${url}/${encodeURIComponent(circuitId)}${ext}`, this.base).toString();
    const response = await this.fetchFunc(fullUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to fetch ZK artifact from ${fullUrl}: ${response.status} ${response.statusText}`);
    }
    if (FetchZkConfigProvider.isHtmlFallback(response)) {
      throw new Error(
        `Expected ZK artifact, but received text/html from ${fullUrl}. This usually means the file does not exist and the server returned an SPA fallback page.`
      );
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return responseType === 'text'
      ? ((await response.text()) as any)
      : ((await response.arrayBuffer().then((arrayBuffer) => new Uint8Array(arrayBuffer))) as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  private loadManifest(): Promise<ZkArtifactManifest | undefined> {
    if (this.manifestPromise === undefined) {
      const promise = this.fetchManifest();
      this.manifestPromise = promise;
      // Do not memoize a failed load (e.g. a transient network error where fetchFunc throws):
      // clear so a later call retries. A resolved `undefined` (manifest absent) IS cached.
      promise.catch(() => {
        if (this.manifestPromise === promise) {
          this.manifestPromise = undefined;
        }
      });
    }
    return this.manifestPromise;
  }

  private async fetchManifest(): Promise<ZkArtifactManifest | undefined> {
    const url = new URL(`${ZK_MANIFEST_DIR}/${ZK_MANIFEST_FILE_NAME}`, this.base).toString();
    const { expectedManifestHash } = this.integrityOptions;
    const response = await this.fetchFunc(url, { method: 'GET' });
    if (!response.ok || FetchZkConfigProvider.isHtmlFallback(response)) {
      if (expectedManifestHash !== undefined) {
        throw new ZkArtifactIntegrityError(
          `Expected ZK artifact manifest at ${url} but it was not available (status ${response.status})`
        );
      }
      return undefined;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (expectedManifestHash !== undefined) {
      assertManifestHash(bytes, expectedManifestHash);
    }
    return parseZkArtifactManifest(new TextDecoder().decode(bytes));
  }

  private async verifyArtifact(dir: typeof KEY_PATH | typeof ZKIR_PATH, fileName: string, bytes: Uint8Array): Promise<void> {
    const manifest = await this.loadManifest();
    verifyZkArtifactIntegrity({
      manifest,
      relativePath: `${dir}/${fileName}`,
      bytes,
      mode: this.integrityOptions.verify ?? 'require',
      onWarn: this.integrityOptions.onWarn
    });
  }

  async getProverKey(circuitId: K): Promise<ProverKey> {
    const bytes = await this.sendRequest(KEY_PATH, circuitId, PROVER_EXT, 'arraybuffer');
    await this.verifyArtifact(KEY_PATH, `${circuitId}${PROVER_EXT}`, bytes);
    return createProverKey(bytes);
  }

  async getVerifierKey(circuitId: K): Promise<VerifierKey> {
    const bytes = await this.sendRequest(KEY_PATH, circuitId, VERIFIER_EXT, 'arraybuffer');
    await this.verifyArtifact(KEY_PATH, `${circuitId}${VERIFIER_EXT}`, bytes);
    return createVerifierKey(bytes);
  }

  async getZKIR(circuitId: K): Promise<ZKIR> {
    const bytes = await this.sendRequest(ZKIR_PATH, circuitId, ZKIR_EXT, 'arraybuffer');
    await this.verifyArtifact(ZKIR_PATH, `${circuitId}${ZKIR_EXT}`, bytes);
    return createZKIR(bytes);
  }
}
