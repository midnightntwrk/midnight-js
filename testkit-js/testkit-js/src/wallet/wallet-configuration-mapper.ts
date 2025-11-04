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

import { type LedgerParameters } from '@midnight-ntwrk/ledger-v6';
import { type DefaultV1Configuration } from '@midnight-ntwrk/wallet-sdk-shielded/v1';

import { type EnvironmentConfiguration } from '@/test-environment';

export interface MapperOptions {
  readonly networkId?: string;
  readonly additionalFeeOverhead?: bigint;
  readonly ledgerParams?: LedgerParameters;
}

export function mapEnvironmentToConfiguration(
  env: EnvironmentConfiguration,
): DefaultV1Configuration {
  return {
    indexerClientConnection: {
      indexerHttpUrl: env.indexer,
      indexerWsUrl: env.indexerWS,
    },
    provingServerUrl: new URL(env.proofServer),
    relayURL: new URL(env.nodeWS),
    networkId: env.walletNetworkId,
  };
}
