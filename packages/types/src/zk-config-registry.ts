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

import type { VerifierKey, ZKConfig } from './midnight-types';
import type { KeyMaterialProvider, ZKConfigProvider } from './zk-config-provider';
import { type ContractKeyLocation, encodeContractKeyLocation, hashVerifierKey, parseContractKeyLocation } from './zk-key-location';

/**
 * Thrown when a contract key location parses but no artifact source contains a bundle whose
 * verifier key matches the deployed one — i.e. the local artifacts have drifted from (or were
 * never compiled for) the deployed contract.
 */
export class ZKArtifactNotFoundError extends Error {
  /**
   * @param keyLocation The location that could not be resolved.
   * @param suppressedErrors Errors raised by individual sources while probing their verifier key
   * (integrity violations, permission/IO failures, or a genuine absence of the circuit). They are
   * attached as this error's `cause` so a real failure — for example a `ZkArtifactIntegrityError` —
   * is not hidden behind the "missing or stale" message.
   */
  constructor(
    readonly keyLocation: ContractKeyLocation,
    readonly suppressedErrors: readonly unknown[] = []
  ) {
    super(
      `No ZK artifact bundle matches the deployed verifier key for contract ` +
        `'${keyLocation.contractAddress}', circuit '${keyLocation.circuitId}'. The local compiled ` +
        `artifacts are missing or stale with respect to the deployed contract.`,
      suppressedErrors.length > 0
        ? {
            cause: new AggregateError(
              suppressedErrors,
              'One or more artifact sources errored while resolving the verifier key.'
            )
          }
        : undefined
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
 * The sources are the per-contract {@link ZKConfigProvider}s the application already constructs. The
 * location→source binding and each source's verifier-key hashes are memoized; the (potentially
 * multi-MB) artifacts themselves are re-fetched from the bound source rather than retained, so the
 * registry's memory does not grow with the number of distinct locations resolved.
 */
export class ZKConfigRegistry {
  private readonly sources: readonly ZKConfigProvider<string>[];

  /**
   * Binds a resolved key location to the source that serves it — a single source reference per
   * location, so it can be held for the registry's lifetime without retaining artifact bytes.
   */
  private readonly boundSource = new Map<string, ZKConfigProvider<string>>();

  /**
   * Memoizes each source's verifier-key hash per circuit, so source selection reuses computed
   * hashes instead of re-fetching and re-hashing keys on every new location.
   */
  private readonly vkHashByCircuit = new Map<ZKConfigProvider<string>, Map<string, string>>();

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
    const bound = this.boundSource.get(keyLocation);
    if (bound !== undefined) {
      return this.buildConfig(bound, parsed.circuitId);
    }
    const suppressedErrors: unknown[] = [];
    for (const source of this.sources) {
      let probe: { hash: string; verifierKey?: VerifierKey };
      try {
        probe = await this.probeVerifierKeyHash(source, parsed.circuitId);
      } catch (error) {
        // A source may simply not have this circuit, or the read may have failed for a real reason
        // (integrity violation, permissions, IO). The provider interface can't tell them apart, so
        // keep probing other sources but retain the error to surface as the cause if none matches —
        // never silently discard it.
        suppressedErrors.push(error);
        continue;
      }
      if (probe.hash !== parsed.verifierKeyHash) {
        continue;
      }
      this.boundSource.set(keyLocation, source);
      return this.buildConfig(source, parsed.circuitId, probe.verifierKey);
    }
    throw new ZKArtifactNotFoundError(parsed, suppressedErrors);
  }

  /**
   * Returns a source's verifier-key hash for a circuit, memoized per source and circuit. The
   * verifier key bytes are included only when freshly fetched (a memo miss), so a caller that
   * matches on the hash can reuse them and avoid a second fetch (and re-integrity-verification).
   */
  private async probeVerifierKeyHash(
    source: ZKConfigProvider<string>,
    circuitId: string
  ): Promise<{ hash: string; verifierKey?: VerifierKey }> {
    const cached = this.vkHashByCircuit.get(source)?.get(circuitId);
    if (cached !== undefined) {
      return { hash: cached };
    }
    const verifierKey = await source.getVerifierKey(circuitId);
    const hash = hashVerifierKey(verifierKey);
    let byCircuit = this.vkHashByCircuit.get(source);
    if (byCircuit === undefined) {
      byCircuit = new Map();
      this.vkHashByCircuit.set(source, byCircuit);
    }
    byCircuit.set(circuitId, hash);
    return { hash, verifierKey };
  }

  /**
   * Assembles the {@link ZKConfig} for a circuit from a source. Reuses an already-fetched verifier
   * key when the caller has one, so it is not fetched (and re-integrity-verified) a second time;
   * otherwise fetches all three artifacts from the source. Unlike {@link ZKConfigProvider.get}, the
   * three fetches run concurrently.
   */
  private async buildConfig(
    source: ZKConfigProvider<string>,
    circuitId: string,
    verifierKey?: VerifierKey
  ): Promise<ZKConfig<string>> {
    const [proverKey, resolvedVerifierKey, zkir] = await Promise.all([
      source.getProverKey(circuitId),
      verifierKey !== undefined ? Promise.resolve(verifierKey) : source.getVerifierKey(circuitId),
      source.getZKIR(circuitId)
    ]);
    return { circuitId, proverKey, verifierKey: resolvedVerifierKey, zkir };
  }
}
