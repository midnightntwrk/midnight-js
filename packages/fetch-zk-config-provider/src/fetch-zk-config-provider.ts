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
  parseZkArtifactRuntimeVersion,
  verifyZkArtifactIntegrity,
  ZK_CONTRACT_INFO_FILE_NAME,
  ZK_MANIFEST_DIR,
  ZK_MANIFEST_FILE_NAME,
  ZkArtifactContractInfoError,
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
  private runtimeVersionPromise?: Promise<string>;

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
    /* eslint-disable @typescript-eslint/no-explicit-any, no-restricted-syntax */
    return responseType === 'text'
      ? ((await response.text()) as any)
      : ((await response.arrayBuffer().then((arrayBuffer) => new Uint8Array(arrayBuffer))) as any);
    /* eslint-enable @typescript-eslint/no-explicit-any, no-restricted-syntax */
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

  /**
   * Reports the `compact-runtime` this bundle was built against, preferring the source an
   * application can anchor to a hash it controls.
   *
   * The INTEGRITY MANIFEST is consulted first, because `expectedManifestHash` pins it to a digest
   * the application supplies at build time, while everything else is fetched from the same host as
   * the artifacts it describes. This value selects which ledger pipeline executes the call, so
   * whoever serves the artifacts must not be the one who decides it.
   *
   * `compiler/contract-info.json` is the fallback, for bundles that carry no manifest at all --
   * `compactc` only began emitting one in 0.33, which is exactly the retained-era case. It is put
   * through the same integrity gate as every key and ZKIR, so under the default `require` an
   * unvouched-for description is refused rather than trusted.
   *
   * Cached per provider instance. A FAILED fetch is not cached, so a transient network error does
   * not permanently refuse an artifact set that is really there.
   *
   * @returns The declared runtime version, verbatim.
   * @throws ZkArtifactContractInfoError if the location does not serve the description, answers
   * with an SPA fallback page, or serves something that is not a compiler description.
   * @throws ZkArtifactIntegrityError if the description is not covered by the manifest under a mode
   * that requires it.
   */
  override async getArtifactRuntimeVersion(): Promise<string> {
    // The cached promise CLEARS ITSELF on failure, so a transient error is retried rather than
    // remembered. Written as one self-clearing chain rather than as a stored promise compared
    // against the slot: nothing can replace the slot between the rejection and this handler, so a
    // comparison would only add a branch no test can reach.
    this.runtimeVersionPromise ??= this.fetchRuntimeVersion().catch((error: unknown) => {
      this.runtimeVersionPromise = undefined;
      throw error;
    });
    return this.runtimeVersionPromise;
  }

  private async fetchRuntimeVersion(): Promise<string> {
    const manifest = await this.loadManifest();
    if (manifest?.runtimeVersion !== undefined) {
      return manifest.runtimeVersion;
    }

    const url = new URL(`${ZK_MANIFEST_DIR}/${ZK_CONTRACT_INFO_FILE_NAME}`, this.base).toString();
    const response = await this.fetchFunc(url, { method: 'GET' });
    if (!response.ok) {
      throw new ZkArtifactContractInfoError(
        `No ${ZK_CONTRACT_INFO_FILE_NAME} was available at ${url} (status ${response.status}), so the ` +
          `era of these artifacts cannot be established. Serve the compiler output directory that ` +
          `compactc emits beside the keys.`
      );
    }
    // An HTML answer is reported as its own condition rather than parsed: a CDN serving its SPA
    // fallback with a 200 is the common shape of "this file is not there", and an operator told
    // only that the file is missing will keep re-uploading one that is already in place.
    if (FetchZkConfigProvider.isHtmlFallback(response)) {
      throw new ZkArtifactContractInfoError(
        `Expected ${ZK_CONTRACT_INFO_FILE_NAME} at ${url}, but the response content-type was ` +
          `${JSON.stringify(response.headers.get('content-type'))}. This usually means the file does ` +
          `not exist and the server returned an SPA fallback page.`
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    verifyZkArtifactIntegrity({
      manifest,
      relativePath: `${ZK_MANIFEST_DIR}/${ZK_CONTRACT_INFO_FILE_NAME}`,
      bytes,
      mode: this.integrityOptions.verify ?? 'require',
      onWarn: this.integrityOptions.onWarn
    });

    return parseZkArtifactRuntimeVersion(new TextDecoder().decode(bytes));
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

/**
 * Options for {@link fetchZkConfigProvider}. Combines the remote `baseURL` with fetch and integrity options.
 *
 * Named with a `Create` prefix because {@link FetchZkConfigProviderOptions} — the class constructor's
 * options — already exists; the prefix keeps both names unambiguous rather than being a style inconsistency.
 */
export interface CreateFetchZkConfigProviderOptions extends FetchZkConfigProviderOptions {
  /** The endpoint to query for ZK artifacts. */
  readonly baseURL: string;
}

/**
 * Factory for {@link FetchZkConfigProvider} following the `provider(options)` convention.
 *
 * @typeParam K - The circuit-ID union. It is not inferred from `options`, so supply it explicitly
 * (e.g. `fetchZkConfigProvider<'a' | 'b'>({ … })`) to keep `getProverKey` narrowed; it otherwise widens to `string`.
 */
export function fetchZkConfigProvider<K extends string>(
  options: CreateFetchZkConfigProviderOptions
): FetchZkConfigProvider<K> {
  const { baseURL, ...rest } = options;
  return new FetchZkConfigProvider<K>(baseURL, rest);
}
