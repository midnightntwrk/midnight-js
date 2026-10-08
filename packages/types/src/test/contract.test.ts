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

import { sampleSigningKey, type SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ContractExecutionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import * as Configuration from '@midnight-ntwrk/midnight-js-protocol/platform-js/effect/Configuration';
import { Cause, Effect, Exit, Option } from 'effect';
import { describe, expect, it } from 'vitest';

import { exitResultOrError, makeContractExecutableRuntime } from '../contract';
import { ZkArtifactFetchError } from '../errors';
import { type ProverKey, type VerifierKey, type ZKIR } from '../midnight-types';
import { ZKConfigProvider } from '../zk-config-provider';

class UnusedZKConfigProvider extends ZKConfigProvider<string> {
  getZKIR(): Promise<ZKIR> {
    return Promise.reject(new Error('zk config provider is not exercised by configuration reads'));
  }
  getProverKey(): Promise<ProverKey> {
    return Promise.reject(new Error('zk config provider is not exercised by configuration reads'));
  }
  getVerifierKey(): Promise<VerifierKey> {
    return Promise.reject(new Error('zk config provider is not exercised by configuration reads'));
  }
}

const COIN_PUBLIC_KEY = '00'.repeat(32);

const readConfiguredSigningKey = (signingKey: SigningKey): Promise<Option.Option<SigningKey>> =>
  makeContractExecutableRuntime(new UnusedZKConfigProvider(), {
    coinPublicKey: COIN_PUBLIC_KEY,
    signingKey
  }).runPromise(Configuration.Keys.pipe(Effect.map((keys) => keys.getSigningKey())));

describe('makeContractExecutableRuntime', () => {
  it('preserves the kind of a schnorr signing key', async () => {
    const signingKey = sampleSigningKey('schnorr');

    const configured = await readConfiguredSigningKey(signingKey);

    expect(Option.getOrNull(configured)).toEqual(signingKey);
  });

  it('preserves the kind of an ecdsa signing key', async () => {
    const signingKey = sampleSigningKey('ecdsa');

    const configured = await readConfiguredSigningKey(signingKey);

    expect(Option.getOrNull(configured)).toEqual(signingKey);
  });
});

describe('exitResultOrError', () => {
  const fetchFailure = () => new ZkArtifactFetchError('ZK artifact request failed: url=https://zk.example/vk', 503);
  const wrapped = (cause: unknown) => new Error("Failed to read verifier key for 'increment'", { cause });

  it('rethrows a lone failure unchanged when nothing on its cause chain is coded', () => {
    // Arrange
    const failure = new Error('compact-js refused');

    // Act / Assert
    expect(() => exitResultOrError(Exit.fail(failure))).toThrow(failure);
  });

  it('rethrows the coded error found on a lone failure\'s cause chain, so its category survives', () => {
    // Arrange
    const coded = fetchFailure();

    // Act
    const act = () => exitResultOrError(Exit.fail(wrapped(coded)));

    // Assert
    expect(act).toThrow(coded);
  });

  it('rethrows the coded cause when one of several concurrent reads fails', () => {
    // Arrange
    const coded = fetchFailure();
    const exit = Effect.runSyncExit(
      Effect.forEach(
        ['a', 'b', 'c'],
        (circuit) => (circuit === 'b' ? Effect.fail(wrapped(coded)) : Effect.succeed(circuit)),
        { concurrency: 'unbounded' }
      )
    );

    // Act
    const act = () => exitResultOrError(exit);

    // Assert
    expect(act).toThrow(coded);
  });

  it('reports every failure when several arrive at once, with the first coded one on cause', () => {
    // Arrange
    const first = fetchFailure();
    const second = new Error('second read refused');
    const exit = Exit.failCause(Cause.parallel(Cause.fail(new Error('plain failure')), Cause.parallel(Cause.fail(wrapped(first)), Cause.fail(second))));

    // Act
    let thrown: unknown;
    try {
      exitResultOrError(exit);
    } catch (error) {
      thrown = error;
    }

    // Assert
    expect(thrown).toBeInstanceOf(ContractExecutionError);
    expect(thrown).toMatchObject({
      message:
        "plain failure; Failed to read verifier key for 'increment': ZK artifact request failed: url=https://zk.example/vk; second read refused"
    });
    expect(thrown instanceof ContractExecutionError && thrown.cause).toBe(first);
  });

  it('rethrows a defect as the error that caused it, not as a midnight-js bug', () => {
    // Arrange
    const defect = new Error('witness threw');

    // Act / Assert
    expect(() => exitResultOrError(Exit.failCause(Cause.die(defect)))).toThrow(defect);
  });
});
