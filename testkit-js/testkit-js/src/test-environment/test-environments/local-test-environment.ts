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

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import type { Logger } from 'pino';
import { DockerComposeEnvironment, type StartedDockerComposeEnvironment } from 'testcontainers';

import { getContainersConfiguration } from '@/configuration';
import type { StandaloneContainersConfiguration } from '@/configuration-types';
import { getEnvVarWalletSeeds } from '@/env-vars';
import type { ProofServerContainer } from '@/proof-server-container';
import type { EnvironmentConfiguration } from '@/test-environment';
import { MidnightWalletProvider } from '@/wallet';

import { TestEnvironment } from './test-environment';

/**
 * Configuration for component ports in the local test environment
 */
export type ComponentPortsConfiguration = {
  indexer: number;
  node: number;
  proofServer: number;
}

/**
 * Configuration class for local test environment implementing EnvironmentConfiguration
 */
export class LocalTestConfiguration implements EnvironmentConfiguration {
  readonly walletNetworkId: NetworkId.NetworkId;
  readonly networkId: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly faucet: string | undefined;

  /**
   * Creates a new LocalTestConfiguration instance
   * @param {ComponentPortsConfiguration} ports - Object containing port numbers for each component
   */
  constructor({ indexer, node, proofServer }: ComponentPortsConfiguration) {
    this.walletNetworkId = NetworkId.NetworkId.Undeployed;
    this.networkId = 'undeployed';
    this.indexer = `http://127.0.0.1:${indexer}/api/v1/graphql`;
    this.indexerWS = `ws://127.0.0.1:${indexer}/api/v1/graphql/ws`;
    this.node = `http://127.0.0.1:${node}`;
    this.proofServer = `http://127.0.0.1:${proofServer}`;
    this.faucet = undefined;
  }
}

/**
 * Test environment for local development using Docker containers
 * Manages containers for node, indexer and proof server components
 */
export class LocalTestEnvironment extends TestEnvironment {
  static readonly MAX_NUMBER_OF_WALLETS = 4;
  readonly genesisMintWalletSeed = [
    '0000000000000000000000000000000000000000000000000000000000000001',
    '0000000000000000000000000000000000000000000000000000000000000002',
    '0000000000000000000000000000000000000000000000000000000000000003',
    '0000000000000000000000000000000000000000000000000000000000000004'
  ];

  private config: StandaloneContainersConfiguration;
  private environmentConfiguration: EnvironmentConfiguration;
  public dockerEnv: StartedDockerComposeEnvironment;
  private walletProviders: MidnightWalletProvider[];

  /**
   * Creates a new LocalTestEnvironment instance
   * @param {Logger} logger - Logger instance for recording operations
   */
  constructor(logger: Logger) {
    super(logger);
    this.config = getContainersConfiguration().standalone;
  }

  /**
   * Returns the configuration for the testnet environment services.
   * @returns {EnvironmentConfiguration} Object containing URLs for testnet services:
   * - indexer: GraphQL API endpoint for the indexer
   * - indexerWS: WebSocket endpoint for the indexer
   * - node: RPC endpoint for the blockchain node
   * - faucet: API endpoint for requesting test tokens
   * - proofServer: URL for the proof generation server
   */
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      walletNetworkId: this.environmentConfiguration?.walletNetworkId,
      networkId: this.environmentConfiguration?.networkId,
      indexer: this.environmentConfiguration?.indexer,
      indexerWS: this.environmentConfiguration?.indexerWS,
      node: this.environmentConfiguration?.node,
      faucet: this.environmentConfiguration?.faucet,
      proofServer: this.environmentConfiguration?.proofServer
    };
  }

  /**
   * Gets the mapped ports for all containers in the environment
   * @returns {ComponentPortsConfiguration} Object containing mapped port numbers
   * @private
   */
  private getMappedPorts = (): { indexer: number; node: number; proofServer: number } => ({
    indexer: this.dockerEnv
      .getContainer(`${this.config.container.indexer.name}_${this.uid}`)
      .getMappedPort(this.config.container.indexer.port),
    node: this.dockerEnv
      .getContainer(`${this.config.container.node.name}_${this.uid}`)
      .getMappedPort(this.config.container.node.port),
    proofServer: this.dockerEnv
      .getContainer(`${this.config.container.proofServer.name}_${this.uid}`)
      .getMappedPort(this.config.container.proofServer.port)
  });

  /**
   * Instead of starting the test environment by building the docker containers
   * from the default configuration files in this package, start the test environment
   * by passing an existing {@link StartedDockerComposeEnvironment} along with the
   * ports for the containers in the environment.
   *
   * @param {StartedDockerComposeEnvironment} dockerEnv - A started docker compose environment
   * @param {ComponentPortsConfiguration} ports - The ports of the containers in the given environment
   * @returns {Promise<EnvironmentConfiguration>} The environment configuration
   */
  startWithInjectedEnvironment = async (
    dockerEnv: StartedDockerComposeEnvironment,
    ports: ComponentPortsConfiguration
  ): Promise<EnvironmentConfiguration> => {
    this.logger.info(`Starting test environment...`);
    this.dockerEnv = dockerEnv;
    this.environmentConfiguration = new LocalTestConfiguration(ports);
    this.logger.info(`Test environment configuration: ${JSON.stringify(this.environmentConfiguration)}`);
    return this.environmentConfiguration;
  };

  /**
   * Starts the test environment by creating and configuring Docker containers
   * @param {ProofServerContainer} maybeProofServerContainer - Optional proof server container
   * @returns {Promise<EnvironmentConfiguration>} The environment configuration
   * @throws {Error} If trying to inject proof server container when starting new environment
   */
  start = async (maybeProofServerContainer?: ProofServerContainer) => {
    this.logger.info(
      `Starting test environment... path=${this.config.path}, file=${this.config.fileName}, uid=${this.uid}`
    );
    if (maybeProofServerContainer) {
      throw new Error(
        'Invalid usage, trying to inject proof server container instance when starting new test environment with another proof server...'
      );
    }
    this.dockerEnv = await new DockerComposeEnvironment(this.config.path, this.config.fileName)
      .withWaitStrategy(
        `${this.config.container.proofServer.name}_${this.uid}`,
        this.config.container.proofServer.waitStrategy
      )
      .withWaitStrategy(`${this.config.container.node.name}_${this.uid}`, this.config.container.node.waitStrategy)
      .withWaitStrategy(`${this.config.container.indexer.name}_${this.uid}`, this.config.container.indexer.waitStrategy)
      .withEnvironment({
        TESTCONTAINERS_UID: this.uid,
        NETWORK_ID: getNetworkId()
      })
      .up();
    this.environmentConfiguration = new LocalTestConfiguration(this.getMappedPorts());
    this.logger.info(`Test environment configuration: ${JSON.stringify(this.environmentConfiguration)}`);
    return this.environmentConfiguration;
  };

  /**
   * Shuts down the test environment, closing walletProviders and stopping containers
   * @returns {Promise<void>}
   */
  shutdown = async (saveWalletState?: boolean) => {
    this.logger.info(`Shutting down test environment...`);
    if (this.walletProviders) {
      if (saveWalletState) {
        this.logger.warn('Skipping wallet save state as it is obsolete in this context...');
      }
      await Promise.all(this.walletProviders.map((wallet) => wallet.stop()));
    }
    if (this.dockerEnv) {
      await this.dockerEnv.down({ timeout: 10000, removeVolumes: true });
    }
  };

  /**
   * Creates and starts the specified number of wallet providers
   * @throws {Error} If requested amount exceeds maximum supported walletProviders
   * @returns {Promise<MidnightWalletProvider[]>} A promise that resolves to an array of started wallets
   */
  startMidnightWalletProviders = async (
    amount = 1,
    seeds: string[] | undefined = getEnvVarWalletSeeds()
  ): Promise<MidnightWalletProvider[]> => {
    this.logger.info(`Getting ${amount} wallets...`);
    if (seeds) {
      this.logger.warn('Provided seeds will be ignored, using genesis mint wallet seeds');
    }
    if (amount > LocalTestEnvironment.MAX_NUMBER_OF_WALLETS) {
      throw new Error(
        `Maximum supported number of wallets for this environment reached: ${LocalTestEnvironment.MAX_NUMBER_OF_WALLETS}`
      );
    }
    this.walletProviders = await Promise.all(
      Array.from({ length: amount }).map((_elem, index) =>
        MidnightWalletProvider.build(this.logger, this.environmentConfiguration, this.genesisMintWalletSeed[index])
      )
    );
    await Promise.all(this.walletProviders.map((wallet) => wallet.start()));
    return this.walletProviders;
  };
}
