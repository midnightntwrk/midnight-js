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

import type { ZKConfig } from './midnight-types';
import type { KeyMaterialProvider, ZKConfigProvider } from './zk-config-provider';
import { type ContractKeyLocation, encodeContractKeyLocation, hashVerifierKey, parseContractKeyLocation } from './zk-key-location';

/**
 * Thrown when a contract key location parses but no artifact source contains a bundle whose
 * verifier key matches the deployed one — i.e. the local artifacts have drifted from (or were
 * never compiled for) the deployed contract.
 */
export class ZKArtifactNotFoundError extends Error {
  constructor(readonly keyLocation: ContractKeyLocation) {
    super(
      `No ZK artifact bundle matches the deployed verifier key for contract ` +
        `'${keyLocation.contractAddress}', circuit '${keyLocation.circuitId}'. The local compiled ` +
        `artifacts are missing or stale with respect to the deployed contract.`
    );
    this.name = 'ZKArtifactNotFoundError';
  }
}

/**
 * Resolves canonical contract key locations to ZK artifacts across a *set* of compiled-contract
 * artifact sources.
 *
 * A cross-contract call transaction carries one proof per contract in the call tree, so proving
 * requires artifacts for several compiled contracts, keyed by `(contractAddress, circuitId)`. No
 * registration of addresses is required: the binding is *derived* by joining on the verifier key.
 * Each location embeds the SHA-256 of the call's deployed verifier key (known at transaction
 * assembly from the contract's resolved on-chain state), and resolution selects the source whose
 * local verifier key for the circuit matches. The join is sound because it is the predicate the
 * chain itself enforces — a proof must verify against the deployed key — and it makes the
 * resolution immune to redeploys, multiple deployments of one contract, and circuit-name
 * collisions across contracts.
 *
 * The sources are the per-contract {@link ZKConfigProvider}s the application already constructs;
 * resolutions are memoized per location.
 */
export class ZKConfigRegistry {
  private readonly sources: readonly ZKConfigProvider<string>[];

  private readonly resolved = new Map<string, ZKConfig<string>>();

  /**
   * @param sources The compiled-contract artifact sources to resolve against — one per compiled
   * contract the application can call (its own contracts and any cross-contract call targets).
   */
  constructor(sources: Iterable<ZKConfigProvider<string>>) {
    this.sources = [...sources];
  }

  /**
   * Resolves the ZK artifacts for a structured contract key.
   *
   * @param location The contract address, circuit, and deployed verifier key hash to resolve.
   * @throws ZKArtifactNotFoundError If no source's verifier key for the circuit matches.
   */
  get(location: ContractKeyLocation): Promise<ZKConfig<string>> {
    return this.resolve(encodeContractKeyLocation(location), location);
  }

  /**
   * Resolves the ZK artifacts for a key-location string from a proof preimage.
   *
   * @param keyLocation The key-location string.
   * @returns The matched artifacts, or `undefined` if `keyLocation` is not a contract key
   * location (for example, a `midnight/` protocol builtin, which provers resolve elsewhere).
   * @throws ZKArtifactNotFoundError If `keyLocation` is a contract key location but no source's
   * verifier key for the circuit matches the embedded hash.
   */
  async resolveKeyLocation(keyLocation: string): Promise<ZKConfig<string> | undefined> {
    const parsed = parseContractKeyLocation(keyLocation);
    if (parsed === undefined) {
      return undefined;
    }
    return this.resolve(keyLocation, parsed);
  }

  /**
   * Adapts this registry to the DApp connector's {@link KeyMaterialProvider}, allowing a wallet
   * to resolve the key locations of a transaction assembled by this application.
   */
  asKeyMaterialProvider(): KeyMaterialProvider {
    const resolve = async (circuitKeyLocation: string): Promise<ZKConfig<string>> => {
      const config = await this.resolveKeyLocation(circuitKeyLocation);
      if (config === undefined) {
        throw new Error(`'${circuitKeyLocation}' is not a contract key location`);
      }
      return config;
    };
    return {
      getZKIR: (circuitKeyLocation) => resolve(circuitKeyLocation).then((config) => config.zkir),
      getProverKey: (circuitKeyLocation) => resolve(circuitKeyLocation).then((config) => config.proverKey),
      getVerifierKey: (circuitKeyLocation) => resolve(circuitKeyLocation).then((config) => config.verifierKey)
    };
  }

  private async resolve(keyLocation: string, parsed: ContractKeyLocation): Promise<ZKConfig<string>> {
    const memoized = this.resolved.get(keyLocation);
    if (memoized !== undefined) {
      return memoized;
    }
    for (const source of this.sources) {
      let verifierKey: Uint8Array;
      try {
        verifierKey = await source.getVerifierKey(parsed.circuitId);
      } catch {
        // The source has no circuit by this name; try the next one.
        continue;
      }
      if (hashVerifierKey(verifierKey) !== parsed.verifierKeyHash) {
        continue;
      }
      const config = await source.get(parsed.circuitId);
      this.resolved.set(keyLocation, config);
      return config;
    }
    throw new ZKArtifactNotFoundError(parsed);
  }
}
