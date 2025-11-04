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

import axios from 'axios';
import type { Logger } from 'pino';

import { extractHostnameAndPort } from '@/utils';

export class IndexerClient {
  readonly indexerUrl: string;
  private logger: Logger;

  /**
   * Creates an instance of IndexerClient.
   * @param {string} indexerUrl - The URL of the indexer service.
   * @param {Logger} logger - The logger instance for logging information.
   */
  constructor(indexerUrl: string, logger: Logger) {
    this.indexerUrl = indexerUrl;
    this.logger = logger;
  }

  /**
   * Checks the health status of the indexer service.
   * Makes a GET request to the status endpoint of the indexer service.
   * @returns {Promise<AxiosResponse | void>} A promise that resolves to the response of the health check or logs an error if the request fails.
   */
  async health() {
    const url = `https://${extractHostnameAndPort(this.indexerUrl)}/ready`;
    return axios
      .get(url, { timeout: 1000 })
      .then((r) => {
        this.logger.info(`Connected to indexer ${url}: ${JSON.stringify(r.data)}`);
        return r;
      })
      .catch((error) => {
        this.logger.warn(`Failed to connect to indexer at '${url}'`, error);
      });
  }
}
