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

import type { ProverKey, VerifierKey, ZKIR } from '@midnight-ntwrk/midnight-js-types';
import { createProverKey, createVerifierKey, createZKIR, ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * The name of the directory containing proving and verifying keys.
 */
const KEY_DIR = 'keys';
/**
 * File extension for proving keys.
 */
const PROVER_EXT = '.prover';
/**
 * File extension for verifying keys.
 */
const VERIFIER_EXT = '.verifier';
/**
 * The name of the directory containing zkIRs.
 */
const ZKIR_DIR = 'zkir';
/**
 * File extension for zkIRs.
 */
const ZKIR_EXT = '.bzkir';

/**
 * Implementation of {@link ZKConfigProvider} that reads the keys and zkIR from the local filesystem.
 * @typeParam K - The type of the circuit ID used by the provider.
 */
export class NodeZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  /**
   * @param directory The path to the base directory containing the key and ZKIR subdirectories.
   */
  constructor(readonly directory: string) {
    super();
  }

  /**
   * Reads a file from the local filesystem.
   * @param subDir The subdirectory of the base-directory to read from.
   * @param circuitId The circuit ID corresponding to the file to read.
   * @param ext The file extension of the file to read.
   * @private
   */
  private readFile(subDir: string, circuitId: K, ext: string): Promise<Buffer> {
    return fs.readFile(path.join(this.directory, subDir, circuitId + ext));
  }

  /**
   * {@link ZKConfigProvider.getProverKey}
   */
  getProverKey(circuitId: K): Promise<ProverKey> {
    return this.readFile(KEY_DIR, circuitId, PROVER_EXT).then(createProverKey);
  }

  /**
   * {@link ZKConfigProvider.getVerifierKey}
   */
  getVerifierKey(circuitId: K): Promise<VerifierKey> {
    return this.readFile(KEY_DIR, circuitId, VERIFIER_EXT).then(createVerifierKey);
  }

  /**
   * {@link ZKConfigProvider.getZKIR}
   */
  getZKIR(circuitId: K): Promise<ZKIR> {
    return this.readFile(ZKIR_DIR, circuitId, ZKIR_EXT).then(createZKIR);
  }
}
