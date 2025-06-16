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
import type { Logger } from 'pino';
import axios, { type AxiosRequestConfig } from 'axios';
import { extractHostnameAndPort } from '../utils';

export class ProofServerClient {
  readonly proofServer: string;
  private logger: Logger;

  /**
   * Creates an instance of ProofServerClient.
   * @param {string} proofServer - The URL of the proof server service.
   * @param {Logger} logger - The logger instance for logging information.
   */
  constructor(proofServer: string, logger: Logger) {
    this.proofServer = proofServer;
    this.logger = logger;
  }

  /**
   * Checks the health status of the indexer service.
   * Makes a GET request to the status endpoint of the indexer service.
   * @returns {Promise<AxiosResponse | void>} A promise that resolves to the response of the health check or logs an error if the request fails.
   */
  async health() {
    const url = `http://${extractHostnameAndPort(this.proofServer)}/health`;
    return axios
      .get(url, { timeout: 1000 })
      .then((r) => {
        this.logger.info(`Connected to proof server ${url}: ${JSON.stringify(r.data)}`);
        return r;
      })
      .catch((error) => {
        this.logger.warn(`Failed to connect to proof server at '${url}'`, error);
      });
  }

  /**
   * Proves a transaction by sending a POST request to the proof server.
   * @param data serialized transaction data
   * @param config Axios request configuration
   */
  async proveTx(
    data?: ArrayBuffer,
    config: AxiosRequestConfig = {
      timeout: 3 * 60_000
    }
  ) {
    const url = `http://${extractHostnameAndPort(this.proofServer)}/prove-tx`;
    return axios
      .post(url, data, config)
      .then((r) => {
        this.logger.info(`Received data from proof server ${url}`);
        return r;
      })
      .catch((error) => {
        this.logger.error(`Error in proof server at '${url}' ${error.toString()}`);
      });
  }
}
