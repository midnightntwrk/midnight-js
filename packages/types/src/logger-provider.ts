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

import type { LogFn } from 'pino';

/**
 * A valid named log level.
 */
export enum LogLevel {
  /**
   * Log levels typically used by DAapp developers.
   */
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
  /**
   * Log levels used by Midnight.JS to report internal state.
   */
  DEBUG = 'debug',
  TRACE = 'trace'
}

/**
 * A provider for logging functions.
 */
export interface LoggerProvider {
  info?: LogFn;
  warn?: LogFn;
  error?: LogFn;
  debug?: LogFn;
  fatal?: LogFn;
  isLevelEnabled(level: LogLevel): boolean;
}
