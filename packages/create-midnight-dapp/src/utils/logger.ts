/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import pc from 'picocolors';

export interface Logger {
  info(message: string): void;
  success(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  step(message: string): void;
}

export function createLogger(): Logger {
  return {
    info(message: string): void {
      console.log(message);
    },

    success(message: string): void {
      console.log(pc.green(`✔ ${message}`));
    },

    error(message: string): void {
      console.error(pc.red(`✖ ${message}`));
    },

    warn(message: string): void {
      console.warn(pc.yellow(`⚠ ${message}`));
    },

    step(message: string): void {
      console.log(pc.cyan(`→ ${message}`));
    },
  };
}

export const logger = createLogger();
