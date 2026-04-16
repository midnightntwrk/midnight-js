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
import { InvalidProtocolSchemeError, type ZKConfigProvider, zkConfigToProvingKeyMaterial } from '@midnight-ntwrk/midnight-js-types';
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

const getKeyMaterial = async <K extends string>(
  zkConfigProvider: ZKConfigProvider<K>,
  keyLocation: K
): Promise<ProvingKeyMaterial | undefined> => {
  try {
    const zkConfig = await zkConfigProvider.get(keyLocation);
    return zkConfigToProvingKeyMaterial(zkConfig);
  } catch {
    return undefined;
  }
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

export const httpClientProvingProvider = <K extends string>(
  url: string,
  zkConfigProvider: ZKConfigProvider<K>,
  config?: ProvingProviderConfig
): ProvingProvider => {
  const checkUrl = buildEndpointUrl(url, CHECK_PATH);
  const proveUrl = buildEndpointUrl(url, PROVE_PATH);

  if (checkUrl.protocol !== 'http:' && checkUrl.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(checkUrl.protocol, ['http:', 'https:']);
  }

  if (proveUrl.protocol !== 'http:' && proveUrl.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(proveUrl.protocol, ['http:', 'https:']);
  }

  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const headers = config?.headers ?? {};

  return  {
    async check(serializedPreimage: Uint8Array, keyLocation: string): Promise<(bigint | undefined)[]> {
      const keyMaterial = await getKeyMaterial(zkConfigProvider, keyLocation as K);
      const payload = createCheckPayload(serializedPreimage, keyMaterial?.ir);
      const result = await makeHttpRequest(checkUrl, payload, timeout, headers);
      return parseCheckResult(result);
    },

    async prove(
      serializedPreimage: Uint8Array,
      keyLocation: string,
      overwriteBindingInput?: bigint
    ): Promise<Uint8Array> {
      const keyMaterial = await getKeyMaterial(zkConfigProvider, keyLocation as K);
      const payload = createProvingPayload(serializedPreimage, overwriteBindingInput, keyMaterial);
      return makeHttpRequest(proveUrl, payload, timeout, headers);
    }
  };
};
