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

import { rm } from 'node:fs/promises';
import path from 'path';
import { logger } from './logger';

export const MINUTE = 60_000;

/**
 * Creates a Promise that resolves after a specified delay.
 * @param ms The delay duration in milliseconds.
 * @returns A Promise that resolves after the specified delay.
 * @example
 * // Wait for 1 second
 * await delay(1000);
 */
export const delay = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * Deletes a directory and its contents recursively.
 * @param {string} dirPath - The path to the directory to delete
 * @returns {Promise<void>} A promise that resolves when the directory is deleted
 * @private
 */
export const deleteDirectory = async (dirPath: string) => {
  try {
    const resolvedPath = path.resolve(dirPath);
    await rm(resolvedPath, { recursive: true, force: true });
    logger.info(`Directory ${resolvedPath} deleted successfully.`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error deleting directory: ${error.message}`);
    } else {
      logger.error('Unknown error occurred');
    }
  }
};

export const extractHostnameAndPort = (url: string): string => {
  const { hostname, port } = new URL(url);
  if (port !== '') {
    return `${hostname}:${port}`;
  }
  return hostname;
};
