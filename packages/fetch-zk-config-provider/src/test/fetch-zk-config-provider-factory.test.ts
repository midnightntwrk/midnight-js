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

import { describe, expect, test } from 'vitest';

import { FetchZkConfigProvider, fetchZkConfigProvider } from '../index';

describe('fetchZkConfigProvider factory', () => {
  test('returns a FetchZkConfigProvider instance', () => {
    const provider = fetchZkConfigProvider({ baseURL: 'http://localhost:5000' });
    expect(provider).toBeInstanceOf(FetchZkConfigProvider);
  });

  test('validates the URL scheme eagerly at construction', () => {
    expect(() => fetchZkConfigProvider({ baseURL: 'ws://localhost:5000' })).toThrow(/^Invalid protocol scheme: 'ws:'/);
  });

  test('propagates fetchFunc so the provided fetch implementation is used', async () => {
    const sentinel = 'sentinel-fetch-used';
    const throwingFetch: typeof fetch = () => {
      throw new Error(sentinel);
    };
    const provider = fetchZkConfigProvider({ baseURL: 'http://localhost:5000', fetchFunc: throwingFetch });
    await expect(provider.getProverKey('set_topic')).rejects.toThrow(sentinel);
  });
});
