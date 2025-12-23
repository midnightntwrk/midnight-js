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
 * Environment detection utilities
 */

import type { ProviderEnvironment } from './types.js';

/**
 * Detects the current runtime environment
 */
export function detectEnvironment(): 'nodejs' | 'browser' {
  // Check for Node.js specific globals
  if (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  ) {
    return 'nodejs';
  }

  // Check for browser specific globals
  if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  ) {
    return 'browser';
  }

  // Default to browser for web workers, service workers, etc.
  return 'browser';
}

/**
 * Resolves the environment, handling 'auto' detection
 */
export function resolveEnvironment(env?: ProviderEnvironment): 'nodejs' | 'browser' {
  if (!env || env === 'auto') {
    return detectEnvironment();
  }
  return env;
}

/**
 * Checks if running in Node.js environment
 */
export function isNodeJS(): boolean {
  return detectEnvironment() === 'nodejs';
}

/**
 * Checks if running in browser environment
 */
export function isBrowser(): boolean {
  return detectEnvironment() === 'browser';
}
