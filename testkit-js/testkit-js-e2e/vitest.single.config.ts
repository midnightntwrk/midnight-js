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
import * as baseConfig from './vitest.config';

const testFile = process.env.MN_TEST_FILE;

if (!testFile) {
  throw new Error('Error: MN_TEST_FILE environment variable is required for single test execution.');
}

const testBaseName = testFile.replace(/\.test\.ts$/, '').replace(/^.*\//, '');

console.log(`Test file: ${testFile}`);
console.log(`Test base name: ${testBaseName}`);

export default defineConfig({
  ...baseConfig.default,
  test: {
    ...baseConfig.default.test,
    include: [`./test/${testFile}`],
    reporters: [
      'default',
      ['junit', { outputFile: `./reports/test-report-${testBaseName}.xml` }],
      ['@d2t/vitest-ctrf-json-reporter', { outputDir: './reports', outputFile: `ctrf-report-${testBaseName}.json` }],
      ['allure-vitest/reporter', { resultsDir: `./reports/allure-results-${testBaseName}` }]
    ]
  }
});
