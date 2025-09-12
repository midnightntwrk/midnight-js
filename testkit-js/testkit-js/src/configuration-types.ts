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

import { type WaitStrategy } from 'testcontainers';

/**
 * Configuration for a proof server container instance
 */
export interface ProofServerContainerConfiguration {
  /** Directory path where container configuration is located */
  path: string;
  /** Name of the container configuration file */
  fileName: string;
  /** Network endpoint configuration for the container */
  container: ContainerEndpoints;
}

/**
 * Network endpoint configuration for a container
 */
export interface ContainerEndpoints {
  /** Name of the container */
  name: string;
  /** Port number the container listens on */
  port: number;
  /** TestContainers WaitStrategy to use for container start */
  waitStrategy: WaitStrategy;
}

/**
 * Container endpoint configurations for standalone mode services
 */
export interface StandaloneContainerNames {
  /** Proof server container configuration */
  proofServer: ContainerEndpoints;
  /** Blockchain node container configuration */
  node: ContainerEndpoints;
  /** Indexer service container configuration */
  indexer: ContainerEndpoints;
}

/**
 * Configuration for standalone mode containers
 */
export interface StandaloneContainersConfiguration {
  /** Directory path where container configuration is located */
  path: string;
  /** Name of the container configuration file */
  fileName: string;
  /** Container endpoint configurations */
  container: StandaloneContainerNames;
}

/**
 * Configuration for test logging
 */
export interface LogConfiguration {
  /** Directory path where log files will be written */
  path: string;
  /** Name of the log file */
  fileName: string;
  /** Log level (e.g. 'info', 'debug', etc) */
  level: string;
}

/**
 * Top-level configuration for all test containers
 */
export interface ContainersConfiguration {
  /** Proof server container configuration */
  proofServer: ProofServerContainerConfiguration;
  /** Standalone mode containers configuration */
  standalone: StandaloneContainersConfiguration;
  /** Logging configuration */
  log: LogConfiguration;
}
