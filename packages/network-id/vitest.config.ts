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

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      enabled: true,
      clean: true,
      include: ['src/**/*.ts'],
      exclude: ['**/test/**'],
      reporter: ['clover', 'json', 'json-summary', 'lcov', 'text'],
      reportsDirectory: './coverage'
    },
    reporters: [
      'default',
      ['junit', { outputFile: `reports/report/test-report.xml` }],
      ['html', { outputFile: `reports/report/test-report.html` }]
    ]
  },
  resolve: {
    alias: {
      '@midnight-ntwrk/onchain-runtime': '@midnight-ntwrk/onchain-runtime-cjs'
    }
  }
});
