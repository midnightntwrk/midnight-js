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
 * Type definitions for external midnight-js contract types
 *
 * These types help us avoid using 'any' while working with the external
 * @midnight-ntwrk/midnight-js-contracts package.
 */

import type { Contract } from '@midnight-ntwrk/midnight-js-types';

/**
 * Generic contract instance that can be passed to deploy/connect functions
 */
export type ContractInstance = Contract<unknown> | unknown;

/**
 * Options for deploy operations (intentionally loose for external API compatibility)
 */
export interface DeployOptions {
  contract: ContractInstance;
  privateStateId?: string;
  initialPrivateState?: unknown;
  [key: string]: unknown;
}

/**
 * Options for find/connect operations
 */
export interface FindContractOptions {
  contract: ContractInstance;
  contractAddress: string;
  privateStateId?: string;
  [key: string]: unknown;
}

/**
 * Typed wrapper for deployContract function from @midnight-ntwrk/midnight-js-contracts
 * Provides cleaner type signature avoiding complex overload resolution
 * Returns unknown to avoid strict type checking on external library's return types
 */
export type DeployContractFn = (
  providers: unknown,
  options: DeployOptions
) => Promise<unknown>;

/**
 * Typed wrapper for findDeployedContract function from @midnight-ntwrk/midnight-js-contracts
 * Provides cleaner type signature avoiding complex overload resolution
 * Returns unknown to avoid strict type checking on external library's return types
 */
export type FindDeployedContractFn = (
  providers: unknown,
  options: FindContractOptions
) => Promise<unknown>;
