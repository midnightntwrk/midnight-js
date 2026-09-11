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

import { describe, expect, it } from 'vitest';

import { ArtifactRuntimeVersionUnavailableError } from '../errors';
import type { ProverKey, VerifierKey, ZKIR } from '../midnight-types';
import { ZKConfigProvider } from '../zk-config-provider';

// A provider written against the surface as it stood before the retained era existed: the three
// artifact reads and nothing else. The point of the suite is what such a provider does now.
class ArtifactOnlyZkConfigProvider extends ZKConfigProvider<string> {
  async getZKIR(): Promise<ZKIR> {
    return new Uint8Array() as ZKIR;
  }

  async getProverKey(): Promise<ProverKey> {
    return new Uint8Array() as ProverKey;
  }

  async getVerifierKey(): Promise<VerifierKey> {
    return new Uint8Array() as VerifierKey;
  }
}

describe('ZKConfigProvider.getArtifactRuntimeVersion', () => {
  it('refuses to answer for a provider that does not expose the compiler output', async () => {
    // Arrange
    const provider = new ArtifactOnlyZkConfigProvider();

    // Act + Assert: the refusal is the contract. A provider that cannot say which toolchain built
    // its artifacts must not be allowed to answer with a guess.
    await expect(provider.getArtifactRuntimeVersion()).rejects.toBeInstanceOf(ArtifactRuntimeVersionUnavailableError);
  });

  it('names the provider that could not answer, so the caller knows which one to fix', async () => {
    const provider = new ArtifactOnlyZkConfigProvider();

    await expect(provider.getArtifactRuntimeVersion()).rejects.toThrow(/ArtifactOnlyZkConfigProvider/);
  });
});
