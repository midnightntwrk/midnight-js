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

import {
  createCheckPayload,
  createProvingPayload,
  parseCheckResult,
  type ProvingKeyMaterial,
  type ProvingProvider} from '@midnightntwrk/midnight-js-protocol/v9';
import {
  InvalidProtocolSchemeError,
  ProofServerError,
  PROVIDER_ERROR_CODES,
  type ZKConfigProvider,
  ZKConfigRegistry,
  zkConfigToProvingKeyMaterial
} from '@midnightntwrk/midnight-js-types';
import { hasErrorCode, warnIfInsecureRemoteUrl, ZkArtifactIntegrityError } from '@midnightntwrk/midnight-js-utils';
import fetch from 'cross-fetch';

const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const MAX_RETRIES = 3;

const backoffDelay = (retry: number): number => 2 ** retry * 1_000;

const retryAfterDelay = (response: Response): number | undefined => {
  const value = response.headers.get('Retry-After')?.trim();
  if (value === undefined) {
    return undefined;
  }
  if (/^\d+$/.test(value)) {
    return Number(value) * 1_000;
  }
  const date = /GMT$/.test(value) ? Date.parse(value) : Number.NaN;
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

const sleep = (ms: number, signal: AbortSignal): Promise<void> => {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });
};

const fetchWithRetry = async (url: URL, init: RequestInit, timeout: number): Promise<Response> => {
  const signal = AbortSignal.timeout(timeout);
  for (let retry = 0; ; retry++) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal });
    } catch (error) {
      if (signal.aborted || retry === MAX_RETRIES) {
        throw error;
      }
      await sleep(backoffDelay(retry), signal);
      continue;
    }
    if (!RETRYABLE_STATUSES.has(response.status) || retry === MAX_RETRIES) {
      return response;
    }
    await sleep(Math.min(retryAfterDelay(response) ?? backoffDelay(retry), timeout), signal);
  }
};

const CHECK_PATH = '/check';
const PROVE_PATH = '/prove';

const buildEndpointUrl = (baseUrl: string, endpoint: string): URL => {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/$/, '') + endpoint;
  return url;
};

export const DEFAULT_TIMEOUT = 300000;

/**
 * Resolves the ZK key material for a proof preimage's key location.
 *
 * Canonical contract key locations (one per contract call; see `ZKConfigRegistry`) are resolved
 * through the registry's verifier-key join — throwing the registry's artifact-drift error when no
 * bundle matches, since proving would be guaranteed to fail. Other locations are protocol
 * builtins (`midnight/...`), which resolve to `undefined` key material and are supplied by the
 * proof server; when a single flat provider was given, a non-canonical location is also tried
 * against it as a bare circuit name.
 */
const makeKeyMaterialResolver = <K extends string>(
  zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry
): ((keyLocation: string) => Promise<ProvingKeyMaterial | undefined>) => {
  const registry = zkConfigProvider instanceof ZKConfigRegistry ? zkConfigProvider : new ZKConfigRegistry([zkConfigProvider]);
  const flatProvider = zkConfigProvider instanceof ZKConfigRegistry ? undefined : zkConfigProvider;
  return async (keyLocation: string): Promise<ProvingKeyMaterial | undefined> => {
    const resolved = await registry.resolveKeyLocation(keyLocation);
    if (resolved !== undefined) {
      return zkConfigToProvingKeyMaterial(resolved);
    }
    if (flatProvider === undefined) {
      return undefined;
    }
    try {
      return zkConfigToProvingKeyMaterial(await flatProvider.get(keyLocation as K));
    } catch (error) {
      // A flat provider legitimately doesn't serve protocol builtins (or bare names it lacks); those
      // resolve to `undefined` and are supplied by the proof server. A tampered artifact or an
      // artifact source that is down says nothing about absence, so it must surface rather than be
      // masked as "no key material" sent to the proof server.
      if (error instanceof ZkArtifactIntegrityError || hasErrorCode(error, PROVIDER_ERROR_CODES.ZK_ARTIFACT_FETCH_FAILED)) {
        throw error;
      }
      return undefined;
    }
  };
};

const makeHttpRequest = async (url: URL, payload: Uint8Array, timeout: number, headers: Record<string, string> = {}): Promise<Uint8Array> => {
  let response: Response;
  try {
    response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        body: new Uint8Array(payload),
        headers: { 'Content-Type': 'application/octet-stream', ...headers },
        // 'manual', not 'error': a redirect must come back as a response, which is not retried.
        redirect: 'manual'
      },
      timeout
    );
  } catch (cause) {
    throw new ProofServerError(`Proof Server request failed: url="${url}"`, undefined, { cause });
  }

  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
    throw new ProofServerError(`Proof Server redirected the request, redirects are refused: url="${url}"`, response.status);
  }

  if (!response.ok) {
    throw new ProofServerError(
      `Failed Proof Server response: url="${response.url}", code="${response.status}", status="${response.statusText}"`,
      response.status
    );
  }

  try {
    return new Uint8Array(await response.arrayBuffer());
  } catch (cause) {
    throw new ProofServerError(`Proof Server response could not be read: url="${url}"`, undefined, { cause });
  }
};

export interface ProvingProviderConfig {
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}

/**
 * A {@link ProvingProvider} whose per-circuit `check`/`prove` calls accept an optional per-request
 * timeout override. The extra parameter is optional and trailing, so this type stays assignable to
 * `ProvingProvider`; callers that don't need per-request control can ignore it. Used by
 * `httpClientProofProvider` to honor a per-`proveTx` timeout without rebuilding the underlying
 * provider — see https://github.com/midnightntwrk/midnight-js/issues/974.
 */
export interface TimeoutAwareProvingProvider extends ProvingProvider {
  check(
    serializedPreimage: Uint8Array,
    keyLocation: string,
    overrideTimeout?: number
  ): Promise<(bigint | undefined)[]>;
  prove(
    serializedPreimage: Uint8Array,
    keyLocation: string,
    overwriteBindingInput?: bigint,
    overrideTimeout?: number
  ): Promise<Uint8Array>;
}

export const httpClientProvingProvider = <K extends string>(
  url: string,
  zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry,
  config?: ProvingProviderConfig
): TimeoutAwareProvingProvider => {
  const getKeyMaterial = makeKeyMaterialResolver(zkConfigProvider);
  const checkUrl = buildEndpointUrl(url, CHECK_PATH);
  const proveUrl = buildEndpointUrl(url, PROVE_PATH);

  if (checkUrl.protocol !== 'http:' && checkUrl.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(checkUrl.protocol, ['http:', 'https:']);
  }

  if (proveUrl.protocol !== 'http:' && proveUrl.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(proveUrl.protocol, ['http:', 'https:']);
  }

  warnIfInsecureRemoteUrl(url, 'proof server URL');

  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const headers = config?.headers ?? {};

  return  {
    async check(
      serializedPreimage: Uint8Array,
      keyLocation: string,
      overrideTimeout?: number
    ): Promise<(bigint | undefined)[]> {
      const keyMaterial = await getKeyMaterial(keyLocation);
      const payload = createCheckPayload(serializedPreimage, keyMaterial?.ir);
      const result = await makeHttpRequest(checkUrl, payload, overrideTimeout ?? timeout, headers);
      return parseCheckResult(result);
    },

    async prove(
      serializedPreimage: Uint8Array,
      keyLocation: string,
      overwriteBindingInput?: bigint,
      overrideTimeout?: number
    ): Promise<Uint8Array> {
      const keyMaterial = await getKeyMaterial(keyLocation);
      const payload = createProvingPayload(serializedPreimage, overwriteBindingInput, keyMaterial);
      return makeHttpRequest(proveUrl, payload, overrideTimeout ?? timeout, headers);
    },

    lookupKey: getKeyMaterial
  };
};
