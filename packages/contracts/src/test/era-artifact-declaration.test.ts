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

import { ArtifactRuntimeVersionUnavailableError, type ProverKey, type VerifierKey, ZKConfigProvider, type ZKIR } from '@midnight-ntwrk/midnight-js-types';
import { ZkArtifactContractInfoError } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, type Mock, vi } from 'vitest';

import { type PipelineEra } from '../era';
import { EraArtifactMismatchError } from '../errors';
import { type ArtifactRuntimeVersionSource, resolveArtifactEra } from '../internal/era';
import { createMockCompiledContract } from './test-mocks';

type RuntimeVersionSpy = Mock<() => Promise<string>>;

const declaring = (runtimeVersion: string): ArtifactRuntimeVersionSource & { getArtifactRuntimeVersion: RuntimeVersionSpy } => ({
  getArtifactRuntimeVersion: vi.fn<() => Promise<string>>().mockResolvedValue(runtimeVersion)
});

const refusing = (error: Error): ArtifactRuntimeVersionSource & { getArtifactRuntimeVersion: RuntimeVersionSpy } => ({
  getArtifactRuntimeVersion: vi.fn<() => Promise<string>>().mockRejectedValue(error)
});

// The shape the retained toolchain generates: `impureCircuits` and a SYNCHRONOUS `initialState`.
const retainedShape = (): object => ({
  impureCircuits: { increment: (): void => undefined },
  initialState: (): Record<string, never> => ({})
});

// What a bundler emits for the CURRENT era's `async initialState` when it targets below ES2017:
// a plain function returning a promise. `constructor.name` reads 'Function' on it, exactly as it
// does on a real retained artifact -- which is why the era may not be read from that name.
const transpiledCurrentEraShape = (): object => ({
  impureCircuits: { deposit: (): Promise<void> => Promise.resolve() },
  initialState: (): Promise<Record<string, never>> => Promise.resolve({})
});

describe('resolveArtifactEra: the era comes from what the artifact declares', () => {
  it('places a current-era container without consulting the artifact set at all', async () => {
    // Arrange: the container carries its own era marker -- an own `tag` no build step rewrites --
    // so the current era pays nothing for this dispatch.
    const source = declaring('0.19.0');

    // Act
    const era = await resolveArtifactEra(createMockCompiledContract(), source);

    // Assert
    expect(era).toBe<PipelineEra>('ledger9');
    expect(source.getArtifactRuntimeVersion).not.toHaveBeenCalled();
  });

  it('places a retained artifact from the runtime version its compiler recorded', async () => {
    const source = declaring('0.16.0');

    const era = await resolveArtifactEra(retainedShape(), source);

    expect(era).toBe<PipelineEra>('ledger8');
    expect(source.getArtifactRuntimeVersion).toHaveBeenCalledTimes(1);
  });

  it('reads the declared version patch-insensitively', async () => {
    expect(await resolveArtifactEra(retainedShape(), declaring('0.16.7'))).toBe<PipelineEra>('ledger8');
  });

  it('REFUSES a current-era contract whose async initialState a build step erased', async () => {
    // The regression this whole change exists for. Structurally this object is indistinguishable
    // from a retained artifact -- `constructor.name` reads 'Function' on both -- so routing on that
    // name sent a current-era contract into the retained pipeline. The declared runtime version
    // separates them, and it is the same on both sides of any transpilation.
    const source = declaring('0.19.0');

    await expect(resolveArtifactEra(transpiledCurrentEraShape(), source)).rejects.toBeInstanceOf(
      EraArtifactMismatchError
    );
    await expect(resolveArtifactEra(transpiledCurrentEraShape(), source)).rejects.toMatchObject({
      reason: 'unwrapped-current-era-contract'
    });
  });

  it('refuses an artifact set whose runtime version this framework cannot place, naming it', async () => {
    const source = declaring('0.99.0');

    await expect(resolveArtifactEra(retainedShape(), source)).rejects.toMatchObject({
      reason: 'unknown-artifact-runtime-version'
    });
    await expect(resolveArtifactEra(retainedShape(), source)).rejects.toThrow(/0\.99\.0/);
  });

  it('refuses a malformed runtime version rather than reading a prefix of it', async () => {
    await expect(resolveArtifactEra(retainedShape(), declaring('sixteen'))).rejects.toMatchObject({
      reason: 'unknown-artifact-runtime-version'
    });
  });

  it('refuses when the artifacts declare nothing, and keeps the provider failure on cause', async () => {
    // Never a fallback to the generated code's shape: an undeclared era is a refusal, because every
    // answer this framework could invent would be a guess about which ledger executes the call.
    const unavailable = new ZkArtifactContractInfoError('no contract-info.json at https://cdn.example/compiler/');
    const source = refusing(unavailable);

    const error = await resolveArtifactEra(retainedShape(), source).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(EraArtifactMismatchError);
    expect(error).toMatchObject({ reason: 'artifact-era-undeclared' });
    expect((error as EraArtifactMismatchError).cause).toBe(unavailable);
  });

  it('separates a provider that CANNOT declare an era from artifacts that do not', async () => {
    // The real third-party case, through the real base class rather than a stand-in: a provider
    // written before the retained era existed never overrode the member. Its fix is to implement
    // the method, not to serve a file, so it may not be reported as an artifact problem.
    class ArtifactOnlyProvider extends ZKConfigProvider<string> {
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

    const error = await resolveArtifactEra(retainedShape(), new ArtifactOnlyProvider()).catch(
      (thrown: unknown) => thrown
    );

    expect(error).toBeInstanceOf(EraArtifactMismatchError);
    expect(error).toMatchObject({ reason: 'provider-cannot-declare-era' });
    expect((error as EraArtifactMismatchError).cause).toBeInstanceOf(ArtifactRuntimeVersionUnavailableError);
    // The base class names the provider that could not answer; that naming must survive the wrap.
    expect(((error as EraArtifactMismatchError).cause as Error).message).toMatch(/ArtifactOnlyProvider/);
  });

  it.each([
    ['a transport failure', new TypeError('fetch failed')],
    ['a permission fault', Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })]
  ])('propagates %s unchanged rather than reporting it as an era problem', async (_label, failure) => {
    // These say nothing about which era the artifacts belong to. Relabelling them sends the caller
    // to serve a file that is already there, and buries the real fault on `cause`. The sibling
    // `readHeadEra` states the same rule for the head read.
    await expect(resolveArtifactEra(retainedShape(), refusing(failure))).rejects.toBe(failure);
  });

  it('refuses a raw current-era contract by its async initialState before any provider read', async () => {
    // An `AsyncFunction` is proof of the current era that no build step can fabricate, only erase.
    // It is therefore allowed to REFUSE on its own -- and never to route anything anywhere.
    const source = declaring('0.16.0');
    const rawCurrentEra = {
      impureCircuits: { deposit: async (): Promise<void> => undefined },
      initialState: async (): Promise<Record<string, never>> => ({})
    };

    await expect(resolveArtifactEra(rawCurrentEra, source)).rejects.toMatchObject({
      reason: 'unwrapped-current-era-contract'
    });
    expect(source.getArtifactRuntimeVersion).not.toHaveBeenCalled();
  });

  it.each([
    ['a plain object', {}],
    ['null', null],
    ['a string', 'contract'],
    ['an object with a non-string tag', { tag: 7 }]
  ])('refuses %s without consulting the artifact set', async (_label, candidate) => {
    const source = declaring('0.16.0');

    await expect(resolveArtifactEra(candidate, source)).rejects.toMatchObject({
      reason: 'unrecognised-contract-shape'
    });
    expect(source.getArtifactRuntimeVersion).not.toHaveBeenCalled();
  });
});
