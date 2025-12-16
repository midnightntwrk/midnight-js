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
  parseCheckResult
} from '@midnight-ntwrk/ledger-v6';
import type { ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import { InvalidProtocolSchemeError } from '@midnight-ntwrk/midnight-js-types';

import { DEFAULT_CONFIG, fetchRetry, getKeyMaterial } from './shared';

const CHECK_PATH = '/check';
const PROVE_PATH = '/prove';

/**
 * Interface for a prover used with Transaction.prove()
 */
export interface Prover<K extends string = string> {
  /**
   * Checks the validity of a serialized preimage
   * @param serializedPreimage The serialized preimage to check
   * @param keyLocation The location/identifier of the proving keys
   * @returns Array of optional bigints representing check results
   */
  check(serializedPreimage: Uint8Array, keyLocation: K): Promise<(bigint | undefined)[]>;

  /**
   * Creates a proof for a serialized preimage
   * @param serializedPreimage The serialized preimage to prove
   * @param keyLocation The location/identifier of the proving keys
   * @param overwriteBindingInput Optional binding input override
   * @returns The proof as a Uint8Array
   */
  prove(
    serializedPreimage: Uint8Array,
    keyLocation: K,
    overwriteBindingInput?: bigint
  ): Promise<Uint8Array>;
}

/**
 * Creates a {@link Prover} by creating a client for a running proof server.
 * This prover can be used with Transaction.prove() for the new proving workflow.
 * Allows for HTTP and HTTPS. The data passed to the prover are intended to be
 * secret, so usage of this function should be heavily scrutinized.
 *
 * @param url The url of a running proof server
 * @param zkConfigProvider Provider to retrieve ZK configuration for a given circuit ID
 * @returns A Prover instance with check() and prove() methods
 *
 * @example
 * ```typescript
 * const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
 * const prover = httpClientProver('http://localhost:6300', zkConfigProvider);
 * const provenTx = await transaction.prove(prover, costModel);
 * ```
 */
export const httpClientProver = <K extends string>(
  url: string,
  zkConfigProvider: ZKConfigProvider<K>
): Prover<K> => {
  const baseUrl = new URL(url);
  if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(baseUrl.protocol, ['http:', 'https:']);
  }

  const makeRequest = async (endpoint: string, payload: Uint8Array): Promise<Uint8Array> => {
    const endpointUrl = new URL(endpoint, url);
    const response = await fetchRetry(endpointUrl, {
      method: 'POST',
      body: payload.buffer as ArrayBuffer,
      signal: AbortSignal.timeout(DEFAULT_CONFIG.timeout)
    });

    if (!response.ok) {
      throw new Error(
        `Failed Proof Server response: url="${response.url}", code="${response.status}", status="${response.statusText}"`
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  };

  return {
    async check(serializedPreimage: Uint8Array, keyLocation: K): Promise<(bigint | undefined)[]> {
      const zkConfig = await zkConfigProvider.get(keyLocation);
      const keyMaterial = getKeyMaterial(zkConfig);
      const payload = createCheckPayload(serializedPreimage, keyMaterial.ir);
      const result = await makeRequest(CHECK_PATH, payload);
      return parseCheckResult(result);
    },

    async prove(
      serializedPreimage: Uint8Array,
      keyLocation: K,
      overwriteBindingInput?: bigint
    ): Promise<Uint8Array> {
      const zkConfig = await zkConfigProvider.get(keyLocation);
      const keyMaterial = getKeyMaterial(zkConfig);
      const payload = createProvingPayload(serializedPreimage, overwriteBindingInput, keyMaterial);
      return makeRequest(PROVE_PATH, payload);
    }
  };
};
