/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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
  type ProvingProvider} from '@midnight-ntwrk/ledger-v7';
import { InvalidProtocolSchemeError, type ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
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

export const DEFAULT_TIMEOUT = 300000;

const getKeyMaterial = async <K extends string>(
  zkConfigProvider: ZKConfigProvider<K>,
  circuitId: K
): Promise<ProvingKeyMaterial | undefined> => {
  try {
    const zkConfig = await zkConfigProvider.get(circuitId);
    console.log(`Fetched ZK config for circuitId="${circuitId}":`, zkConfig);
    return {
      proverKey: new Uint8Array(zkConfig.proverKey),
      verifierKey: new Uint8Array(zkConfig.verifierKey),
      ir: new Uint8Array(zkConfig.zkir),
    };
  } catch {
    console.log(`ZK config not found for circuitId="${circuitId}", using built-in circuit on proof server`);
    return undefined;
  }
};

const makeHttpRequest = async (url: URL, payload: Uint8Array, timeout: number): Promise<Uint8Array> => {
  console.log(`[makeHttpRequest] Sending POST to ${url.toString()}`);
  console.log(`[makeHttpRequest] Payload size: ${payload.length} bytes, timeout: ${timeout}ms`);

  const response = await fetchRetry(url, {
    method: 'POST',
    body: payload.buffer as ArrayBuffer,
    signal: AbortSignal.timeout(timeout)
  });

  console.log(`[makeHttpRequest] Response received: status=${response.status}, statusText="${response.statusText}"`);

  if (!response.ok) {
    console.error(`[makeHttpRequest] Request failed: url="${response.url}", code="${response.status}", status="${response.statusText}"`);
    throw new Error(
      `Failed Proof Server response: url="${response.url}", code="${response.status}", status="${response.statusText}"`
    );
  }

  const responseData = new Uint8Array(await response.arrayBuffer());
  console.log(`[makeHttpRequest] Response data size: ${responseData.length} bytes`);
  return responseData;
};

export interface ProvingProviderConfig {
  readonly timeout?: number;
}

export const httpClientProvingProvider = <K extends string>(
  url: string,
  zkConfigProvider: ZKConfigProvider<K>,
  config?: ProvingProviderConfig
): ProvingProvider => {
  console.log(`[httpClientProvingProvider] Creating provider with url="${url}"`);
  console.log(`[httpClientProvingProvider] Config:`, config);

  const checkUrl = new URL(CHECK_PATH, url);
  const proveUrl = new URL(PROVE_PATH, url);

  console.log(`[httpClientProvingProvider] Check URL: ${checkUrl.toString()}`);
  console.log(`[httpClientProvingProvider] Prove URL: ${proveUrl.toString()}`);

  if (checkUrl.protocol !== 'http:' && checkUrl.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(checkUrl.protocol, ['http:', 'https:']);
  }

  if (proveUrl.protocol !== 'http:' && proveUrl.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(proveUrl.protocol, ['http:', 'https:']);
  }

  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  console.log(`[httpClientProvingProvider] Using timeout: ${timeout}ms`);

  return  {
    async check(serializedPreimage: Uint8Array, keyLocation: string): Promise<(bigint | undefined)[]> {
      console.log(`[check] Starting check for keyLocation="${keyLocation}"`);
      console.log(`[check] Serialized preimage size: ${serializedPreimage.length} bytes`);
      const keyMaterial = await getKeyMaterial(zkConfigProvider, keyLocation as K);
      console.log(`[check] Key material available: ${!!keyMaterial}, is built-in circuit: ${!keyMaterial}`);
      console.log(`[check] Creating check payload with IR:`, keyMaterial?.ir ? 'present' : 'undefined');
      const payload = createCheckPayload(serializedPreimage, keyMaterial?.ir);
      console.log(`[check] Check payload created, size: ${payload.length} bytes`);
      const result = await makeHttpRequest(checkUrl, payload, timeout);
      console.log(`[check] HTTP request completed, result size: ${result.length} bytes`);
      console.log(`[check] Raw result bytes (first 100):`, Array.from(result.slice(0, 100)));
      console.log(`[check] Attempting to parse result...`);
      try {
        const parsedResult = parseCheckResult(result);
        console.log(`[check] Check completed successfully, result: ${JSON.stringify(parsedResult)}`);
        return parsedResult;
      } catch (error) {
        console.error(`[check] Failed to parse result:`, error);
        console.error(`[check] Full result bytes:`, Array.from(result));
        throw error;
      }
    },

    async prove(
      serializedPreimage: Uint8Array,
      keyLocation: string,
      overwriteBindingInput?: bigint
    ): Promise<Uint8Array> {
      console.log(`[prove] Starting prove for keyLocation="${keyLocation}"`);
      console.log(`[prove] Serialized preimage size: ${serializedPreimage.length} bytes`);
      console.log(`[prove] Overwrite binding input:`, overwriteBindingInput);
      const keyMaterial = await getKeyMaterial(zkConfigProvider, keyLocation as K);
      console.log(`[prove] Got key material, creating proving payload`);
      const payload = createProvingPayload(serializedPreimage, overwriteBindingInput, keyMaterial);
      console.log(`[prove] Proving payload created, size: ${payload.length} bytes`);
      const result = await makeHttpRequest(proveUrl, payload, timeout);
      console.log(`[prove] Prove completed successfully, result size: ${result.length} bytes`);
      return result;
    }
  };
};
