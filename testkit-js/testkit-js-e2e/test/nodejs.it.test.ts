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

import { spawn } from 'node:child_process';

import { logger } from '@midnight-ntwrk/testkit-js';
import path from 'path';

function runNodeAndExpectExitCode(scriptPath: string, expectedExitCode: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [
      '--experimental-require-module',
      scriptPath
    ], {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('error', (err: Error) => {
      logger.error(`Error spawning child process: ${err.message}`);
      reject(err);
    });

    child.on('close', (code: number | null) => {
      if (stdout) {
        logger.info(`Standard output: ${stdout}`);
      }
      if (stderr) {
        logger.warn(`Standard error: ${stderr}`);
      }

      try {
        expect(code).toBe(expectedExitCode);
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}

describe('Ledger API - NodeJS Integration Tests', () => {
  /**
   * Test ESM module execution in Node.js environment.
   *
   * @given A built ESM counter module
   * @and Node.js runtime environment
   * @when Executing the ESM module with expected exit code 0
   * @then Should run successfully without errors
   * @and Should complete with proper exit status
   */
  test('should run ESM module successfully', async () => {
    await runNodeAndExpectExitCode(path.resolve('./dist/counter.mjs'), 0);
  });

  /**
   * Test CJS module execution in Node.js environment.
   *
   * @given A built CJS counter module
   * @and Node.js runtime environment
   * @when Executing the CJS module with expected exit code 1
   * @then Should run and complete with expected error exit status
   * @and Should handle CJS module loading properly
   * @bug Expected exit code 1 indicates intentional failure behavior in test setup
   */
  test('should run CJS module with expected exit code', async () => {
    await runNodeAndExpectExitCode(path.resolve('./dist/counter.cjs'), 0);
  });
});
