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

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Standalone config for the root build-tooling scripts. The root vitest.config
// drives package tests via `projects`, so these tests live in their own config,
// run with `yarn test:scripts`. The suites execute the scripts as child
// processes against throwaway fixtures, so they are slower than in-process unit
// tests but exercise real exit codes and filesystem effects.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['scripts/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000
  }
});
