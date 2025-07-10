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

import type { Logger } from 'pino';
import axios from 'axios';
import { extractHostnameAndPort } from '../utils';

/**
 * Client for interacting with the Midnight faucet service.
 * Provides functionality to request test tokens for wallet addresses.
 */
export class FaucetClient {
  readonly faucetUrl: string;
  private logger: Logger;

  /**
   * Creates a new FaucetClient instance.
   * @param {string} faucetUrl - The URL of the faucet service endpoint
   * @param {Logger} logger - Logger instance for recording operations
   */
  constructor(faucetUrl: string, logger: Logger) {
    this.faucetUrl = faucetUrl;
    this.logger = logger;
  }

  /**
   * Checks the health status of the faucet service.
   * Makes a GET request to the health endpoint of the faucet service.
   * @returns {Promise<AxiosResponse | void>} A promise that resolves to the response of the health check or logs an error if the request fails
   */
  async health() {
    const url = `https://${extractHostnameAndPort(this.faucetUrl)}/api/health`;
    return axios
      .get(url, { timeout: 1000 })
      .then((r) => {
        this.logger.info(`Connected to faucet ${url}: ${JSON.stringify(r.data)}`);
        return r;
      })
      .catch((error) => {
        this.logger.warn(`Failed to connect to faucet service at '${url}'`, error);
      });
  }

  /**
   * Requests test tokens from the faucet for a specified wallet address.
   * Makes a POST request to the faucet service with the wallet address.
   * @param {string} walletAddress - The address to receive the test tokens
   * @returns {Promise<void>} A promise that resolves when the request is complete
   * @throws Will log but not throw if the request fails
   */
  async requestTokens(walletAddress: string): Promise<void> {
    this.logger.info(`Requesting tokens from '${this.faucetUrl}' for address: '${walletAddress}'`);
    try {
      const response = await axios.post(
        this.faucetUrl,
        {
          address: walletAddress,
          captchaToken: 'XXXX.DUMMY.TOKEN.XXXX'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-turnstile-token': process.env.TURNSTILE_HEADER ?? ''
          }
        }
      );
      this.logger.info(`Faucet response: ${response.statusText}`);
    } catch (error) {
      this.logger.error('Error requesting tokens:', error);
    }
  }
}
