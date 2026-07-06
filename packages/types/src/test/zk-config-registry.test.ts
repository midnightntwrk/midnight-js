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

import { describe, expect, it, vi } from 'vitest';

import { createProverKey, createVerifierKey, createZKIR } from '../midnight-types';
import { ZKConfigProvider } from '../zk-config-provider';
import { ZKArtifactNotFoundError, ZKConfigRegistry } from '../zk-config-registry';
import { encodeContractKeyLocation, hashVerifierKey } from '../zk-key-location';

const ADDRESS_A = 'aa'.repeat(32);
const ADDRESS_B = 'bb'.repeat(32);

type Bundle = Record<string, { vk: Uint8Array; pk: Uint8Array; ir: Uint8Array }>;

/**
 * An in-memory compiled-contract artifact source.
 */
class TestSource extends ZKConfigProvider<string> {
  constructor(private readonly bundle: Bundle) {
    super();
  }

  private artifacts(circuitId: string) {
    const artifacts = this.bundle[circuitId];
    if (artifacts === undefined) {
      throw new Error(`no circuit '${circuitId}'`);
    }
    return artifacts;
  }

  getZKIR = vi.fn(async (circuitId: string) => createZKIR(this.artifacts(circuitId).ir));

  getProverKey = vi.fn(async (circuitId: string) => createProverKey(this.artifacts(circuitId).pk));

  getVerifierKey = vi.fn(async (circuitId: string) => createVerifierKey(this.artifacts(circuitId).vk));
}

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

// Two contracts that both define a circuit named 'transfer' with different keys — the collision
// case the registry exists to disambiguate.
const sourceA: () => TestSource = () => new TestSource({ transfer: { vk: bytes(1, 1), pk: bytes(1, 2), ir: bytes(1, 3) } });
const sourceB: () => TestSource = () =>
  new TestSource({
    transfer: { vk: bytes(2, 1), pk: bytes(2, 2), ir: bytes(2, 3) },
    burn: { vk: bytes(2, 4), pk: bytes(2, 5), ir: bytes(2, 6) }
  });

const locationFor = (contractAddress: string, circuitId: string, vk: Uint8Array): string =>
  encodeContractKeyLocation({ contractAddress, circuitId, verifierKeyHash: hashVerifierKey(vk) });

describe('ZKConfigRegistry', () => {
  it('disambiguates identically named circuits by deployed verifier key', async () => {
    const registry = new ZKConfigRegistry([sourceA(), sourceB()]);

    const fromA = await registry.resolveKeyLocation(locationFor(ADDRESS_A, 'transfer', bytes(1, 1)));
    const fromB = await registry.resolveKeyLocation(locationFor(ADDRESS_B, 'transfer', bytes(2, 1)));

    expect(fromA?.proverKey).toEqual(bytes(1, 2));
    expect(fromB?.proverKey).toEqual(bytes(2, 2));
  });

  it('resolves regardless of source order', async () => {
    const registry = new ZKConfigRegistry([sourceB(), sourceA()]);

    const fromA = await registry.resolveKeyLocation(locationFor(ADDRESS_A, 'transfer', bytes(1, 1)));

    expect(fromA?.proverKey).toEqual(bytes(1, 2));
  });

  it('returns undefined for non-contract key locations', async () => {
    const registry = new ZKConfigRegistry([sourceA()]);

    await expect(registry.resolveKeyLocation('midnight/zswap/spend')).resolves.toBeUndefined();
    await expect(registry.resolveKeyLocation('transfer')).resolves.toBeUndefined();
  });

  it('throws the artifact-drift error when no verifier key matches', async () => {
    const registry = new ZKConfigRegistry([sourceA(), sourceB()]);

    // A deployed vk no local bundle was compiled for.
    await expect(registry.resolveKeyLocation(locationFor(ADDRESS_A, 'transfer', bytes(9, 9)))).rejects.toThrow(
      ZKArtifactNotFoundError
    );
    // A circuit name no bundle defines at all.
    await expect(registry.resolveKeyLocation(locationFor(ADDRESS_A, 'missing', bytes(1, 1)))).rejects.toThrow(
      /No ZK artifact bundle matches/
    );
  });

  it('surfaces source errors as the cause of the not-found error', async () => {
    const registry = new ZKConfigRegistry([sourceA(), sourceB()]);

    // No source defines 'missing', so both error while probing; those errors must not be lost.
    try {
      await registry.resolveKeyLocation(locationFor(ADDRESS_A, 'missing', bytes(1, 1)));
      expect.fail('expected ZKArtifactNotFoundError');
    } catch (error) {
      expect(error).toBeInstanceOf(ZKArtifactNotFoundError);
      const cause = (error as ZKArtifactNotFoundError).cause;
      expect(cause).toBeInstanceOf(AggregateError);
      expect((cause as AggregateError).errors).toHaveLength(2);
    }
  });

  it('caches the location→source binding so repeat resolutions skip re-scanning other sources', async () => {
    const a = sourceA(); // does not define 'burn'
    const b = sourceB(); // defines 'burn'
    const registry = new ZKConfigRegistry([a, b]);
    const location = locationFor(ADDRESS_B, 'burn', bytes(2, 4));

    await registry.resolveKeyLocation(location);
    const aCallsAfterFirst = a.getVerifierKey.mock.calls.length;
    await registry.resolveKeyLocation(location);

    // The binding is memoized, so the second resolution goes straight to the matching source and
    // does not re-probe the non-matching one.
    expect(a.getVerifierKey.mock.calls.length).toEqual(aCallsAfterFirst);
  });

  it('assembles the config from the key fetched during selection, without a second fetch', async () => {
    const source = sourceB();
    const registry = new ZKConfigRegistry([source]);

    await registry.resolveKeyLocation(locationFor(ADDRESS_B, 'burn', bytes(2, 4)));

    // One fetch to select the source by verifier-key hash; the config reuses that key rather than
    // fetching (and re-integrity-verifying) it a second time via `ZKConfigProvider.get`.
    expect(source.getVerifierKey.mock.calls.length).toEqual(1);
    expect(source.getProverKey.mock.calls.length).toEqual(1);
    expect(source.getZKIR.mock.calls.length).toEqual(1);
  });

  it('resolves structured keys via get', async () => {
    const registry = new ZKConfigRegistry([sourceA()]);

    const config = await registry.get({
      contractAddress: ADDRESS_A,
      circuitId: 'transfer',
      verifierKeyHash: hashVerifierKey(bytes(1, 1))
    });

    expect(config.zkir).toEqual(bytes(1, 3));
  });

  it('adapts to a KeyMaterialProvider for the wallet path', async () => {
    const registry = new ZKConfigRegistry([sourceA()]);
    const keyMaterialProvider = registry.asKeyMaterialProvider();
    const location = locationFor(ADDRESS_A, 'transfer', bytes(1, 1));

    await expect(keyMaterialProvider.getProverKey(location)).resolves.toEqual(bytes(1, 2));
    await expect(keyMaterialProvider.getVerifierKey(location)).resolves.toEqual(bytes(1, 1));
    await expect(keyMaterialProvider.getZKIR(location)).resolves.toEqual(bytes(1, 3));
    await expect(keyMaterialProvider.getProverKey('midnight/zswap/spend')).rejects.toThrow(
      /is not a contract key location/
    );
  });
});
