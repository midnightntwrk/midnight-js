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
 * Custom error classes for the Contract Adapter
 */

/**
 * Base error class for all adapter-related errors
 */
export class AdapterError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AdapterError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdapterError);
    }
  }
}

/**
 * Error thrown when contract deployment fails
 */
export class DeploymentError extends AdapterError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DeploymentError';
  }
}

/**
 * Error thrown when a contract method call fails
 */
export class MethodCallError extends AdapterError {
  constructor(
    message: string,
    public readonly methodName: string,
    public readonly args: any[],
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'MethodCallError';
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends AdapterError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
