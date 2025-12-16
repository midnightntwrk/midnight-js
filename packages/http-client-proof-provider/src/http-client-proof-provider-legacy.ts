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
  createProvingTransactionPayload,
  Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/ledger-v6';
import type {
  ProofProvider,
  ProvenTransaction,
  ProveTxConfig,
  ZKConfig
} from '@midnight-ntwrk/midnight-js-types';
import { InvalidProtocolSchemeError } from '@midnight-ntwrk/midnight-js-types';
import _ from 'lodash';

import { DEFAULT_CONFIG, fetchRetry, getKeyMaterial } from './shared';

const PROVE_TX_PATH = '/prove-tx';

const deserializePayload = (arrayBuffer: ArrayBuffer): ProvenTransaction => {
  const bytes = new Uint8Array(arrayBuffer);
  const transaction = Transaction.deserialize('signature', 'proof', 'pre-binding', bytes);
  return transaction as ProvenTransaction;
};

/**
 * Serializes an unproven transaction with optional ZK configuration into a payload
 * for the legacy /prove-tx endpoint.
 *
 * @param unprovenTx The unproven transaction to serialize
 * @param zkConfig Optional ZK configuration containing circuit ID and proving keys
 * @returns Serialized payload as Uint8Array
 */
export const serializeTransactionPayload = <K extends string>(
  unprovenTx: UnprovenTransaction,
  zkConfig?: ZKConfig<K>
): Uint8Array => {
  const map = new Map();
  if(zkConfig) {
    map.set(zkConfig?.circuitId, getKeyMaterial(zkConfig));
  }
  return createProvingTransactionPayload(unprovenTx, map);
}

/**
 * Creates a {@link ProofProvider} by creating a client for a running proof server.
 * This is the legacy implementation using the /prove-tx endpoint.
 * Allows for HTTP and HTTPS. The data passed to 'proveTx' are intended to be
 * secret, so usage of this function should be heavily scrutinized.
 *
 * @param url The url of a running proof server.
 * @deprecated Use {@link httpClientProver} with Transaction.prove() instead
 *
 * @example
 * ```typescript
 * const provider = httpClientProofProvider('http://localhost:6300');
 * const provenTx = await provider.proveTx(unprovenTx, { zkConfig });
 * ```
 */
export const httpClientProofProvider = <K extends string>(url: string): ProofProvider<K> => {
  // To validate the url, we use the URL constructor
  const urlObject = new URL(PROVE_TX_PATH, url);
  if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(urlObject.protocol, ['http:', 'https:']);
  }
  return {
    async proveTx(
      unprovenTx: UnprovenTransaction,
      partialProveTxConfig?: ProveTxConfig<K>
    ): Promise<ProvenTransaction> {
      const config = _.defaults(partialProveTxConfig, DEFAULT_CONFIG);
      const requestBody = serializeTransactionPayload(unprovenTx, config.zkConfig).buffer as ArrayBuffer;
      const response = await fetchRetry(urlObject, {
        method: 'POST',
        body: requestBody,
        signal: AbortSignal.timeout(config.timeout)
      });
      // TODO: More sophisticated error handling
      // TODO: Check that response is valid format (has arrayBuffer content-type)
      if (!response.ok) {
        throw new Error(
          `Failed Proof Server response: url="${response.url}", code="${response.status}", status="${response.statusText}"`
        );
      }
      return deserializePayload(await response.arrayBuffer());
    }
  };
};
