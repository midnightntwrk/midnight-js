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

import {
  createCheckPayload,
  createProvingPayload,
  parseCheckResult,
  type ProvingKeyMaterial,
  type ProvingProvider} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { InvalidProtocolSchemeError, type ZKConfigProvider, ZKConfigRegistry, zkConfigToProvingKeyMaterial } from '@midnight-ntwrk/midnight-js-types';
import { warnIfInsecureRemoteUrl, ZkArtifactIntegrityError } from '@midnight-ntwrk/midnight-js-utils';
import fetch from 'cross-fetch';
import fetchBuilder from 'fetch-retry';

const retryOptions = {
  retries: 3,
  retryDelay: (attempt: number) => 2 ** attempt * 1_000,
  retryOn: [500, 503]
};
const fetchRetry = fetchBuilder(fetch, retryOptions);

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
      // resolve to `undefined` and are supplied by the proof server. An integrity violation, however,
      // means the artifact IS present but tampered with or stale — that must surface, not be masked
      // as "no key material" sent to the proof server.
      if (error instanceof ZkArtifactIntegrityError) {
        throw error;
      }
      return undefined;
    }
  };
};

const makeHttpRequest = async (url: URL, payload: Uint8Array, timeout: number, headers: Record<string, string> = {}): Promise<Uint8Array> => {
  const response = await fetchRetry(url, {
    method: 'POST',
    body: new Uint8Array(payload),
    headers: { 'Content-Type': 'application/octet-stream', ...headers },
    signal: AbortSignal.timeout(timeout)
  });

  if (!response.ok) {
    throw new Error(
      `Failed Proof Server response: url="${response.url}", code="${response.status}", status="${response.statusText}"`
    );
  }

  return new Uint8Array(await response.arrayBuffer());
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
