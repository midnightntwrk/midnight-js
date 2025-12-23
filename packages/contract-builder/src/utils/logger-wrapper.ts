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
 * Logger wrapper utilities
 */

import type { Logger, LoggerData } from '../types/contract-types.js';

/**
 * No-op logger that discards all log messages
 */
export const noopLogger: Logger = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  info: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  warn: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  error: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  debug: () => {}
};

/**
 * Console-based logger implementation
 */
export const consoleLogger: Logger = {
  info: (message: string, data?: LoggerData) => {
    console.log(`[INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: LoggerData) => {
    console.warn(`[WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: LoggerData) => {
    console.error(`[ERROR] ${message}`, data ? data : '');
  },
  debug: (message: string, data?: LoggerData) => {
    console.debug(`[DEBUG] ${message}`, data ? data : '');
  }
};

/**
 * Creates a prefixed logger that adds a prefix to all log messages
 */
export function createPrefixedLogger(logger: Logger, prefix: string): Logger {
  return {
    info: (message: string, data?: LoggerData) => logger.info(`[${prefix}] ${message}`, data),
    warn: (message: string, data?: LoggerData) => logger.warn(`[${prefix}] ${message}`, data),
    error: (message: string, data?: LoggerData) => logger.error(`[${prefix}] ${message}`, data),
    debug: (message: string, data?: LoggerData) => logger.debug(`[${prefix}] ${message}`, data)
  };
}
