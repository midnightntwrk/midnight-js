/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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
import {
  assertManifestHash,
  assertSafeName,
  parseZkArtifactManifest,
  parseZkArtifactRuntimeVersion,
  verifyZkArtifactIntegrity,
  ZK_CONTRACT_INFO_FILE_NAME,
  ZK_MANIFEST_DIR,
  ZK_MANIFEST_FILE_NAME,
  ZkArtifactContractInfoError,
  ZkArtifactIntegrityError,
  type ZkArtifactManifest,
  type ZkConfigIntegrityOptions
} from '@midnight-ntwrk/midnight-js-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

const KEY_DIR = 'keys';
const PROVER_EXT = '.prover';
const VERIFIER_EXT = '.verifier';
const ZKIR_DIR = 'zkir';
const ZKIR_EXT = '.bzkir';

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

/**
 * {@link ZKConfigProvider} that reads keys and zkIR from the local filesystem and verifies them
 * against the `compactc` integrity manifest.
 * @typeParam K - The type of the circuit ID used by the provider.
 */
export class NodeZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  private manifestPromise?: Promise<ZkArtifactManifest | undefined>;
  private runtimeVersionPromise?: Promise<string>;

  /**
   * @param directory The base directory containing the key and ZKIR subdirectories.
   * @param integrityOptions Integrity-verification options.
   */
  constructor(
    readonly directory: string,
    private readonly integrityOptions: ZkConfigIntegrityOptions = {}
  ) {
    super();
  }

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

  private loadManifest(): Promise<ZkArtifactManifest | undefined> {
    if (this.manifestPromise === undefined) {
      const promise = this.readManifest();
      this.manifestPromise = promise;
      promise.catch(() => {
        if (this.manifestPromise === promise) {
          this.manifestPromise = undefined;
        }
      });
    }
    return this.manifestPromise;
  }

  private async readManifest(): Promise<ZkArtifactManifest | undefined> {
    const manifestPath = path.resolve(this.directory, ZK_MANIFEST_DIR, ZK_MANIFEST_FILE_NAME);
    const { expectedManifestHash } = this.integrityOptions;
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(manifestPath);
    } catch (error) {
      if (isErrnoException(error) && error.code === 'ENOENT') {
        if (expectedManifestHash !== undefined) {
          throw new ZkArtifactIntegrityError(
            `Expected ZK artifact manifest at ${manifestPath} but it was not found`,
            { cause: error }
          );
        }
        return undefined;
      }
      throw error;
    }
    if (expectedManifestHash !== undefined) {
      assertManifestHash(bytes, expectedManifestHash);
    }
    return parseZkArtifactManifest(bytes.toString('utf-8'));
  }

  /**
   * Reports the `compact-runtime` this bundle was built against, preferring the source an
   * application can anchor to a hash it controls.
   *
   * The INTEGRITY MANIFEST is consulted first, because `expectedManifestHash` pins it to a digest
   * the application supplies at build time, while everything else in the bundle is fetched from the
   * same place as the artifacts it describes. This value selects which ledger pipeline executes the
   * call, so whoever serves the artifacts must not be the one who decides it.
   *
   * `compiler/contract-info.json` is the fallback, for bundles that carry no manifest at all --
   * `compactc` only began emitting one in 0.33, which is exactly the retained-era case. It is put
   * through the same integrity gate as every key and ZKIR, so under the default `require` an
   * unvouched-for description is refused rather than trusted.
   *
   * Cached per provider instance, like the manifest and for the same reason: the answer is one
   * statement about the whole bundle. A FAILED read is not cached.
   *
   * @returns The declared runtime version, verbatim.
   * @throws ZkArtifactContractInfoError if the description is absent or declares no runtime version.
   * Absence is a refusal rather than a default: this framework cannot name an artifact set's era on
   * its behalf.
   * @throws ZkArtifactIntegrityError if the description is not covered by the manifest under a mode
   * that requires it.
   */
  override async getArtifactRuntimeVersion(): Promise<string> {
    // The cached promise CLEARS ITSELF on failure, so a transient error is retried rather than
    // remembered. Written as one self-clearing chain rather than as a stored promise compared
    // against the slot: nothing can replace the slot between the rejection and this handler, so a
    // comparison would only add a branch no test can reach.
    this.runtimeVersionPromise ??= this.readRuntimeVersion().catch((error: unknown) => {
      this.runtimeVersionPromise = undefined;
      throw error;
    });
    return this.runtimeVersionPromise;
  }

  private async readRuntimeVersion(): Promise<string> {
    const manifest = await this.loadManifest();
    if (manifest?.runtimeVersion !== undefined) {
      return manifest.runtimeVersion;
    }

    const infoPath = path.resolve(this.directory, ZK_MANIFEST_DIR, ZK_CONTRACT_INFO_FILE_NAME);
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(infoPath);
    } catch (error) {
      if (isErrnoException(error) && error.code === 'ENOENT') {
        throw new ZkArtifactContractInfoError(
          `No ${ZK_CONTRACT_INFO_FILE_NAME} was found at ${infoPath}, so the era of these artifacts ` +
            `cannot be established. Serve the compiler output directory that compactc emits beside ` +
            `the keys.`,
          { cause: error }
        );
      }
      throw error;
    }
    verifyZkArtifactIntegrity({
      manifest,
      relativePath: `${ZK_MANIFEST_DIR}/${ZK_CONTRACT_INFO_FILE_NAME}`,
      bytes,
      mode: this.integrityOptions.verify ?? 'require',
      onWarn: this.integrityOptions.onWarn
    });

    return parseZkArtifactRuntimeVersion(bytes.toString('utf-8'));
  }

  private async verifyArtifact(subDir: typeof KEY_DIR | typeof ZKIR_DIR, fileName: string, bytes: Uint8Array): Promise<void> {
    const manifest = await this.loadManifest();
    verifyZkArtifactIntegrity({
      manifest,
      relativePath: `${subDir}/${fileName}`,
      bytes,
      mode: this.integrityOptions.verify ?? 'require',
      onWarn: this.integrityOptions.onWarn
    });
  }

  async getProverKey(circuitId: K): Promise<ProverKey> {
    const bytes = await this.readFile(KEY_DIR, circuitId, PROVER_EXT);
    await this.verifyArtifact(KEY_DIR, `${circuitId}${PROVER_EXT}`, bytes);
    return createProverKey(bytes);
  }

  async getVerifierKey(circuitId: K): Promise<VerifierKey> {
    const bytes = await this.readFile(KEY_DIR, circuitId, VERIFIER_EXT);
    await this.verifyArtifact(KEY_DIR, `${circuitId}${VERIFIER_EXT}`, bytes);
    return createVerifierKey(bytes);
  }

  async getZKIR(circuitId: K): Promise<ZKIR> {
    const bytes = await this.readFile(ZKIR_DIR, circuitId, ZKIR_EXT);
    await this.verifyArtifact(ZKIR_DIR, `${circuitId}${ZKIR_EXT}`, bytes);
    return createZKIR(bytes);
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
    } catch (error) {
      // Only a genuinely absent path means "not a bundle here". Any other failure (e.g. EACCES) is a
      // real IO error and must propagate rather than silently drop a bundle, consistent with
      // `readManifest` in this file.
      if (isErrnoException(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
        return false;
      }
      throw error;
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

/**
 * Options for {@link nodeZkConfigProvider}. Combines the artifact `directory` with integrity options.
 */
export interface NodeZkConfigProviderOptions extends ZkConfigIntegrityOptions {
  /** The base directory containing the key and ZKIR subdirectories. */
  readonly directory: string;
}

/**
 * Factory for {@link NodeZkConfigProvider} following the `provider(options)` convention.
 *
 * @typeParam K - The circuit-ID union. It is not inferred from `options`, so supply it explicitly
 * (e.g. `nodeZkConfigProvider<'a' | 'b'>({ … })`) to keep `getProverKey` narrowed; it otherwise widens to `string`.
 */
export function nodeZkConfigProvider<K extends string>(options: NodeZkConfigProviderOptions): NodeZkConfigProvider<K> {
  const { directory, ...integrityOptions } = options;
  return new NodeZkConfigProvider<K>(directory, integrityOptions);
}
