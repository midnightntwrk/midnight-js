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

import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  InvalidProtocolSchemeError,
  type ProverKey,
  type VerifierKey,
  type ZKConfig,
  type ZKConfigProvider,
  type ZKIR
} from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClientProvingProvider } from '../http-client-proving-provider';

const { mockFetchRetry } = vi.hoisted(() => ({
  mockFetchRetry: vi.fn()
}));

vi.mock('cross-fetch', () => ({
  default: vi.fn()
}));

vi.mock('fetch-retry', () => ({
  default: () => mockFetchRetry
}));

vi.mock('@midnight-ntwrk/ledger-v8', async () => {
  const actual = await vi.importActual('@midnight-ntwrk/ledger-v8');
  return {
    ...actual,
    createCheckPayload: vi.fn(),
    createProvingPayload: vi.fn(),
    parseCheckResult: vi.fn()
  };
});

describe('httpClientProvingProvider', () => {
  const mockUrl = 'http://localhost:8080';
  const mockZkConfig : ZKConfig<string> = {
    circuitId: 'test-circuit',
    proverKey: new Uint8Array([1, 2, 3]) as ProverKey,
    verifierKey: new Uint8Array([4, 5, 6]) as VerifierKey,
    zkir: new Uint8Array([7, 8, 9]) as ZKIR
  };

  let mockZkConfigProvider: ZKConfigProvider<string>;

  beforeEach(() => {
    mockFetchRetry.mockReset();
    vi.mocked(ledger.createCheckPayload).mockReset();
    vi.mocked(ledger.createProvingPayload).mockReset();
    vi.mocked(ledger.parseCheckResult).mockReset();

    mockZkConfigProvider = {
      get: vi.fn().mockResolvedValue(mockZkConfig)
    } as unknown as ZKConfigProvider<string>;

    mockFetchRetry.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      url: mockUrl,
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([10, 11, 12]).buffer)
    });
  });

  describe('factory function', () => {
    it('should throw InvalidProtocolSchemeError for non-http(s) protocols', () => {
      expect(() => httpClientProvingProvider('ws://localhost', mockZkConfigProvider)).toThrow(
        InvalidProtocolSchemeError
      );
      expect(() => httpClientProvingProvider('ftp://localhost', mockZkConfigProvider)).toThrow(
        InvalidProtocolSchemeError
      );
    });

    it('should accept http protocol', () => {
      expect(() => httpClientProvingProvider('http://localhost', mockZkConfigProvider)).not.toThrow();
    });

    it('should accept https protocol', () => {
      expect(() => httpClientProvingProvider('https://localhost', mockZkConfigProvider)).not.toThrow();
    });

    it('should use default timeout when config not provided', () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      expect(provider).toBeDefined();
      expect(provider.check).toBeDefined();
      expect(provider.prove).toBeDefined();
    });

    it('should use custom timeout when config provided', () => {
      const customTimeout = 60000;
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout: customTimeout });
      expect(provider).toBeDefined();
    });
  });

  describe('check method', () => {
    it('should call zkConfigProvider.get with keyLocation', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);
      const keyLocation = 'test-circuit';

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, keyLocation);

      expect(mockZkConfigProvider.get).toHaveBeenCalledWith(keyLocation);
    });

    it('should create check payload with zkir from zkConfig', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      expect(ledger.createCheckPayload).toHaveBeenCalledWith(
        serializedPreimage,
        expect.any(Uint8Array)
      );
    });

    it('should handle zkConfig not found and use undefined keyMaterial', async () => {
      mockZkConfigProvider.get = vi.fn().mockRejectedValue(new Error('Not found'));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      expect(ledger.createCheckPayload).toHaveBeenCalledWith(
        serializedPreimage,
        undefined
      );
    });

    it('should make POST request to check endpoint', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);
      const payload = new Uint8Array([20, 21, 22]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(payload);
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        new URL('/check', mockUrl),
        expect.objectContaining({
          method: 'POST',
          body: new Uint8Array(payload)
        })
      );
    });

    it('should use configured timeout for check request', async () => {
      const customTimeout = 60000;
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout: customTimeout });
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should parse and return check result', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);
      const expectedResult = [undefined, undefined];

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue(expectedResult);

      const result = await provider.check(serializedPreimage, 'test-circuit');

      expect(result).toEqual(expectedResult);
      expect(ledger.parseCheckResult).toHaveBeenCalled();
    });

    it('should throw error when HTTP response is not ok', async () => {
      mockFetchRetry.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: mockUrl
      });

      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));

      await expect(provider.check(serializedPreimage, 'test-circuit')).rejects.toThrow(
        /Failed Proof Server response/
      );
    });
  });

  describe('prove method', () => {
    it('should call zkConfigProvider.get with keyLocation', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);
      const keyLocation = 'test-circuit';

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, keyLocation);

      expect(mockZkConfigProvider.get).toHaveBeenCalledWith(keyLocation);
    });

    it('should create proving payload with key material', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, 'test-circuit');

      expect(ledger.createProvingPayload).toHaveBeenCalledWith(
        serializedPreimage,
        undefined,
        expect.objectContaining({
          proverKey: expect.any(Uint8Array),
          verifierKey: expect.any(Uint8Array),
          ir: expect.any(Uint8Array)
        })
      );
    });

    it('should handle zkConfig not found and use undefined keyMaterial', async () => {
      mockZkConfigProvider.get = vi.fn().mockRejectedValue(new Error('Not found'));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, 'test-circuit');

      expect(ledger.createProvingPayload).toHaveBeenCalledWith(
        serializedPreimage,
        undefined,
        undefined
      );
    });

    it('should pass overwriteBindingInput when provided', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);
      const overwriteBindingInput = 42n;

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, 'test-circuit', overwriteBindingInput);

      expect(ledger.createProvingPayload).toHaveBeenCalledWith(
        serializedPreimage,
        overwriteBindingInput,
        expect.any(Object)
      );
    });

    it('should make POST request to prove endpoint', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);
      const payload = new Uint8Array([30, 31, 32]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(payload);

      await provider.prove(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        new URL('/prove', mockUrl),
        expect.objectContaining({
          method: 'POST',
          body: new Uint8Array(payload)
        })
      );
    });

    it('should return proof bytes from response', async () => {
      const expectedProof = new Uint8Array([40, 41, 42]);
      mockFetchRetry.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: mockUrl,
        arrayBuffer: vi.fn().mockResolvedValue(expectedProof.buffer)
      });

      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      const result = await provider.prove(serializedPreimage, 'test-circuit');

      expect(result).toEqual(expectedProof);
    });

    it('should throw error when HTTP response is not ok', async () => {
      mockFetchRetry.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        url: mockUrl
      });

      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await expect(provider.prove(serializedPreimage, 'test-circuit')).rejects.toThrow(
        /Failed Proof Server response/
      );
    });
  });

  describe('custom headers', () => {
    it('should include custom headers in check requests', async () => {
      const customHeaders = { 'X-API-Key': 'my-secret-key', 'Authorization': 'Bearer token123' };
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { headers: customHeaders });
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
            'X-API-Key': 'my-secret-key',
            'Authorization': 'Bearer token123'
          })
        })
      );
    });

    it('should include custom headers in prove requests', async () => {
      const customHeaders = { 'X-API-Key': 'my-secret-key' };
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { headers: customHeaders });
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
            'X-API-Key': 'my-secret-key'
          })
        })
      );
    });

    it('should send Content-Type header even without custom headers', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/octet-stream' }
        })
      );
    });
  });

  describe('timeout configuration', () => {
    it('should use default timeout when not specified', async () => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should use custom timeout when specified', async () => {
      const customTimeout = 10000;
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout: customTimeout });
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, 'test-circuit');

      expect(mockFetchRetry).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });
  });

  describe('URL configuration', () => {
    it('should preserve path prefix in URL', async () => {
      const urlWithPath = 'http://localhost:8080/api/v1';
      const provider = httpClientProvingProvider(urlWithPath, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      const calledUrl = mockFetchRetry.mock.calls[0][0] as URL;
      expect(calledUrl.pathname).toBe('/api/v1/check');
    });

    it('should preserve query parameters in URL', async () => {
      const urlWithQuery = 'http://localhost:8080?token=secret123';
      const provider = httpClientProvingProvider(urlWithQuery, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      const calledUrl = mockFetchRetry.mock.calls[0][0] as URL;
      expect(calledUrl.search).toBe('?token=secret123');
    });

    it('should preserve both path and query parameters', async () => {
      const urlWithPathAndQuery = 'http://localhost:8080/api/v1?token=secret&env=test';
      const provider = httpClientProvingProvider(urlWithPathAndQuery, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, 'test-circuit');

      const calledUrl = mockFetchRetry.mock.calls[0][0] as URL;
      expect(calledUrl.pathname).toBe('/api/v1/prove');
      expect(calledUrl.search).toBe('?token=secret&env=test');
    });

    it('should handle trailing slash in base URL', async () => {
      const urlWithTrailingSlash = 'http://localhost:8080/api/v1/';
      const provider = httpClientProvingProvider(urlWithTrailingSlash, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      const calledUrl = mockFetchRetry.mock.calls[0][0] as URL;
      expect(calledUrl.pathname).toBe('/api/v1/check');
    });
  });
});
