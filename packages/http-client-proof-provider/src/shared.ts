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

import type { ProvingKeyMaterial } from '@midnight-ntwrk/ledger-v6';
import type { ZKConfig } from '@midnight-ntwrk/midnight-js-types';
import fetch from 'cross-fetch';
import fetchBuilder from 'fetch-retry';

/**
 * configure fetch-retry with fetch and http error 500 & 503 backoff strategy.
 */
export const retryOptions = {
  retries: 3,
  retryDelay: (attempt: number) => 2 ** attempt * 1_000,
  retryOn: [500, 503]
};

export const fetchRetry = fetchBuilder(fetch, retryOptions);

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

/**
 * Converts ZKConfig to ProvingKeyMaterial
 */
export const getKeyMaterial = <K extends string>(zkConfig?: ZKConfig<K>): ProvingKeyMaterial => {
  return {
    proverKey: zkConfig?.proverKey as Uint8Array,
    verifierKey: zkConfig?.verifierKey as Uint8Array,
    ir: zkConfig?.zkir as Uint8Array,
  };
};
