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
 * Core contract types for the Contract Builder adapter
 */

/**
 * Deployment transaction data type
 */
export type DeployTxData = Record<string, unknown> | null | undefined;

/**
 * Represents a deployed contract instance from midnight-js
 */
export interface DeployedContract<TContract> {
  callTx: TContract;
  address: string;
  deployTxData: DeployTxData;
}

/**
 * Provider interfaces required for contract operations
 * Re-exported from @midnight-ntwrk/midnight-js-contracts for type compatibility
 */
export type { ContractProviders } from '@midnight-ntwrk/midnight-js-contracts';

/**
 * Logger data type - can be any JSON-serializable value
 */
export type LoggerData = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

/**
 * Logger interface for contract operations
 */
export interface Logger {
  info(message: string, data?: LoggerData): void;
  warn(message: string, data?: LoggerData): void;
  error(message: string, data?: LoggerData): void;
  debug(message: string, data?: LoggerData): void;
}

/**
 * Retry configuration for failed operations
 */
export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff?: boolean;
}

/**
 * Method call event emitted when a contract method is invoked
 */
export interface MethodCallEvent {
  methodName: string;
  args: unknown[];
  timestamp: number;
}

/**
 * Method success event emitted when a contract method completes successfully
 */
export interface MethodSuccessEvent {
  methodName: string;
  args: unknown[];
  result: unknown;
  duration: number;
  timestamp: number;
}

/**
 * Method error event emitted when a contract method fails
 */
export interface MethodErrorEvent {
  methodName: string;
  args: unknown[];
  error: unknown;
  duration: number;
  timestamp: number;
}
