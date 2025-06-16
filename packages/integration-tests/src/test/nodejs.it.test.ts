// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import path from 'path';
import { spawn } from 'node:child_process';
import { logger } from '@midnight-ntwrk/midnight-js-testing';
import { type DoneCallback } from 'vitest';

function runNodeAndExpectExitCode(
  scriptPath: string,
  expectedExitCode: number,
  done: DoneCallback
) {
  const child = spawn('node', [scriptPath], { cwd: process.cwd(), stdio: 'inherit' });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (data) => {
    stdout += data.toString();
  });

  child.stderr?.on('data', (data) => {
    stderr += data.toString();
  });

  child.on('error', (err) => {
    logger.error('Error spawning child process:', err);
    done(err);
  });

  child.on('close', (code) => {
    if (stdout) {
      logger.info('Standard output:', stdout);
    }
    if (stderr) {
      logger.warn('Standard error:', stderr);
    }

    try {
      expect(code).toBe(expectedExitCode);
      done();
    } catch (err) {
      done(err as Error);
    }
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
  test('should run ESM module successfully', (done: DoneCallback) => {
    runNodeAndExpectExitCode(path.resolve('./dist/counter.mjs'), 0, done);
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
  test('should run CJS module with expected exit code', (done: DoneCallback) => {
    runNodeAndExpectExitCode(path.resolve('./dist/counter.cjs'), 1, done);
  });
});
