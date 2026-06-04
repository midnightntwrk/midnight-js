/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
import { createProverKey, createVerifierKey, createZKIR, ZKConfigProvider, ZKConfigRegistry } from '@midnight-ntwrk/midnight-js-types';
import { assertSafeName } from '@midnight-ntwrk/midnight-js-utils';
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
  private async readFile(subDir: string, circuitId: K, ext: string): Promise<Buffer> {
    assertSafeName(circuitId, 'circuitId');
    const baseDir = path.resolve(this.directory, subDir);
    const target = path.resolve(baseDir, circuitId + ext);
    const rel = path.relative(baseDir, target);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
      throw new Error(`Invalid circuitId: ${JSON.stringify(circuitId)}`);
    }
    return fs.readFile(target);
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

/**
 * Returns `true` if `directory` is a compiled contract artifact bundle — a `compactc` output
 * directory containing `keys/` and `zkir/` subdirectories.
 */
const isArtifactBundle = async (directory: string): Promise<boolean> => {
  const isDir = async (subDir: string): Promise<boolean> => {
    try {
      return (await fs.stat(path.join(directory, subDir))).isDirectory();
    } catch {
      return false;
    }
  };
  return (await isDir(KEY_DIR)) && (await isDir(ZKIR_DIR));
};

/**
 * Creates a {@link ZKConfigRegistry} by discovering every compiled contract artifact bundle under
 * a directory tree.
 *
 * This is the zero-configuration way to provide ZK artifacts for transactions that make
 * cross-contract calls: point it at the project's artifact root (for example the directory
 * containing the `compactc` `managed/<contract>` outputs, or the project root itself) and every
 * bundle found — any directory containing `keys/` and `zkir/` subdirectories — becomes a registry
 * source. No addresses are registered and no per-contract enumeration is needed; the registry
 * binds deployed contracts to bundles by verifier key at resolution time.
 *
 * `node_modules` and hidden directories are not descended into, and discovery stops at a bundle
 * (bundles do not nest).
 *
 * @param artifactRoot The directory to search for artifact bundles.
 * @throws Error If no artifact bundle exists under `artifactRoot`.
 */
export const nodeZkConfigRegistry = async (artifactRoot: string): Promise<ZKConfigRegistry> => {
  const sources: NodeZkConfigProvider<string>[] = [];
  const visit = async (directory: string): Promise<void> => {
    if (await isArtifactBundle(directory)) {
      sources.push(new NodeZkConfigProvider(directory));
      return;
    }
    const entries = await fs.readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.'))
        .map((entry) => visit(path.join(directory, entry.name)))
    );
  };
  await visit(path.resolve(artifactRoot));
  if (sources.length === 0) {
    throw new Error(
      `No compiled contract artifact bundles (directories containing '${KEY_DIR}/' and '${ZKIR_DIR}/' subdirectories) found under '${artifactRoot}'`
    );
  }
  return new ZKConfigRegistry(sources);
};
