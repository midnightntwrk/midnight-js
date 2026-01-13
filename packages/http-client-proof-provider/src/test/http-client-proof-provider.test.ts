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

import { type ProverKey, type VerifierKey, ZKConfigProvider, type ZKIR } from '@midnight-ntwrk/midnight-js-types';

import { httpClientProvingProvider } from '../http-client-proving-provider';

class MockZKConfigProvider extends ZKConfigProvider<'test-circuit'> {
  async getZKIR(_circuitId: 'test-circuit'): Promise<ZKIR> {
    return new Uint8Array([1, 2, 3]) as ZKIR;
  }

  async getProverKey(_circuitId: 'test-circuit'): Promise<ProverKey> {
    return new Uint8Array([4, 5, 6]) as ProverKey;
  }

  async getVerifierKey(_circuitId: 'test-circuit'): Promise<VerifierKey> {
    return new Uint8Array([7, 8, 9]) as VerifierKey;
  }
}

describe('Http Client Proving Provider', () => {
  test("'httpClientProvingProvider' throws when 'url' does not start with 'http:' or 'https:'", () => {
    const zkConfigProvider = new MockZKConfigProvider();
    expect(() => httpClientProvingProvider('ws://localhost:8080', zkConfigProvider)).toThrow(
      /Invalid protocol scheme: 'ws:'/
    );
  });

  test("'httpClientProvingProvider' accepts 'http:' protocol", () => {
    const zkConfigProvider = new MockZKConfigProvider();
    expect(() => httpClientProvingProvider('http://localhost:8080', zkConfigProvider)).not.toThrow();
  });

  test("'httpClientProvingProvider' accepts 'https:' protocol", () => {
    const zkConfigProvider = new MockZKConfigProvider();
    expect(() => httpClientProvingProvider('https://localhost:8080', zkConfigProvider)).not.toThrow();
  });

  test("'httpClientProvingProvider' accepts URL with trailing slash", () => {
    const zkConfigProvider = new MockZKConfigProvider();
    expect(() => httpClientProvingProvider('http://localhost:8080/', zkConfigProvider)).not.toThrow();
  });

  test("'httpClientProvingProvider' accepts URL without trailing slash", () => {
    const zkConfigProvider = new MockZKConfigProvider();
    expect(() => httpClientProvingProvider('http://localhost:8080', zkConfigProvider)).not.toThrow();
  });

  test("'httpClientProvingProvider' returns ProvingProvider with check and prove methods", () => {
    const zkConfigProvider = new MockZKConfigProvider();
    const provider = httpClientProvingProvider('http://localhost:8080', zkConfigProvider);

    expect(provider).toHaveProperty('check');
    expect(provider).toHaveProperty('prove');
    expect(typeof provider.check).toBe('function');
    expect(typeof provider.prove).toBe('function');
  });
});
