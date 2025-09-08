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

import type { LogLevel } from '@midnight-ntwrk/midnight-js-types';
import type { LogFn, Logger } from 'pino';

/**
 * Implementation of {@link LoggerProvider} that returns a {@link Logger} instance.
 */
export class LoggerProvider {
  private instance: Logger;

  // Private constructor to prevent direct instantiation. Require a logger instance that conforms to the 'pino' logger interface.
  constructor(logger: Logger) {
    this.instance = logger;
  }

  // Wrapper methods for logging
  public info: LogFn = (...args: unknown[]): void => {
    this.instance.info(args);
  };
  public error: LogFn = (...args: unknown[]): void => {
    this.instance.error(args);
  };
  public warn: LogFn = (...args: unknown[]): void => {
    this.instance.warn(args);
  };
  public debug: LogFn = (...args: unknown[]): void => {
    this.instance.debug(args);
  };
  public trace: LogFn = (...args: unknown[]): void => {
    this.instance.trace(args);
  };
  public fatal: LogFn = (...args: unknown[]): void => {
    this.instance.fatal(args);
  };
  public isLevelEnabled = (level: LogLevel): boolean => {
    return this.instance.isLevelEnabled(level);
  };
}
