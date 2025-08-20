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

import { getNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { Logger } from 'pino';
import { DockerComposeEnvironment, type StartedDockerComposeEnvironment } from 'testcontainers';

import { getContainersConfiguration } from './configuration';
import type { ProofServerContainerConfiguration } from './configuration-types';

/**
 * Interface representing a proof server container that can be started and stopped.
 */
export interface ProofServerContainer {
  /**
   * Stops the proof server container.
   * @returns {Promise<void>} A promise that resolves when the container is stopped
   */
  stop(): Promise<void>;

  /**
   * Gets the URL where the proof server can be accessed.
   * @returns {string} The URL of the proof server
   */
  getUrl(): string;
}

/**
 * A proof server container that is started and stopped dynamically by the test
 * suite on random port.
 * @implements {ProofServerContainer}
 */
export class DynamicProofServerContainer implements ProofServerContainer {
  /** The Docker Compose environment running the container */
  public dockerEnv: StartedDockerComposeEnvironment;
  /** Unique identifier for the container instance */
  private uid: string;
  /** Configuration for the proof server container */
  private config: ProofServerContainerConfiguration;

  /**
   * Creates a new DynamicProofServerContainer instance.
   * @param {StartedDockerComposeEnvironment} dockerEnv - The started Docker Compose environment
   * @param {string} uid - Unique identifier for the container
   * @private
   */
  private constructor(dockerEnv: StartedDockerComposeEnvironment, uid: string) {
    this.dockerEnv = dockerEnv;
    this.uid = uid;
    this.config = getContainersConfiguration().proofServer;
  }

  /**
   * Starts a new proof server container.
   * @param {Logger} logger - Logger instance for recording operations
   * @param {string} [maybeUID] - Optional unique identifier for the container
   * @param {string} [maybeNetworkId] - Optional network ID for the container
   * @returns {Promise<DynamicProofServerContainer>} A promise that resolves to the new container instance
   * @static
   */
  static async start(logger: Logger, maybeUID?: string, maybeNetworkId?: string): Promise<DynamicProofServerContainer> {
    const config = getContainersConfiguration().proofServer;
    const uid = maybeUID ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
    const networkId = maybeNetworkId ?? NetworkId[getNetworkId()].toLowerCase();
    logger.info(
      `Starting proof server: path='${config.path}', file=${config.fileName}, networkId=${networkId}, uid=${uid}`
    );
    const dockerEnv = await new DockerComposeEnvironment(config.path, config.fileName)
      .withWaitStrategy(`${config.container.name}_${uid}`, config.container.waitStrategy)
      .withEnvironment({
        TESTCONTAINERS_UID: uid,
        NETWORK_ID: networkId
      })
      .up();
    return new DynamicProofServerContainer(dockerEnv, uid);
  }

  /**
   * Stops the proof server container.
   * @returns {Promise<void>} A promise that resolves when the container is stopped
   */
  async stop(): Promise<void> {
    await this.dockerEnv.stop();
  }

  /**
   * Gets the mapped port number for the container.
   * @returns {number} The mapped port number
   */
  getMappedPort(): number {
    return this.dockerEnv
      .getContainer(`${this.config.container.name}_${this.uid}`)
      .getMappedPort(this.config.container.port);
  }

  /**
   * Gets the URL where the proof server can be accessed.
   * @returns {string} The URL of the proof server
   */
  getUrl(): string {
    return `http://localhost:${this.getMappedPort()}`;
  }
}

/**
 * A proof server that is currently running on a specific port.
 * Used for connecting to an existing proof server instance.
 * @implements {ProofServerContainer}
 */
export class StaticProofServerContainer implements ProofServerContainer {
  /** The port number where the proof server is running */
  port: number;

  /**
   * Creates a new StaticProofServerContainer instance.
   * @param {number} port - The port number where the proof server is running (default: 6300)
   */
  constructor(port = 6300) {
    this.port = port;
  }

  /**
   * Gets the URL where the proof server can be accessed.
   * @returns {string} The URL of the proof server
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * No-op stop method since this represents an external proof server.
   * @returns {Promise<void>} A resolved promise
   */
   
  stop(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
