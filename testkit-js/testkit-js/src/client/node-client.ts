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

import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { ContractState, LedgerState } from '@midnight-ntwrk/ledger';
import { getLedgerNetworkId, getNetworkId, networkIdToHex } from '@midnight-ntwrk/midnight-js-network-id';
import type { BlockHash } from '@midnight-ntwrk/midnight-js-types';
import axios, { type AxiosResponse } from 'axios';
import type { Logger } from 'pino';

import { extractHostnameAndPort } from '../utils';

/**
 * Client for interacting with a Midnight node's JSON-RPC API
 */
export class NodeClient {
  readonly nodeURL: string;
  private logger: Logger;

  /**
   * Creates a new NodeClient instance
   * @param {string} nodeURL - URL of the Midnight node
   * @param {Logger} logger - Logger instance for recording operations
   */
  constructor(nodeURL: string, logger: Logger) {
    this.nodeURL = nodeURL;
    this.logger = logger;
  }

  /**
   * Checks the health status of the node.
   * Makes a GET request to the health endpoint of the node.
   * @returns {Promise<AxiosResponse | void>} A promise that resolves to the response of the health check or logs an error if the request fails.
   */
  async health() {
    const url = `https://${extractHostnameAndPort(this.nodeURL)}/health`;
    return axios
      .get(url, { timeout: 1000 })
      .then((r) => {
        this.logger.info(`Connected to node ${url}: ${JSON.stringify(r.data)}`);
        return r;
      })
      .catch((error) => {
        this.logger.warn(`Failed to connect to node at '${url}'`, error);
      });
  }

  /**
   * Validates response format and throws if unexpected
   * @param {AxiosResponse} response - Response from node API
   * @throws {Error} If response format is unexpected
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static throwOnUnexpected(response: AxiosResponse<any, any>): void {
    if (typeof response.data !== 'object' || !response.data.result || typeof response.data.result !== 'string') {
      throw new Error(`Unexpected response format: ${JSON.stringify(response.data)}`);
    }
  }

  /**
   * Makes a JSON-RPC request to the node
   * @param {string} method - RPC method name
   * @param {any[]} params - RPC method parameters
   * @returns {Promise<string>} Response result as string
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async jsonRPC(method: string, params: any[]): Promise<string> {
    const response = await axios.post(
      this.nodeURL,
      {
        id: 1,
        jsonrpc: '2.0',
        method,
        params
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    this.logger.info(`Node response: ${response.statusText}`);
    NodeClient.throwOnUnexpected(response);
    return response.data.result;
  }

  /**
   * Fetches the state of a contract
   * @param {ContractAddress} contractAddress - Address of the contract
   * @returns {Promise<ContractState | null>} Contract state or null if not found
   */
  async contractState(contractAddress: ContractAddress): Promise<ContractState | null> {
    this.logger.info(`Fetching contract state for address '${contractAddress}'`);
    const result = await this.jsonRPC('midnight_contractState', [
      `${networkIdToHex(getNetworkId())}${contractAddress}`
    ]);
    return result === '' ? null : ContractState.deserialize(Buffer.from(result, 'hex'), getLedgerNetworkId());
  }

  /**
   * Fetches the ledger state at a given block
   * @param {BlockHash} blockHash - Hash of the block
   * @returns {Promise<LedgerState>} Ledger state
   */
  async ledgerState(blockHash: BlockHash): Promise<LedgerState> {
    const blob = await this.ledgerStateBlob(blockHash);
    return LedgerState.deserialize(blob, getLedgerNetworkId());
  }

  /**
   * Fetches the raw ledger state blob at a given block
   * @param {BlockHash} blockHash - Hash of the block
   * @returns {Promise<Uint8Array>} Raw ledger state data
   * @throws {Error} If no ledger state is found
   */
  async ledgerStateBlob(blockHash: BlockHash): Promise<Uint8Array> {
    this.logger.info(`Fetching ledger state at block hash '${blockHash}'`);
    const result = await this.jsonRPC('midnight_getLedgerState', []);
    if (result === '') {
      throw new Error(`No ledger state found at block hash '${blockHash}'`);
    }
    return Buffer.from(result.slice(4), 'hex');
  }

  /**
   * Fetches the ledger version at a given block
   * @param {BlockHash} blockHash - Hash of the block
   * @returns {Promise<string>} Ledger version
   * @throws {Error} If no ledger version is found
   */
  async ledgerVersion(blockHash: BlockHash): Promise<string> {
    this.logger.info(`Fetching ledger version at block hash '${blockHash}'`);
    const result = await this.jsonRPC('midnight_ledgerVersion', []);
    if (result === '') {
      throw new Error(`No ledger version found at block hash '${blockHash}'`);
    }
    return result;
  }
}
