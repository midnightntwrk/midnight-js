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

import { FetchHttpClient, HttpClient, type HttpClientResponse } from '@effect/platform';
import { Duration, Effect, Either, Layer, Schedule, Stream } from 'effect';
import { describe, expect, test } from 'vitest';

import { InvalidProtocolError } from '../errors';
import {
  ProofProviderService,
  ProofProviderServiceLive,
  serializeTransactionPayload
} from '../http-client-proof-provider.effect';
import { getValidUnprovenTx, getValidZKConfig } from './commons';

describe('Http Proof Server Proof Provider - Effect', () => {
  test('ProofProviderServiceLive fails with InvalidProtocolError for invalid protocol', async () => {
    const program = Effect.gen(function* () {
      yield* ProofProviderService;
    }).pipe(Effect.provide(ProofProviderServiceLive('ws://localhost:8080')), Effect.provide(FetchHttpClient.layer), Effect.either);

    const result = await Effect.runPromise(program);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidProtocolError);
      expect(result.left.protocol).toBe('ws:');
    }
  });

  test.each(['ftp:', 'mailto:', 'ws:', 'wss:', 'file:'])(
    'should fail when constructed with %s as the URI scheme',
    async (scheme) => {
      const program = Effect.gen(function* () {
        yield* ProofProviderService;
      }).pipe(
        Effect.provide(ProofProviderServiceLive(`${scheme}//localhost:8080`)),
        Effect.provide(FetchHttpClient.layer),
        Effect.catchTag('InvalidProtocolError', (err) =>
          err.protocol !== scheme
            ? Effect.fail(`Expected '${scheme}' but received '${err.protocol}'`)
            : Effect.succeed(undefined)
        )
      );

      await Effect.runPromise(program);
    }
  );

  test('serializeTransactionPayload produces deterministic output', async () => {
    const zkConfig = await getValidZKConfig();
    const unprovenTx = await getValidUnprovenTx();

    const payload1 = serializeTransactionPayload(unprovenTx, zkConfig);
    const payload2 = serializeTransactionPayload(unprovenTx, zkConfig);

    expect(payload1).toEqual(payload2);
    expect(payload1.byteLength).toBeGreaterThan(0);
  });

  test('serializeTransactionPayload handles Uint8Array correctly', async () => {
    const zkConfig = await getValidZKConfig();
    const unprovenTx = await getValidUnprovenTx();

    const result = serializeTransactionPayload(unprovenTx, zkConfig);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  test('serializeTransactionPayload handles undefined zkConfig', async () => {
    const unprovenTx = await getValidUnprovenTx();

    const result = serializeTransactionPayload(unprovenTx, undefined);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  test('ProofProviderService handles timeout correctly', async () => {
    const neverEndingStream = Stream.fromAsyncIterable(
      (async function* () {
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          yield new Uint8Array([1, 2, 3]);
        }
      })(),
      () => void 0
    );

    const mockHttpClient = {
      execute: () =>
        Effect.succeed({
          status: 200,
          stream: neverEndingStream,
          text: Effect.succeed('mock response'),
          arrayBuffer: Effect.succeed(new ArrayBuffer(0))
        } as unknown as HttpClientResponse.HttpClientResponse)
    };

    const program = Effect.gen(function* () {
      const service = yield* ProofProviderService;
      const unprovenTx = yield* Effect.promise(() => getValidUnprovenTx());
      return yield* service.proveTx(unprovenTx, { timeout: 100, zkConfig: undefined });
    }).pipe(
      Effect.provide(ProofProviderServiceLive('http://localhost:8080')),
      Effect.provide(Layer.succeed(HttpClient.HttpClient, mockHttpClient as any)),
      Effect.either
    );

    const result = await Effect.runPromise(program);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('TimeoutError');
    }
  });

  test('ProofProviderService handles HTTP errors correctly', async () => {
    const mockHttpClient = {
      execute: () =>
        Effect.fail({
          _tag: 'ResponseError',
          response: {
            status: 500,
            text: Effect.succeed('Internal Server Error')
          }
        } as any)
    };

    const program = Effect.gen(function* () {
      const service = yield* ProofProviderService;
      const unprovenTx = yield* Effect.promise(() => getValidUnprovenTx());
      return yield* service.proveTx(unprovenTx, { timeout: 5000, zkConfig: undefined });
    }).pipe(
      Effect.provide(ProofProviderServiceLive('http://localhost:8080')),
      Effect.provide(Layer.succeed(HttpClient.HttpClient, mockHttpClient as any)),
      Effect.either
    );

    const result = await Effect.runPromise(program);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('HttpError');
      if (result.left._tag === 'HttpError') {
        expect(result.left.status).toBe(500);
        expect(result.left.statusText).toBe('Internal Server Error');
      }
    }
  });

  test('ProofProviderService handles non-200 response status', async () => {
    const mockStream = Stream.fromIterable([new Uint8Array([1, 2, 3])]);

    const mockHttpClient = {
      execute: () =>
        Effect.succeed({
          status: 400,
          text: Effect.succeed('Bad Request'),
          stream: mockStream,
          arrayBuffer: Effect.succeed(new ArrayBuffer(0))
        } as unknown as HttpClientResponse.HttpClientResponse)
    };

    const program = Effect.gen(function* () {
      const service = yield* ProofProviderService;
      const unprovenTx = yield* Effect.promise(() => getValidUnprovenTx());
      return yield* service.proveTx(unprovenTx, { timeout: 5000, zkConfig: undefined });
    }).pipe(
      Effect.provide(ProofProviderServiceLive('http://localhost:8080')),
      Effect.provide(Layer.succeed(HttpClient.HttpClient, mockHttpClient as any)),
      Effect.either
    );

    const result = await Effect.runPromise(program);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('HttpError');
      if (result.left._tag === 'HttpError') {
        expect(result.left.status).toBe(400);
        expect(result.left.statusText).toBe('Bad Request');
      }
    }
  });
});
