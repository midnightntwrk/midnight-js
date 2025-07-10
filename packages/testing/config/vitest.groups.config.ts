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

import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';
import testGroups from '../test-groups';
import * as baseConfig from './vitest.e2e.config';

const directoryPath = path.join(__dirname, '..', 'src', 'test');

const groupsFlattened: string[] = [];
groupsFlattened.push(...Object.values(testGroups).flat());
console.log(`Files in groups: \n${groupsFlattened.join('\n')}`);

function getTestFiles(dir: string): string[] {
  const files = fs.readdirSync(dir);
  return files.filter((file) => file.endsWith('.test.ts'));
}

function checkTestFilesInGroups(testFiles: string[], groups: string[]) {
  testFiles.forEach((file) => {
    if (!groups.some((group) => group.includes(file))) {
      throw new Error(
        `Error: File ${file} not found in any of the groups.\n` +
          `Please add it to "test-groups.ts" before running tests.`
      );
    }
  });
}

checkTestFilesInGroups(getTestFiles(directoryPath), groupsFlattened);

const group = process.env.MN_TEST_GROUP || 'group1';
const selectedGroup = (testGroups as Record<string, string[]>)[group];
console.log(`Group name: ${group}`);
console.log(`Files in group: ${selectedGroup}`);

if (!selectedGroup) {
  throw new Error(`Error: No test assignments found for group "${group}".\nPlease add an entry in "test-groups.ts".`);
}

export default defineConfig({
  ...baseConfig.default,
  test: {
    ...baseConfig.default.test,
    include: selectedGroup,
    reporters: [
      'default',
      ['junit', { outputFile: `./reports/test-report-${group}.xml` }],
      ['@d2t/vitest-ctrf-json-reporter', { outputDir: './reports', outputFile: `ctrf-report-${group}.json` }],
      ['allure-vitest/reporter', { resultsDir: `./reports/allure-results-${group}` }]
    ]
  }
});
