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

import { HttpClient, type HttpClientError, HttpClientRequest, type HttpClientResponse } from '@effect/platform';
import {
  createProvingTransactionPayload,
  type ProvingKeyMaterial,
  Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/ledger-v6';
import type { ProvenTransaction, ProveTxConfig, ZKConfig } from '@midnight-ntwrk/midnight-js-types';
import { Context, Duration, Effect, Layer, Schedule } from 'effect';
import _ from 'lodash';

import {
  DeserializationError,
  HttpError,
  InvalidProtocolError,
  NetworkError,
  type ProofProviderError,
  TimeoutError
} from './errors';

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

const validateUrl = (url: string): Effect.Effect<URL, InvalidProtocolError> =>
  Effect.try({
    try: () => {
      const urlObject = new URL(PROVE_TX_PATH, url);
      if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
        throw new InvalidProtocolError({
          protocol: urlObject.protocol,
          allowed: ['http:', 'https:']
        });
      }
      return urlObject;
    },
    catch: (error) => {
      if (error instanceof InvalidProtocolError) {
        return error;
      }
      throw error;
    }
  });

const retrySchedule = Schedule.exponential(Duration.seconds(1), 2).pipe(
  Schedule.compose(Schedule.recurs(3)),
  Schedule.whileInput((error: HttpClientError.HttpClientError) => {
    if (error._tag === 'ResponseError') {
      const responseError = error as HttpClientError.ResponseError;
      return responseError.response.status === 500 || responseError.response.status === 503;
    }
    return false;
  })
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
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const validatedUrl = yield* validateUrl(url);

    const proveTx = <K extends string>(
      unprovenTx: UnprovenTransaction,
      partialProveTxConfig?: ProveTxConfig<K>
    ): Effect.Effect<ProvenTransaction, ProofProviderError> =>
      Effect.gen(function* () {
        const config = _.defaults(partialProveTxConfig, DEFAULT_CONFIG);
        const requestBody = serializeTransactionPayload(unprovenTx, config.zkConfig);

        const request = HttpClientRequest.post(validatedUrl.toString()).pipe(
          HttpClientRequest.bodyUint8Array(requestBody),
          HttpClientRequest.acceptJson
        );

        const executeWithRetry: Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> =
          httpClient.execute(request).pipe(Effect.retry(retrySchedule));

        const executeWithTimeout: Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError | { _tag: 'TimeoutException' }> =
          Effect.timeout(executeWithRetry, Duration.millis(config.timeout));

        const response: HttpClientResponse.HttpClientResponse = yield* executeWithTimeout.pipe(
          Effect.mapError((error): ProofProviderError => {
            if (error._tag === 'TimeoutException') {
              return new TimeoutError({ duration: config.timeout });
            }
            if (error._tag === 'ResponseError') {
              const responseError = error as HttpClientError.ResponseError;
              return new HttpError({
                url: validatedUrl.toString(),
                status: responseError.response.status,
                statusText: String(responseError.response.status)
              });
            }
            return new NetworkError({
              message: 'Network request failed',
              cause: error
            });
          })
        );

        const arrayBuffer: ArrayBuffer = yield* response.arrayBuffer.pipe(
          Effect.mapError((error): ProofProviderError =>
            new NetworkError({
              message: 'Failed to read response body',
              cause: error
            })
          )
        );

        return yield* deserializePayload(arrayBuffer);
      });

    return { proveTx };
  });

export const ProofProviderServiceLive = (url: string): Layer.Layer<ProofProviderService, InvalidProtocolError, HttpClient.HttpClient> =>
  Layer.effect(ProofProviderService, makeProofProviderService(url));
