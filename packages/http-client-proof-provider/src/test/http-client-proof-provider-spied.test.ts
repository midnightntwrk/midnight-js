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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach,vi } from 'vitest';

import { getValidUnprovenTx } from './commons';

const mockFetch = vi.fn();

vi.mock('cross-fetch', () => ({
  default: mockFetch
}));

describe('Http Proof Server Proof Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("'httpClientProofProvider' posts to valid 'url' not ending with a trailing '/'", async () => {
    // Arrange for the mock 'fetch' to return a 500 error.
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'MOCK_ERROR',
      status: 500
    } as any);

    const { httpClientProofProvider } = await import('../http-client-proof-provider');
    const unprovenTx = await getValidUnprovenTx();
    const proofProvider = httpClientProofProvider('http://notvalidendpoint:8080');

    // Assert that the 'proveTx' call fails only with our arranged 500 error.
    await expect(() => proofProvider.proveTx(unprovenTx)).rejects.toThrow('MOCK_ERROR');

    // Assert that 'fetch' was used to POST to construct 'prove-tx' URL.
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://notvalidendpoint:8080/prove-tx' }),
      expect.objectContaining({
        method: expect.stringMatching('POST')
      })
    );
  });

  test("'httpClientProofProvider' posts to valid 'url' ending with a trailing '/'", async () => {
    // Arrange for the mock 'fetch' to return a 500 error.
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'MOCK_ERROR',
      status: 500
    } as any);

    const { httpClientProofProvider } = await import('../http-client-proof-provider');
    const unprovenTx = await getValidUnprovenTx();
    const proofProvider = httpClientProofProvider('http://notvalidendpoint:8080/');

    // Assert that the 'proveTx' call fails only with our arranged 500 error.
    await expect(() => proofProvider.proveTx(unprovenTx)).rejects.toThrow('MOCK_ERROR');

    // Assert that 'fetch' was used to POST to construct 'prove-tx' URL.
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://notvalidendpoint:8080/prove-tx' }),
      expect.objectContaining({
        method: expect.stringMatching('POST')
      })
    );
  });
});
