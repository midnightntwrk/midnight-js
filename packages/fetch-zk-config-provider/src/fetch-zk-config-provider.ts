// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { ProverKey, VerifierKey, ZKIR } from '@midnight-ntwrk/midnight-js-types';
import {
  createProverKey,
  createVerifierKey,
  createZKIR,
  ZKConfigProvider,
  InvalidProtocolSchemeError
} from '@midnight-ntwrk/midnight-js-types';
import { fetch } from 'cross-fetch';

/**
 * The name of the path containing proving and verifying keys.
 */
const KEY_PATH = 'keys';
/**
 * File extension for proving keys.
 */
const PROVER_EXT = '.prover';
/**
 * File extension for verifying keys.
 */
const VERIFIER_EXT = '.verifier';
/**
 * The name of the path containing zkIRs.
 */
const ZKIR_PATH = 'zkir';
/**
 * File extension for zkIRs.
 */
const ZKIR_EXT = '.bzkir';

/**
 * Retrieves ZK artifacts from a remote source.
 */
export class FetchZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  /**
   * @param baseURL The endpoint to query for ZK artifacts.
   * @param fetchFunc The function to use to execute queries.
   */
  constructor(
    public readonly baseURL: string,
    private fetchFunc: typeof fetch = fetch
  ) {
    super();
    const urlObject = new URL(baseURL);
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      throw new InvalidProtocolSchemeError(urlObject.protocol, ['http:', 'https:']);
    }
  }

  private async sendRequest<T extends 'text' | 'arraybuffer'>(
    url: typeof KEY_PATH | typeof ZKIR_PATH,
    circuitId: K,
    ext: typeof ZKIR_EXT | typeof PROVER_EXT | typeof VERIFIER_EXT,
    responseType: T
  ): Promise<T extends 'text' ? string : Uint8Array> {
    const response = await this.fetchFunc(`${this.baseURL}/${url}/${circuitId}${ext}`, {
      method: 'GET'
    });
    if (response.ok) {
      // The compiler can't infer that this return value is well-typed, so I cast to 'any'
      /* eslint-disable @typescript-eslint/no-explicit-any */
      return responseType === 'text'
        ? ((await response.text()) as any)
        : ((await response
            .arrayBuffer()
            .then((arrayBuffer) => new Uint8Array(arrayBuffer))) as any);
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
    throw new Error(response.statusText);
  }

  getProverKey(circuitId: K): Promise<ProverKey> {
    return this.sendRequest(KEY_PATH, circuitId, PROVER_EXT, 'arraybuffer').then(createProverKey);
  }

  getVerifierKey(circuitId: K): Promise<VerifierKey> {
    return this.sendRequest(KEY_PATH, circuitId, VERIFIER_EXT, 'arraybuffer').then(
      createVerifierKey
    );
  }

  getZKIR(circuitId: K): Promise<ZKIR> {
    return this.sendRequest(ZKIR_PATH, circuitId, ZKIR_EXT, 'arraybuffer').then(createZKIR);
  }
}
