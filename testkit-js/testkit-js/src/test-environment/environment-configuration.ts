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

import { type NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';

/**
 * Configuration interface for the test environment services
 */
export interface EnvironmentConfiguration {
  /** Wallet Network identifier */
  readonly walletNetworkId: NetworkId.NetworkId;
  /** Network identifier */
  readonly networkId: string;
  /** URL of the indexer HTTP endpoint */
  readonly indexer: string;
  /** WebSocket URL for the indexer service */
  readonly indexerWS: string;
  /** URL of the blockchain node */
  readonly node: string;
  /** WebSocket URL for the blockchain node */
  readonly nodeWS: string;
  /** URL of the proof generation server */
  readonly proofServer: string;
  /** Optional URL for the faucet service to obtain test tokens */
  readonly faucet: string | undefined;
}
