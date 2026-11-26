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

import * as ledger from '@midnightntwrk/midnight-js-protocol/v9';
import {
  encodeContractKeyLocation,
  hashVerifierKey,
  InvalidProtocolSchemeError,
  ProofServerError,
  type ProverKey,
  type VerifierKey,
  ZkArtifactFetchError,
  ZKArtifactNotFoundError,
  type ZKConfig,
  type ZKConfigProvider,
  ZKConfigRegistry,
  type ZKIR} from '@midnightntwrk/midnight-js-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClientProvingProvider } from '../http-client-proving-provider';

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn()
}));

vi.mock('cross-fetch', () => ({
  default: mockFetch
}));

vi.mock('@midnightntwrk/midnight-js-protocol/v9', async () => {
  const actual = await vi.importActual('@midnightntwrk/midnight-js-protocol/v9');
  return {
    ...actual,
    createCheckPayload: vi.fn(),
    createProvingPayload: vi.fn(),
    parseCheckResult: vi.fn()
  };
});

/**
 * Partial stub of the abstract provider: only the methods a test exercises are
 * supplied, and a typo in a member name fails typechecking against
 * `Partial<ZKConfigProvider<string>>`.
 */
const zkConfigProviderWith = (overrides: Partial<ZKConfigProvider<string>>): ZKConfigProvider<string> =>
  overrides as ZKConfigProvider<string>;

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
    mockFetch.mockReset();
    vi.mocked(ledger.createCheckPayload).mockReset();
    vi.mocked(ledger.createProvingPayload).mockReset();
    vi.mocked(ledger.parseCheckResult).mockReset();

    mockZkConfigProvider = zkConfigProviderWith({
      get: vi.fn().mockResolvedValue(mockZkConfig)
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      url: mockUrl,
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([10, 11, 12]).buffer)
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

      expect(mockFetch).toHaveBeenCalledWith(
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

      expect(mockFetch).toHaveBeenCalledWith(
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: mockUrl,
        headers: new Headers()
      });
      vi.useFakeTimers();

      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));

      const result = expect(provider.check(serializedPreimage, 'test-circuit')).rejects.toThrow(
        /Failed Proof Server response/
      );
      await vi.runAllTimersAsync();
      await result;
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

      expect(mockFetch).toHaveBeenCalledWith(
        new URL('/prove', mockUrl),
        expect.objectContaining({
          method: 'POST',
          body: new Uint8Array(payload)
        })
      );
    });

    it('should return proof bytes from response', async () => {
      const expectedProof = new Uint8Array([40, 41, 42]);
      mockFetch.mockResolvedValue({
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        url: mockUrl,
        headers: new Headers()
      });
      vi.useFakeTimers();

      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      const result = expect(provider.prove(serializedPreimage, 'test-circuit')).rejects.toThrow(
        /Failed Proof Server response/
      );
      await vi.runAllTimersAsync();
      await result;
    });
  });

  describe('coded proof server errors', () => {
    it.each([
      [502, 'Bad Gateway', 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE'],
      [400, 'Bad Request', 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED']
    ])('maps a %i answer to %s', async (status, statusText, code) => {
      mockFetch.mockResolvedValue({ ok: false, status, statusText, url: mockUrl });
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30]));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      const error = await provider.prove(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({
        code,
        message: `Failed Proof Server response: url="${mockUrl}", code="${status}", status="${statusText}"`
      });
    });

    it('wraps a failure while reading the response body and keeps it on cause', async () => {
      // Arrange
      const bodyFailure = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: mockUrl,
        arrayBuffer: vi.fn().mockRejectedValue(bodyFailure)
      });
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30]));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      // Act
      const error = await provider.prove(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);

      // Assert
      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({
        code: 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE',
        message: `Proof Server response could not be read: url="${mockUrl}/prove"`
      });
      expect(error instanceof ProofServerError && error.cause).toBe(bodyFailure);
    });

    it('surfaces a transient key-material fetch failure instead of proving without keys', async () => {
      // Arrange
      const unavailable = new ZkArtifactFetchError('ZK artifact request failed', 503);
      mockZkConfigProvider.get = vi.fn().mockRejectedValue(unavailable);
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      // Act
      const error = await provider.prove(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);

      // Assert
      expect(error).toBe(unavailable);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('still proves without keys when the flat provider does not serve the circuit', async () => {
      // Arrange
      mockZkConfigProvider.get = vi.fn().mockRejectedValue(new ZkArtifactFetchError('not found', 404));
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30]));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      // Act
      await provider.prove(new Uint8Array([1]), 'test-circuit');

      // Assert
      expect(ledger.createProvingPayload).toHaveBeenCalledWith(new Uint8Array([1]), undefined, undefined);
    });

    it('wraps a transport failure and keeps it on cause', async () => {
      const networkFailure = new TypeError('fetch failed');
      mockFetch.mockRejectedValue(networkFailure);
      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20]));
      vi.useFakeTimers();
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      const pending = provider.check(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);
      await vi.runAllTimersAsync();
      const error = await pending;

      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({
        code: 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE',
        message: `Proof Server request failed: url="${mockUrl}/check"`
      });
      expect((error as ProofServerError).cause).toBe(networkFailure);
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

      expect(mockFetch).toHaveBeenCalledWith(
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

      expect(mockFetch).toHaveBeenCalledWith(
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

      expect(mockFetch).toHaveBeenCalledWith(
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

      expect(mockFetch).toHaveBeenCalledWith(
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

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });
  });

  describe('per-request timeout override', () => {
    it('should use overrideTimeout over the configured timeout for check requests', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout: 60000 });

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(new Uint8Array([1, 2, 3]), 'test-circuit', 111);

      expect(timeoutSpy).toHaveBeenLastCalledWith(111);
      timeoutSpy.mockRestore();
    });

    it('should use overrideTimeout over the configured timeout for prove requests', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout: 60000 });

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(new Uint8Array([1, 2, 3]), 'test-circuit', undefined, 222);

      expect(timeoutSpy).toHaveBeenLastCalledWith(222);
      timeoutSpy.mockRestore();
    });

    it('should fall back to the configured timeout when overrideTimeout is undefined', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout: 60000 });

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(new Uint8Array([1, 2, 3]), 'test-circuit');

      expect(timeoutSpy).toHaveBeenLastCalledWith(60000);
      timeoutSpy.mockRestore();
    });
  });

  describe('retry policy', () => {
    const TIMEOUT = 60_000;

    const answer = (status: number, headers: Record<string, string> = {}) => ({
      ok: status >= 200 && status < 300,
      status,
      statusText: `status ${status}`,
      url: mockUrl,
      headers: new Headers(headers),
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([10]).buffer)
    });

    const timedOut = () => new DOMException('The operation was aborted due to timeout', 'TimeoutError');

    const startProve = (timeout = TIMEOUT) => {
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout });
      return provider.prove(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30]));
      vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(timedOut()), ms);
        return controller.signal;
      });
    });

    afterEach(() => {
      vi.mocked(AbortSignal.timeout).mockRestore();
    });

    it.each([429, 500, 503])('retries a %i answer after the backoff, under the same deadline', async (status) => {
      // Arrange
      mockFetch.mockResolvedValueOnce(answer(status)).mockResolvedValueOnce(answer(200));

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(999);
      const callsBeforeBackoff = mockFetch.mock.calls.length;
      await vi.advanceTimersByTimeAsync(1);

      // Assert
      expect(callsBeforeBackoff).toBe(1);
      expect(await result).toEqual(new Uint8Array([10]));
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][1].signal).toBe(mockFetch.mock.calls[0][1].signal);
    });

    it.each([400, 404, 502, 504])('does not retry a %i answer', async (status) => {
      // Arrange
      mockFetch.mockResolvedValue(answer(status));

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(30_000);

      // Assert
      expect(await result).toMatchObject({ name: 'ProofServerError', message: expect.stringContaining(`code="${status}"`) });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('backs off 1s, 2s and 4s, then gives up with the last answer', async () => {
      // Arrange
      mockFetch.mockResolvedValue(answer(503));

      // Act
      const result = startProve();
      const callsAt: number[] = [];
      for (const elapsed of [999, 1, 1_999, 1, 3_999, 1]) {
        await vi.advanceTimersByTimeAsync(elapsed);
        callsAt.push(mockFetch.mock.calls.length);
      }

      // Assert
      expect(callsAt).toEqual([1, 2, 2, 3, 3, 4]);
      const error = await result;
      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({ code: 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', status: 503 });
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('waits the number of seconds a Retry-After header asks for', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(answer(429, { 'Retry-After': '5' })).mockResolvedValueOnce(answer(200));

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(4_999);
      const callsBeforeRetryAfter = mockFetch.mock.calls.length;
      await vi.advanceTimersByTimeAsync(1);

      // Assert
      expect(callsBeforeRetryAfter).toBe(1);
      expect(await result).toEqual(new Uint8Array([10]));
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('waits until the HTTP date a Retry-After header names', async () => {
      // Arrange
      vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
      mockFetch
        .mockResolvedValueOnce(answer(429, { 'Retry-After': 'Mon, 23 Nov 2026 12:00:03 GMT' }))
        .mockResolvedValueOnce(answer(200));

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(2_999);
      const callsBeforeRetryAfter = mockFetch.mock.calls.length;
      await vi.advanceTimersByTimeAsync(1);

      // Assert
      expect(callsBeforeRetryAfter).toBe(1);
      expect(await result).toEqual(new Uint8Array([10]));
    });

    it.each(['0', 'Sun, 22 Nov 2026 12:00:00 GMT'])('retries at once when Retry-After is %s', async (retryAfter) => {
      // Arrange
      vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
      mockFetch.mockResolvedValueOnce(answer(429, { 'Retry-After': retryAfter })).mockResolvedValueOnce(answer(200));

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(await result).toEqual(new Uint8Array([10]));
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it.each(['soon', '-5', '1.5'])('falls back to the backoff when Retry-After is %s', async (retryAfter) => {
      // Arrange
      mockFetch.mockResolvedValueOnce(answer(429, { 'Retry-After': retryAfter })).mockResolvedValueOnce(answer(200));

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(999);
      const callsBeforeBackoff = mockFetch.mock.calls.length;
      await vi.advanceTimersByTimeAsync(1);

      // Assert
      expect(callsBeforeBackoff).toBe(1);
      expect(await result).toEqual(new Uint8Array([10]));
    });

    it.each(['3600', '99999999'])('fails at the deadline when Retry-After %s outlasts the timeout', async (retryAfter) => {
      // Arrange
      mockFetch.mockResolvedValue(answer(429, { 'Retry-After': retryAfter }));

      // Act
      const result = startProve(2_000);
      await vi.advanceTimersByTimeAsync(2_000);
      const error = await result;
      await vi.advanceTimersByTimeAsync(600_000);

      // Assert
      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({ code: 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', cause: { name: 'TimeoutError' } });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries a network failure after the backoff', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(answer(200));

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(1_000);

      // Assert
      expect(await result).toEqual(new Uint8Array([10]));
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry a request the timeout aborted', async () => {
      // Arrange
      const abortError = new DOMException('This operation was aborted', 'AbortError');
      mockFetch.mockImplementation(
        (_url: URL, init: RequestInit) =>
          new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(abortError)))
      );

      // Act
      const result = startProve(2_000);
      await vi.advanceTimersByTimeAsync(2_000);
      const error = await result;
      await vi.advanceTimersByTimeAsync(600_000);

      // Assert
      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({ code: 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', cause: abortError });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('ends the call at the deadline when the timeout fires during the backoff', async () => {
      // Arrange
      mockFetch.mockResolvedValue(answer(503));

      // Act
      const result = startProve(500);
      await vi.advanceTimersByTimeAsync(500);
      const error = await result;
      await vi.advanceTimersByTimeAsync(600_000);

      // Assert
      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({ cause: { name: 'TimeoutError' } });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not send the request again when reading a successful answer fails', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ ...answer(200), arrayBuffer: vi.fn().mockRejectedValue(timedOut()) });

      // Act
      const result = startProve();
      await vi.advanceTimersByTimeAsync(30_000);

      // Assert
      expect(await result).toMatchObject({ message: `Proof Server response could not be read: url="${mockUrl}/prove"` });
      expect(mockFetch).toHaveBeenCalledTimes(1);
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

      const calledUrl = mockFetch.mock.calls[0][0] as URL;
      expect(calledUrl.pathname).toBe('/api/v1/check');
    });

    it('should preserve query parameters in URL', async () => {
      const urlWithQuery = 'http://localhost:8080?token=secret123';
      const provider = httpClientProvingProvider(urlWithQuery, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));
      vi.mocked(ledger.parseCheckResult).mockReturnValue([undefined]);

      await provider.check(serializedPreimage, 'test-circuit');

      const calledUrl = mockFetch.mock.calls[0][0] as URL;
      expect(calledUrl.search).toBe('?token=secret123');
    });

    it('should preserve both path and query parameters', async () => {
      const urlWithPathAndQuery = 'http://localhost:8080/api/v1?token=secret&env=test';
      const provider = httpClientProvingProvider(urlWithPathAndQuery, mockZkConfigProvider);
      const serializedPreimage = new Uint8Array([1, 2, 3]);

      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(serializedPreimage, 'test-circuit');

      const calledUrl = mockFetch.mock.calls[0][0] as URL;
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

      const calledUrl = mockFetch.mock.calls[0][0] as URL;
      expect(calledUrl.pathname).toBe('/api/v1/check');
    });
  });


  describe('proof server error details', () => {
    it('includes the response body in the error when the proof server rejects a request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        url: mockUrl,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue("bad input: `couldn't find built-in key increment`")
      });
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30]));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      const error = await provider.prove(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({
        code: 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED',
        message: `Failed Proof Server response: url="${mockUrl}", code="400", status="Bad Request", body="bad input: \`couldn't find built-in key increment\`"`
      });
    });

    it('bounds the response body included in the error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        url: mockUrl,
        headers: new Headers(),
        text: vi.fn().mockResolvedValue('x'.repeat(5000))
      });
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30]));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      const error = await provider.prove(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ProofServerError);
      const body = /body="([^"]*)"/.exec((error as Error).message)?.[1] ?? '';
      expect(body.length).toBeLessThanOrEqual(1001);
      expect(body.endsWith('…')).toBe(true);
    });

    it('keeps the status-only message when the error body cannot be read', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        url: mockUrl,
        headers: new Headers(),
        text: vi.fn().mockRejectedValue(new Error('stream failed'))
      });
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30]));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider);

      const error = await provider.prove(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);

      expect(error).toMatchObject({
        message: `Failed Proof Server response: url="${mockUrl}", code="400", status="Bad Request"`
      });
    });

    it.each([
      ['TimeoutError', new DOMException('The operation was aborted due to timeout', 'TimeoutError')],
      ['AbortError', new DOMException('The user aborted a request.', 'AbortError')]
    ])('reports a request timeout as a timeout (%s)', async (_name, failure) => {
      // fetchWithRetry retries a rejected fetch under the same deadline; fake timers carry the
      // retries through their backoffs (1s + 2s + 4s) to the final rejection.
      vi.useFakeTimers();
      mockFetch.mockRejectedValue(failure);
      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20]));
      const provider = httpClientProvingProvider(mockUrl, mockZkConfigProvider, { timeout: 1234 });

      const result = provider.check(new Uint8Array([1]), 'test-circuit').catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(10_000);
      const error = await result;

      expect(error).toBeInstanceOf(ProofServerError);
      expect(error).toMatchObject({
        message: `Proof Server request timed out after 1234 ms: url="${mockUrl}/check"`
      });
      expect((error as ProofServerError).cause).toBe(failure);
    });
  });

  describe('registry key resolution', () => {
    const verifierKey = new Uint8Array([4, 5, 6]);
    const contractAddress = 'aa'.repeat(32);

    const registrySource = (): ZKConfigProvider<string> =>
      zkConfigProviderWith({
        getVerifierKey: vi.fn().mockResolvedValue(verifierKey),
        getProverKey: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        getZKIR: vi.fn().mockResolvedValue(new Uint8Array([7, 8, 9]))
      });

    const locationFor = (vk: Uint8Array): string =>
      encodeContractKeyLocation({ contractAddress, circuitId: 'transfer', verifierKeyHash: hashVerifierKey(vk) });

    it('resolves a canonical key location through the registry and supplies its key material', async () => {
      const provider = httpClientProvingProvider(mockUrl, new ZKConfigRegistry([registrySource()]));
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      await provider.prove(new Uint8Array([1, 2, 3]), locationFor(verifierKey));

      expect(ledger.createProvingPayload).toHaveBeenCalledWith(
        new Uint8Array([1, 2, 3]),
        undefined,
        expect.objectContaining({
          proverKey: expect.any(Uint8Array),
          verifierKey: expect.any(Uint8Array),
          ir: expect.any(Uint8Array)
        })
      );
    });

    it('propagates ZKArtifactNotFoundError from prove() when the deployed verifier key has drifted', async () => {
      const provider = httpClientProvingProvider(mockUrl, new ZKConfigRegistry([registrySource()]));
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      // A canonical location whose embedded verifier-key hash matches no source.
      await expect(
        provider.prove(new Uint8Array([1, 2, 3]), locationFor(new Uint8Array([9, 9, 9])))
      ).rejects.toBeInstanceOf(ZKArtifactNotFoundError);
    });

    it('propagates ZKArtifactNotFoundError from check() when the deployed verifier key has drifted', async () => {
      const provider = httpClientProvingProvider(mockUrl, new ZKConfigRegistry([registrySource()]));
      vi.mocked(ledger.createCheckPayload).mockReturnValue(new Uint8Array([20, 21, 22]));

      await expect(
        provider.check(new Uint8Array([1, 2, 3]), locationFor(new Uint8Array([9, 9, 9])))
      ).rejects.toBeInstanceOf(ZKArtifactNotFoundError);
    });

    it('returns undefined key material for a non-contract location when only a registry is given', async () => {
      const provider = httpClientProvingProvider(mockUrl, new ZKConfigRegistry([registrySource()]));
      vi.mocked(ledger.createProvingPayload).mockReturnValue(new Uint8Array([30, 31, 32]));

      // A protocol builtin: not a contract key location, and there is no flat provider to fall back to.
      await provider.prove(new Uint8Array([1, 2, 3]), 'midnight/zswap/spend');

      expect(ledger.createProvingPayload).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), undefined, undefined);
    });
  });
});
