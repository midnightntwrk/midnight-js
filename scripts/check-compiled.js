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

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const compiledDirPath = process.argv[2];

if (!compiledDirPath) {
  console.error('Error: Please provide the path to the compiled directory as an argument.');
  console.error('Usage: node check-compiled.js <path-to-managed-dir>');
  process.exit(1);
}

const compiledDir = path.join(process.cwd(), compiledDirPath);

if (!fs.existsSync(compiledDir)) {
  console.log(`Compiled directory not found at ${compiledDirPath}. Running yarn compact...`);
  execSync('yarn compact', { stdio: 'inherit' });
} else {
  console.log(`Compiled directory exists at ${compiledDirPath}. Skipping compilation.`);
}
