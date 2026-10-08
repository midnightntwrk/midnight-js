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

import type {
  MidnightProvider,
  MidnightProviders,
  PrivateStateProvider,
  ProofProvider,
  PublicDataProvider,
  WalletProvider,
  ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { createMidnightProviders } from '../midnight-providers';

const REQUIRED_PROVIDERS = [
  'privateStateProvider',
  'publicDataProvider',
  'zkConfigProvider',
  'proofProvider',
  'walletProvider',
  'midnightProvider'
] as const;

const validProviders = (): MidnightProviders => ({
  privateStateProvider: {} as PrivateStateProvider,
  publicDataProvider: {} as PublicDataProvider,
  zkConfigProvider: {} as ZKConfigProvider<string>,
  proofProvider: {} as ProofProvider,
  walletProvider: {} as WalletProvider,
  midnightProvider: {} as MidnightProvider,
  config: { networkId: 'undeployed', ttlSeconds: 600 }
});

const providers = (overrides: Partial<Record<keyof MidnightProviders, unknown>>): MidnightProviders =>
  Object.assign(validProviders(), overrides);

describe('createMidnightProviders', () => {
  it('returns the same provider set it was given', () => {
    const input = validProviders();

    const result = createMidnightProviders(input);

    expect(result).toBe(input);
  });

  it.each(REQUIRED_PROVIDERS.flatMap((key) => [undefined, null].map((value) => [key, value] as const)))(
    'rejects a set whose %s is %s, naming the provider',
    (key, value) => {
      const input = providers({ [key]: value });

      expect(() => createMidnightProviders(input)).toThrow(TypeError);
      expect(() => createMidnightProviders(input)).toThrow(`providers.${key} is missing.`);
    }
  );

  it('rejects a set without config', () => {
    const input = providers({ config: undefined });

    expect(() => createMidnightProviders(input)).toThrow(TypeError);
    expect(() => createMidnightProviders(input)).toThrow(/^providers\.config is missing/);
  });

  it('rejects an invalid networkId', () => {
    const input = providers({ config: { networkId: ' preview', ttlSeconds: 600 } });

    expect(() => createMidnightProviders(input)).toThrow(TypeError);
    expect(() => createMidnightProviders(input)).toThrow(/providers\.config\.networkId/);
  });

  it('rejects an invalid ttlSeconds', () => {
    const input = providers({ config: { networkId: 'preview', ttlSeconds: 0 } });

    expect(() => createMidnightProviders(input)).toThrow(RangeError);
    expect(() => createMidnightProviders(input)).toThrow(/providers\.config\.ttlSeconds/);
  });
});
