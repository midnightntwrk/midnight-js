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

/**
 * Provider types and configuration for different environments
 */

import type { ContractProviders } from '@midnight-ntwrk/midnight-js-contracts';

/**
 * Environment type for provider selection
 */
export type ProviderEnvironment = 'nodejs' | 'browser' | 'auto';

/**
 * Network configuration for providers
 */
export interface NetworkConfig {
  /** Network ID (e.g., 'testnet', 'mainnet', 'devnet') */
  networkId: string;

  /** Indexer URL for public data */
  indexerUrl: string;

  /** Node URL for transaction submission */
  nodeUrl: string;

  /** Optional ZK config URL (defaults based on environment) */
  zkConfigUrl?: string;

  /** Optional proof server URL */
  proofServerUrl?: string;
}

/**
 * Wallet configuration
 */
export interface WalletConfig {
  /** Wallet seed phrase or private key */
  seed?: string;

  /** Optional wallet path for derivation */
  path?: string;
}

/**
 * Network preset names
 */
export type NetworkPreset = keyof typeof NETWORK_PRESETS;

/**
 * Provider preset configuration combining network and wallet settings
 */
export interface ProviderPresetConfig {
  /** Environment to use (nodejs, browser, or auto-detect) */
  environment?: ProviderEnvironment;

  /** Network configuration - can be a preset name or custom config */
  network: NetworkPreset | NetworkConfig;

  /** Optional wallet configuration */
  wallet?: WalletConfig;

  /** Optional custom provider overrides */
  providers?: Partial<ContractProviders>;
}

/**
 * Re-export ContractProviders from midnight-js-contracts
 * This is the standard type used across the midnight-js ecosystem
 */
export type { ContractProviders } from '@midnight-ntwrk/midnight-js-contracts';

/**
 * Preset network configurations
 */
export const NETWORK_PRESETS = {
  testnet: {
    networkId: 'testnet',
    indexerUrl: 'https://indexer.testnet.midnight.network',
    nodeUrl: 'https://node.testnet.midnight.network',
    zkConfigUrl: undefined
  },
  devnet: {
    networkId: 'devnet',
    indexerUrl: 'https://indexer.devnet.midnight.network',
    nodeUrl: 'https://node.devnet.midnight.network',
    zkConfigUrl: undefined
  },
  local: {
    networkId: 'undeployed',
    indexerUrl: 'http://localhost:8080',
    nodeUrl: 'http://localhost:3000',
    zkConfigUrl: 'http://localhost:8081'
  }
} as const;
