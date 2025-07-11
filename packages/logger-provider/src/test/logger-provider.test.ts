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

import { vi } from 'vitest';
import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { LogLevel } from '@midnight-ntwrk/midnight-js-types';
import { LoggerProvider } from '../index';

// We do not need to mock pino, just provide a fake implementation.

describe('Logger Provider', () => {
  // define the test cases
  const testCases = [['info'], ['warn'], ['error'], ['debug'], ['trace'], ['fatal']];
  test.each(testCases)('loggerProvider.%s calls the underlying log function exactly once.', async (name) => {
    // For each test instantiate a new logger.
    const fakePino = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      isLevelEnabled: vi.fn()
    };
    // @ts-expect-error fakePino is not a full implementation of a pino logger.
    const logger = new LoggerProvider(fakePino);
    // @ts-expect-error fakePino is not a full implementation of a pino logger.
    logger[name]('Test');
    // @ts-expect-error fakePino is not a full implementation of a pino logger.
    expect(fakePino[name]).toHaveBeenCalledTimes(1);
  });

  test("'loggerProvider' returns true for enabled log level", async () => {
    // Set up a typical pino logger.
    const pretty: pinoPretty.PrettyStream = pinoPretty({
      colorize: true,
      sync: true
    });
    const level = 'debug' as const;
    const pinoLogger = pino(
      {
        level,
        depthLimit: 20
      },
      pino.multistream([
        { stream: pretty, level: 'info' },
        { stream: pretty, level: 'debug' }
      ])
    );
    const logger = new LoggerProvider(pinoLogger);
    expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(true);
    expect(logger.isLevelEnabled(LogLevel.TRACE)).toBe(false);
  });
});
