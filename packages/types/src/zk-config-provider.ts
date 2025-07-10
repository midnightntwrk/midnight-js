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

import type { ProverKey, VerifierKey, ZKIR, ZKConfig } from './midnight-types';

/**
 * A provider for zero-knowledge intermediate representations, prover keys, and verifier keys. All
 * three are used by the {@link ProofProvider} to create a proof for a call transaction. The implementation
 * of this provider depends on the runtime environment, since each environment has different conventions
 * for accessing static artifacts.
 * @typeParam K - The type of the circuit ID used by the provider.
 */
export abstract class ZKConfigProvider<K extends string> {
  /**
   * Retrieves the zero-knowledge intermediate representation produced by `compactc` for the given circuit.
   * @param circuitId The circuit ID of the ZKIR to retrieve.
   */
  abstract getZKIR(circuitId: K): Promise<ZKIR>;

  /**
   * Retrieves the prover key produced by `compactc` for the given circuit.
   * @param circuitId The circuit ID of the prover key to retrieve.
   */
  abstract getProverKey(circuitId: K): Promise<ProverKey>;

  /**
   * Retrieves the verifier key produced by `compactc` for the given circuit.
   * @param circuitId The circuit ID of the verifier key to retrieve.
   */
  abstract getVerifierKey(circuitId: K): Promise<VerifierKey>;

  /**
   * Retrieves the verifier keys produced by `compactc` for the given circuits.
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
   * Retrieves all zero-knowledge artifacts produced by `compactc` for the given circuit.
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
}
