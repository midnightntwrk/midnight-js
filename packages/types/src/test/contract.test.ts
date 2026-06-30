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

import { sampleSigningKey, type SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import * as Configuration from '@midnight-ntwrk/midnight-js-protocol/platform-js/effect/Configuration';
import { Effect, Option } from 'effect';
import { describe, expect, it } from 'vitest';

import { makeContractExecutableRuntime } from '../contract';
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
