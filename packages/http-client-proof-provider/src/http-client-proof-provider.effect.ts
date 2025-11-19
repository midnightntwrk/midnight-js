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

import { HttpClient, HttpClientRequest, type HttpClientResponse } from '@effect/platform';
import {
  createProvingTransactionPayload,
  type ProvingKeyMaterial,
  Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/ledger-v6';
import type { ProvenTransaction, ProveTxConfig, ZKConfig } from '@midnight-ntwrk/midnight-js-types';
import { Chunk, Context, Duration, Effect, Either, Layer, Schedule, Stream } from 'effect';
import _ from 'lodash';

import {
  DeserializationError,
  HttpError,
  type InvalidProtocolError,
  NetworkError,
  type ProofProviderError,
  TimeoutError
} from './errors';
import * as HttpURL from './HttpURL';

const PROVE_TX_PATH = '/prove-tx';

export const DEFAULT_CONFIG = {
  timeout: 300000,
  zkConfig: undefined
};

const getKeyMaterial = <K extends string>(zkConfig?: ZKConfig<K>): ProvingKeyMaterial => {
  return {
    proverKey: zkConfig?.proverKey as Uint8Array,
    verifierKey: zkConfig?.verifierKey as Uint8Array,
    ir: zkConfig?.zkir as Uint8Array
  };
};

export const serializeTransactionPayload = <K extends string>(
  unprovenTx: UnprovenTransaction,
  zkConfig?: ZKConfig<K>
): Uint8Array => {
  const map = new Map();
  if (zkConfig) {
    map.set(zkConfig?.circuitId, getKeyMaterial(zkConfig));
  }
  return createProvingTransactionPayload(unprovenTx, map);
};

const deserializePayload = (arrayBuffer: ArrayBuffer): Effect.Effect<ProvenTransaction, DeserializationError> =>
  Effect.try({
    try: () => {
      const bytes = new Uint8Array(arrayBuffer);
      return Transaction.deserialize('signature', 'proof', 'pre-binding', bytes) as ProvenTransaction;
    },
    catch: (error) =>
      new DeserializationError({
        message: 'Failed to deserialize proven transaction',
        cause: error
      })
  });

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

const receiveBody = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<Uint8Array, NetworkError> =>
  response.stream.pipe(
    Stream.runCollect,
    Effect.map((chunks) => concatBytes(Chunk.toArray(chunks))),
    Effect.mapError(
      (error) =>
        new NetworkError({
          message: 'Failed to read response body',
          cause: error
        })
    )
  );

export class ProofProviderService extends Context.Tag('ProofProviderService')<
  ProofProviderService,
  {
    readonly proveTx: <K extends string>(
      unprovenTx: UnprovenTransaction,
      config?: ProveTxConfig<K>
    ) => Effect.Effect<ProvenTransaction, ProofProviderError>;
  }
>() {}

export const makeProofProviderService = (url: string) =>
  HttpURL.make(url).pipe(
    Either.map((baseUrl) =>
      Effect.gen(function* () {
        const httpClient = yield* HttpClient.HttpClient;
        const endpointUrl = new URL(PROVE_TX_PATH, baseUrl);

        const proveTx = <K extends string>(
          unprovenTx: UnprovenTransaction,
          partialProveTxConfig?: ProveTxConfig<K>
        ): Effect.Effect<ProvenTransaction, ProofProviderError> =>
          Effect.gen(function* () {
            const config = _.defaults(partialProveTxConfig, DEFAULT_CONFIG);
            const requestBody = serializeTransactionPayload(unprovenTx, config.zkConfig);

            const request = HttpClientRequest.post(endpointUrl.toString()).pipe(
              HttpClientRequest.bodyUint8Array(requestBody),
              HttpClientRequest.acceptJson
            );

            const response: HttpClientResponse.HttpClientResponse = yield* httpClient.execute(request).pipe(
              Effect.retry({
                times: 3,
                while: (error) =>
                  error._tag === 'ResponseError' && (error.response.status === 500 || error.response.status === 503),
                schedule: Schedule.exponential(Duration.seconds(1), 2)
              }),
              Effect.timeout(Duration.millis(config.timeout)),
              Effect.catchTags({
                TimeoutException: () => Effect.fail(new TimeoutError({ duration: config.timeout })),
                RequestError: (error) =>
                  Effect.fail(
                    new NetworkError({
                      message: `Failed to connect to Proof Server: ${error.message}`,
                      cause: error
                    })
                  ),
                ResponseError: (error) =>
                  Effect.gen(function* () {
                    const text = yield* Effect.orElse(error.response.text, () =>
                      Effect.succeed('Unknown server error')
                    );
                    return yield* Effect.fail(
                      new HttpError({
                        url: endpointUrl.toString(),
                        status: error.response.status,
                        statusText: text
                      })
                    );
                  })
              })
            );

            if (response.status !== 200) {
              const text = yield* Effect.orElse(response.text, () => Effect.succeed('Unknown error'));
              return yield* Effect.fail(
                new HttpError({
                  url: endpointUrl.toString(),
                  status: response.status,
                  statusText: text
                })
              );
            }

            const bodyBytes = yield* receiveBody(response);
            return yield* deserializePayload(bodyBytes.buffer as ArrayBuffer);
          });

        return { proveTx };
      })
    ),
    Either.match({
      onLeft: (error) => Effect.fail(error),
      onRight: (effect) => effect
    })
  );

export const ProofProviderServiceLive = (
  url: string
): Layer.Layer<ProofProviderService, InvalidProtocolError, HttpClient.HttpClient> =>
  Layer.effect(ProofProviderService, makeProofProviderService(url));
