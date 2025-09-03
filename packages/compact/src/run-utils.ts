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

export const resolveCompactPath = (packageDir: string, version?: string): string => {
  const compactHomeEnv = process.env.COMPACT_HOME;
  
  if (compactHomeEnv) {
    console.log(`COMPACT_HOME env variable is set; using Compact from ${compactHomeEnv}`);
    return compactHomeEnv;
  }

  const managedDir = path.resolve(packageDir, 'managed');
  
  if (version) {
    const versionDir = path.resolve(managedDir, version);
    const compactcPath = path.join(versionDir, 'compactc');
    
    if (fs.existsSync(compactcPath)) {
      console.log(`Using Compact version ${version} from ${versionDir}`);
      return versionDir;
    } else {
      throw new Error(`Compact version ${version} not found at ${versionDir}. Run fetch-compactc --version=${version} first.`);
    }
  }

  const versions = fs.existsSync(managedDir) 
    ? fs.readdirSync(managedDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(versionName => {
          const compactcPath = path.join(managedDir, versionName, 'compactc');
          return fs.existsSync(compactcPath);
        })
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    : [];

  if (versions.length === 0) {
    throw new Error('No Compact versions found. Run fetch-compactc first.');
  }

  const latestVersion = versions[0];
  const latestVersionDir = path.resolve(managedDir, latestVersion);
  console.log(`Using latest Compact version ${latestVersion} from ${latestVersionDir}`);
  
  return latestVersionDir;
};
