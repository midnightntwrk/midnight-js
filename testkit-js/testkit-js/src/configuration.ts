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

import path from 'path';
import { Wait } from 'testcontainers';

import type { ContainersConfiguration } from './configuration-types';

const currentWorkingDir = path.resolve(`${process.cwd()}`);

export const defaultContainersConfiguration: ContainersConfiguration = {
  proofServer: {
    path: currentWorkingDir,
    fileName: 'proof-server.yml',
    container: {
      name: 'proof-server',
      port: 6300,
      waitStrategy: Wait.forLogMessage('Actix runtime found; starting in Actix runtime')
    }
  },
  standalone: {
    path: currentWorkingDir,
    fileName: 'compose.yml',
    container: {
      proofServer: {
        name: 'proof-server',
        port: 6300,
        waitStrategy: Wait.forLogMessage('Actix runtime found; starting in Actix runtime')
      },
      node: {
        name: 'node',
        port: 9944,
        waitStrategy: Wait.forListeningPorts()
      },
      indexer: {
        name: 'indexer',
        port: 8088,
        waitStrategy: Wait.forListeningPorts()
      }
    }
  },
  log: {
    fileName: `tests_${new Date().toISOString().replace(/:/g, '_')}.log`,
    path: path.resolve(currentWorkingDir, 'logs', 'tests'),
    level: 'info' as const
  }
};

export const latestContainersConfiguration: ContainersConfiguration = {
  ...defaultContainersConfiguration,
  standalone: {
    ...defaultContainersConfiguration.standalone,
    fileName: 'compose-latest.yml'
  },
  proofServer: {
    ...defaultContainersConfiguration.proofServer,
    fileName: 'proof-server-latest.yml'
  }
};

let containersConfiguration = defaultContainersConfiguration;

export const getContainersConfiguration = () => {
  return containersConfiguration;
};

export const setContainersConfiguration = (containersConfig: ContainersConfiguration) => {
  containersConfiguration = containersConfig;
};
