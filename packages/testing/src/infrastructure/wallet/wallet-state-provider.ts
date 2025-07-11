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

import fs from 'node:fs';
import { type Logger } from 'pino';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { GzipFile } from './gzip-file';
import { getEnvVarEnvironment } from '../env-vars';

/** Default directory path for storing wallet state files */
export const DEFAULT_WALLET_STATE_DIRECTORY = `./.states`;

/**
 * Generates a filename for the wallet state file based on environment and optional seed
 * @returns {string} Generated filename for the wallet state
 * @param seed
 */
export const getWalletStateFilename = (seed: string | undefined) => {
  if (seed === undefined) {
    return `wallet.${getEnvVarEnvironment()}.state.gz`;
  }
  return `wallet.${getEnvVarEnvironment()}.${seed}.state.gz`;
};

/**
 * Provider class for saving and loading wallet state to/from compressed files
 */
export class WalletSaveStateProvider {
  /** Logger instance for recording operations */
  logger: Logger;
  /** Absolute path to the directory containing wallet state files */
  directoryPath: string;
  /** Full path including filename for the wallet state file */
  filePath: string;

  /**
   * Creates a new WalletSaveStateProvider instance
   * @param {Logger} logger - Logger instance for recording operations
   * @param seed
   * @param {string} [directoryPath=DEFAULT_WALLET_STATE_DIRECTORY] - Directory path for wallet state files
   * @param {string} [filename] - Filename for the wallet state file
   */
  constructor(
    logger: Logger,
    seed: string,
    directoryPath: string = DEFAULT_WALLET_STATE_DIRECTORY,
    filename: string = getWalletStateFilename(seed)
  ) {
    this.logger = logger;
    if (!directoryPath.startsWith('/')) {
      this.directoryPath = `${process.cwd()}/${directoryPath}`;
    } else {
      this.directoryPath = directoryPath;
    }
    this.filePath = `${this.directoryPath}/${filename}`;
  }

  /**
   * Saves the wallet state to a compressed file
   * @param {Wallet} wallet - The wallet instance to save state from
   * @returns {Promise<void>} A promise that resolves when the save is complete
   */
  async save(wallet: Wallet) {
    this.logger.info(`Saving state in ${this.filePath}`);
    try {
      fs.mkdirSync(this.directoryPath, { recursive: true });
      const serializedState = await wallet.serializeState();
      try {
        const tempFile = `${this.filePath.replaceAll('.gz', '')}`;
        fs.writeFileSync(tempFile, serializedState);
        this.logger.info(`File '${tempFile}' written successfully.`);
        await new GzipFile(tempFile, `${this.filePath.replaceAll('.gz', '')}.gz`).compress();
        fs.rmSync(tempFile);
        this.logger.info(`File '${this.filePath}' written successfully.`);
      } catch (err) {
        this.logger.error(`Error writing file '${this.filePath}': ${err instanceof Error ? err.message : String(err)}`);
      }
    } catch (e) {
      this.logger.warn(e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Loads and decompresses the wallet state from a file
   * @returns {Promise<string>} A promise that resolves with the decompressed wallet state as a string
   * @throws {Error} If there is an error reading or decompressing the file
   */
  async load() {
    this.logger.info(`Loading state from ${this.filePath}`);
    try {
      return await new GzipFile(this.filePath, `${this.filePath.replaceAll('.gz', '')}.gz`).decompress();
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}
