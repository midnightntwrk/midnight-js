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

import { ArtifactRuntimeVersionUnavailableError } from './errors';
import type { ProverKey, VerifierKey, ZKConfig, ZKIR } from './midnight-types';

/**
 * DApp connector API type for key material retrieval
 **/
export type KeyMaterialProvider = {
  getZKIR(circuitKeyLocation: string): Promise<Uint8Array>;
  getProverKey(circuitKeyLocation: string): Promise<Uint8Array>;
  getVerifierKey(circuitKeyLocation: string): Promise<Uint8Array>;
};

/**
 * A provider for zero-knowledge intermediate representations, prover keys, and verifier keys. All
 * three are used by the {@link ProofProvider} to create a proof for a call transaction. The implementation
 * of this provider depends on the runtime environment, since each environment has different conventions
 * for accessing static artifacts.
 * @typeParam K - The type of the circuit ID used by the provider.
 */
export abstract class ZKConfigProvider<K extends string> {
  /**
   * Retrieves the zero-knowledge intermediate representation produced by `compactc` compiler for the given circuit.
   * @param circuitId The circuit ID of the ZKIR to retrieve.
   */
  abstract getZKIR(circuitId: K): Promise<ZKIR>;

  /**
   * Retrieves the prover key produced by `compactc` compiler for the given circuit.
   * @param circuitId The circuit ID of the prover key to retrieve.
   */
  abstract getProverKey(circuitId: K): Promise<ProverKey>;

  /**
   * Retrieves the verifier key produced by `compactc` compiler for the given circuit.
   * @param circuitId The circuit ID of the verifier key to retrieve.
   */
  abstract getVerifierKey(circuitId: K): Promise<VerifierKey>;

  /**
   * Reports the `compact-runtime` version the artifact set this provider serves was compiled
   * against, as `compactc` recorded it in `compiler/contract-info.json` (for example `'0.16.0'`).
   *
   * A DECLARED fact, read from the compiler's own output, and the only era statement about an
   * artifact that survives a consumer's build: a bundler's `target` rewrites generated code, and a
   * minifier rewrites its names, but neither touches this file. It is what lets a caller's contract
   * be placed on the ledger-era timeline without inspecting the shape of the generated JavaScript.
   *
   * Not abstract, and deliberately so: only the retained-era pipeline consults it, so a provider
   * written for current-era artifacts alone stays valid without implementing it and fails loudly
   * only if it is handed retained-era artifacts. Both providers this framework ships override it.
   *
   * @returns The declared runtime version, verbatim.
   * @throws ArtifactRuntimeVersionUnavailableError from this base implementation, which has no
   * artifact location to read and must not guess one.
   */
  async getArtifactRuntimeVersion(): Promise<string> {
    throw new ArtifactRuntimeVersionUnavailableError(this.constructor.name);
  }

  /**
   * Retrieves the verifier keys produced by `compactc` compiler for the given circuits.
   * @param circuitIds The circuit IDs of the verifier keys to retrieve.
   */
  async getVerifierKeys(circuitIds: K[]): Promise<[K, VerifierKey][]> {
    return Promise.all(
      circuitIds.map(async (id) => {
        const key = await this.getVerifierKey(id);
        return [id, key];
      })
    );
  }

  /**
   * Retrieves all zero-knowledge artifacts produced by `compactc` compiler for the given circuit.
   * @param circuitId The circuit ID of the artifacts to retrieve.
   */
  async get(circuitId: K): Promise<ZKConfig<K>> {
    return {
      circuitId,
      proverKey: await this.getProverKey(circuitId),
      verifierKey: await this.getVerifierKey(circuitId),
      zkir: await this.getZKIR(circuitId)
    };
  }

  asKeyMaterialProvider(): KeyMaterialProvider {
    return this as KeyMaterialProvider;
  }
}
