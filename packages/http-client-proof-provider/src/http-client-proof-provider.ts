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
  type ProvingKeyMaterial,
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
import fetch from 'cross-fetch';
import fetchBuilder from 'fetch-retry';
import _ from 'lodash';

/**
 * configure fetch-retry with fetch and http error 500 & 503 backoff strategy.
 */
const retryOptions = {
  retries: 3,
  retryDelay: (attempt: number) => 2 ** attempt * 1_000,
  retryOn: [500, 503]
};
const fetchRetry = fetchBuilder(fetch, retryOptions);

const deserializePayload = (arrayBuffer: ArrayBuffer): ProvenTransaction => {
  const bytes = new Uint8Array(arrayBuffer);
  const transaction = Transaction.deserialize('signature', 'proof', 'pre-binding', bytes);
  return transaction as ProvenTransaction;
};

const PROVE_TX_PATH = '/prove-tx';

/**
 * The default configuration for the proof server client.
 */
export const DEFAULT_CONFIG = {
  /**
   * The default timeout for prove requests.
   */
  timeout: 300000,
  /**
   * The default ZK configuration to use. It is overwritten with a proper ZK
   * configuration only if a call transaction is being proven.
   */
  zkConfig: undefined
};

const getKeyMaterial = <K extends string>(zkConfig?: ZKConfig<K>): ProvingKeyMaterial => {
  return {
    proverKey: zkConfig?.proverKey as Uint8Array,
    verifierKey: zkConfig?.verifierKey as Uint8Array,
    ir: zkConfig?.zkir as Uint8Array,
  };
}

export const serializeTransactionPayload = <K extends string>(unprovenTx: UnprovenTransaction, zkConfig?: ZKConfig<K>): Uint8Array => {
  const map = new Map();
  if(zkConfig) {
    map.set(zkConfig?.circuitId, getKeyMaterial(zkConfig));
  }
  return createProvingTransactionPayload(unprovenTx, map);
}

/**
 * Creates a {@link ProofProvider} by creating a client for a running proof server.
 * Allows for HTTP and HTTPS. The data passed to 'proveTx' are intended to be
 * secret, so usage of this function should be heavily scrutinized.
 *
 * @param url The url of a running proof server.
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
