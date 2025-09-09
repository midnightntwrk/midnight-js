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

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FetchOptions {
  help: boolean;
  force: boolean;
  version?: string;
  listVersions: boolean;
  cleanup?: number;
}

export const parseArgs = (args: string[]): FetchOptions => {
  const options: FetchOptions = {
    help: false,
    force: false,
    listVersions: false,
  };

  args.forEach(arg => {
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--version=')) {
      options.version = arg.split('=')[1];
    } else if (arg === '--list-versions') {
      options.listVersions = true;
    } else if (arg.startsWith('--cleanup=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value) && value > 0) {
        options.cleanup = value;
      }
    }
  });

  return options;
};

export const shouldSkipDownload = (versionDir?: string, force = false): boolean => {
  const compactHomeEnv = process.env.COMPACT_HOME;
  
  if (compactHomeEnv) {
    return true;
  }

  if (!versionDir) {
    return false;
  }

  if (force) {
    return false;
  }

  const compactcPath = path.join(versionDir, 'compactc');
  return fs.existsSync(compactcPath);
};

export const printHelp = (): void => {
  console.log(`Supported flags:
    --help                    - this help
    --force                   - force download, even if version exists
    --version=<version>       - specify the version to download
    --list-versions           - list all installed versions
    --cleanup=<count>         - keep only the latest <count> versions`);
};
