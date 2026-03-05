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

import { execFileSync } from 'node:child_process';

import { DependencyInstallError } from '../errors/scaffold-errors.js';
import { logger } from '../utils/logger.js';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface PackageManagerPort {
  detect(): PackageManager;
  install(cwd: string, packageManager?: PackageManager): void;
}

export function createPackageManagerAdapter(): PackageManagerPort {
  return {
    detect(): PackageManager {
      const userAgent = process.env.npm_config_user_agent;
      if (userAgent) {
        if (userAgent.startsWith('yarn')) return 'yarn';
        if (userAgent.startsWith('pnpm')) return 'pnpm';
      }
      return 'npm';
    },

    install(cwd: string, packageManager?: PackageManager): void {
      const pm = packageManager || this.detect();

      logger.step(`Installing dependencies with ${pm}...`);

      try {
        execFileSync(pm, ['install'], {
          cwd,
          stdio: 'inherit',
        });
        logger.success('Dependencies installed');
      } catch (error) {
        throw new DependencyInstallError(cwd, { cause: error });
      }
    },
  };
}

export const packageManager = createPackageManagerAdapter();
