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

import * as path from 'node:path';
import pinoPretty from 'pino-pretty';
import pino from 'pino';
import { getContainersConfiguration } from './configuration';

const { level } = getContainersConfiguration().log;

export function createLogger(fileName: string, dir: string = getContainersConfiguration().log.path) {
  let logPath = path.resolve(fileName);
  if (!fileName.includes('/')) {
    logPath = path.resolve(dir, fileName);
  }
  const prettyStream: pinoPretty.PrettyStream = pinoPretty({
    colorize: true,
    sync: true
  });
  const prettyFileStream: pinoPretty.PrettyStream = pinoPretty({
    mkdir: true,
    colorize: false,
    sync: true,
    append: true,
    destination: logPath
  });
  return pino(
    {
      level,
      depthLimit: 20
    },
    pino.multistream([
      { stream: prettyStream, level },
      { stream: prettyFileStream, level }
    ])
  );
}

export function createDefaultTestLogger() {
  return createLogger(getContainersConfiguration().log.fileName, getContainersConfiguration().log.path);
}

export const logger = createDefaultTestLogger();
