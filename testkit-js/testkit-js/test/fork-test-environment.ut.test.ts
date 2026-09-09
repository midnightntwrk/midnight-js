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

import pino from 'pino';

import type { ProofServerContainer } from '../src/proof-server-container';
import { ForkTestEnvironment } from '../src/test-environment/test-environments/fork-test-environment';

const silentLogger = pino({ level: 'silent' });

const injectedProofServer: ProofServerContainer = {
  stop: () => Promise.resolve(),
  getUrl: () => 'http://127.0.0.1:6300'
};

describe('[Unit tests] ForkTestEnvironment', () => {
  describe('before the stack is started', () => {
    it('should report that the chain has not forked', () => {
      const environment = new ForkTestEnvironment(silentLogger);

      expect(environment.hasForked).toBe(false);
    });

    it('should refuse to hand out a configuration instead of returning undefined fields', () => {
      const environment = new ForkTestEnvironment(silentLogger);

      expect(() => environment.getEnvironmentConfiguration()).toThrow('has not been started');
    });

    it.each([
      ['getPreForkProofServer', (env: ForkTestEnvironment) => env.getPreForkProofServer()],
      ['getPostForkProofServer', (env: ForkTestEnvironment) => env.getPostForkProofServer()]
    ])('should refuse to resolve a mapped port from %s', (_name, read) => {
      const environment = new ForkTestEnvironment(silentLogger);

      expect(() => read(environment)).toThrow('has not been started');
    });

    it('should refuse to read the chain', async () => {
      const environment = new ForkTestEnvironment(silentLogger);

      await expect(environment.specVersionAtFinalizedHead()).rejects.toThrow('has not been started');
    });

    it('should tear down without error, so a failed start does not fail the teardown too', async () => {
      const environment = new ForkTestEnvironment(silentLogger);

      await expect(environment.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('start', () => {
    it('should reject an injected proof server before reaching Docker', async () => {
      const environment = new ForkTestEnvironment(silentLogger);

      await expect(environment.start(injectedProofServer)).rejects.toThrow('cannot take an injected one');
    });
  });

  describe('startMidnightWalletProviders', () => {
    it('should refuse rather than return a wallet that cannot sync across the boundary', () => {
      const environment = new ForkTestEnvironment(silentLogger);

      expect(() => environment.startMidnightWalletProviders()).toThrow('Wallets are not supported');
    });
  });
});
