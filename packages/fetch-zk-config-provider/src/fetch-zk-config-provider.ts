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

import type { ProverKey, VerifierKey, ZKIR } from '@midnightntwrk/midnight-js-types';
import {
  createProverKey,
  createVerifierKey,
  createZKIR,
  InvalidProtocolSchemeError,
  PROVIDER_ERROR_CODES,
  ZkArtifactFetchError,
  ZKConfigProvider
} from '@midnightntwrk/midnight-js-types';
import {
  assertManifestHash,
  assertSafeName,
  hasErrorCode,
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
} from '@midnightntwrk/midnight-js-utils';
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
 *
 * The serving host must answer `404` for compiler files it does not have. Some hosts answer
 * `403` for a missing object instead — S3 without `s3:ListBucket`, or CloudFront in front of S3
 * with origin access control — and that answer cannot be told apart from a genuine refusal, so
 * it is treated as one: a bundle with no manifest on such a host fails integrity verification
 * rather than being read as unmanifested. Give the bucket list permission, or front it with a
 * host that answers 404, for manifest-less bundles.
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

  private async fetchArtifact(url: string): Promise<Response> {
    try {
      return await this.fetchFunc(url, { method: 'GET' });
    } catch (cause) {
      throw new ZkArtifactFetchError(`Failed to fetch ZK artifact from ${url}`, undefined, { cause });
    }
  }

  private static async readBody<T>(url: string, read: () => Promise<T>): Promise<T> {
    try {
      return await read();
    } catch (cause) {
      throw new ZkArtifactFetchError(`Failed to read ZK artifact from ${url}`, undefined, { cause });
    }
  }

  private static httpFailure(url: string, response: Response): ZkArtifactFetchError {
    return new ZkArtifactFetchError(
      `Failed to fetch ZK artifact from ${url}: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  // Only a 404 says the file is not there; the HTML fallback page the callers check for is the
  // other shape of "missing". Every other failure — a 401/403 refusal, a 410, a 5xx — propagates
  // as the fetch failure it is rather than being relabelled "missing": a 403 never proves the
  // file is absent (on S3/CloudFront it can also mean a missing object — see the class
  // documentation for the 404 hosting requirement), and caching a refusal as "no manifest"
  // would silently drop the manifest's era anchor.
  private static throwUnlessMissing(url: string, response: Response): void {
    if (response.status !== 404) {
      throw FetchZkConfigProvider.httpFailure(url, response);
    }
  }

  private async sendRequest(
    url: typeof KEY_PATH | typeof ZKIR_PATH,
    circuitId: K,
    ext: typeof ZKIR_EXT | typeof PROVER_EXT | typeof VERIFIER_EXT
  ): Promise<Uint8Array> {
    assertSafeName(circuitId, 'circuitId');
    const fullUrl = new URL(`${url}/${encodeURIComponent(circuitId)}${ext}`, this.base).toString();
    const response = await this.fetchArtifact(fullUrl);
    if (!response.ok) {
      throw FetchZkConfigProvider.httpFailure(fullUrl, response);
    }
    if (FetchZkConfigProvider.isHtmlFallback(response)) {
      throw new ZkArtifactFetchError(
        `Expected ZK artifact, but received text/html from ${fullUrl}. This usually means the file does not exist and the server returned an SPA fallback page.`,
        response.status,
        { notServed: true }
      );
    }
    return new Uint8Array(await FetchZkConfigProvider.readBody(fullUrl, () => response.arrayBuffer()));
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
    const response = await this.fetchArtifact(url);
    if (!response.ok) {
      FetchZkConfigProvider.throwUnlessMissing(url, response);
    }
    if (!response.ok || FetchZkConfigProvider.isHtmlFallback(response)) {
      if (expectedManifestHash !== undefined) {
        throw new ZkArtifactIntegrityError(
          `Expected ZK artifact manifest at ${url} but it was not available (status ${response.status})`
        );
      }
      return undefined;
    }
    const bytes = new Uint8Array(await FetchZkConfigProvider.readBody(url, () => response.arrayBuffer()));
    if (expectedManifestHash !== undefined) {
      assertManifestHash(bytes, expectedManifestHash);
    }
    return parseZkArtifactManifest(new TextDecoder().decode(bytes));
  }

  /**
   * Reports the `compact-runtime` this bundle was built against, preferring the source an
   * application can anchor to a hash it controls.
   *
   * The INTEGRITY MANIFEST is consulted first; `compiler/contract-info.json` is the fallback, for
   * bundles that carry no manifest at all. The fallback goes through the same integrity gate as
   * every key and ZKIR, so under the default `require` an unvouched-for description is refused.
   *
   * Cached per provider instance. A FAILED fetch is not cached.
   *
   * The reasoning behind that ordering is in
   * `packages/utils/docs/artifact-runtime-version.md`.
   *
   * @returns The declared runtime version, verbatim.
   * @throws ZkArtifactContractInfoError if the location does not serve the description (a 404 or
   * an SPA fallback page), or serves something that is not a compiler description.
   * @throws ZkArtifactFetchError if the manifest or the description is answered with any other
   * non-OK status; a refused manifest stops the read before the description is requested.
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
    const response = await this.fetchArtifact(url);
    if (!response.ok) {
      FetchZkConfigProvider.throwUnlessMissing(url, response);
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
    const bytes = new Uint8Array(await FetchZkConfigProvider.readBody(url, () => response.arrayBuffer()));
    verifyZkArtifactIntegrity({
      manifest,
      relativePath: `${ZK_MANIFEST_DIR}/${ZK_CONTRACT_INFO_FILE_NAME}`,
      bytes,
      mode: this.integrityOptions.verify ?? 'require',
      onWarn: this.integrityOptions.onWarn
    });

    return parseZkArtifactRuntimeVersion(new TextDecoder().decode(bytes));
  }

  // Loads the manifest for an artifact verification. A definitive refusal (401/403 and the other
  // non-transient statuses) is rethrown as an integrity error: downstream key-material resolvers
  // read a bare fetch error from a flat provider as "this provider does not serve the key" and
  // fall back to proving without key material, so a manifest that could not be loaded must
  // surface in the shape those resolvers already propagate — the same shape the registry
  // rethrows for a source whose probe failed on integrity grounds. A transient failure (network
  // error, 5xx) already propagates in its own shape and is left untouched.
  private async loadManifestForVerification(): Promise<ZkArtifactManifest | undefined> {
    try {
      return await this.loadManifest();
    } catch (error) {
      if (hasErrorCode(error, PROVIDER_ERROR_CODES.ZK_ARTIFACT_NOT_SERVED)) {
        const url = new URL(`${ZK_MANIFEST_DIR}/${ZK_MANIFEST_FILE_NAME}`, this.base).toString();
        throw new ZkArtifactIntegrityError(
          `ZK artifact manifest at ${url} could not be loaded, so these artifacts cannot be ` +
            `integrity-verified. The file may be missing, or the host may have refused access; ` +
            `either way the failed read surfaces here rather than being read as "no manifest".`,
          { cause: error }
        );
      }
      throw error;
    }
  }

  private async verifyArtifact(dir: typeof KEY_PATH | typeof ZKIR_PATH, fileName: string, bytes: Uint8Array): Promise<void> {
    const mode = this.integrityOptions.verify ?? 'require';
    // With verification off and no pinned manifest hash, the manifest certifies nothing, so it
    // is not read at all: a host that cannot serve it (or refuses it) must not break key reads
    // the caller explicitly opted out of verifying. A pinned hash anchors the manifest in every
    // mode, so the read still happens when one is set.
    const manifest =
      mode === 'off' && this.integrityOptions.expectedManifestHash === undefined
        ? undefined
        : await this.loadManifestForVerification();
    verifyZkArtifactIntegrity({
      manifest,
      relativePath: `${dir}/${fileName}`,
      bytes,
      mode,
      onWarn: this.integrityOptions.onWarn
    });
  }

  async getProverKey(circuitId: K): Promise<ProverKey> {
    const bytes = await this.sendRequest(KEY_PATH, circuitId, PROVER_EXT);
    await this.verifyArtifact(KEY_PATH, `${circuitId}${PROVER_EXT}`, bytes);
    return createProverKey(bytes);
  }

  async getVerifierKey(circuitId: K): Promise<VerifierKey> {
    const bytes = await this.sendRequest(KEY_PATH, circuitId, VERIFIER_EXT);
    await this.verifyArtifact(KEY_PATH, `${circuitId}${VERIFIER_EXT}`, bytes);
    return createVerifierKey(bytes);
  }

  async getZKIR(circuitId: K): Promise<ZKIR> {
    const bytes = await this.sendRequest(ZKIR_PATH, circuitId, ZKIR_EXT);
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
