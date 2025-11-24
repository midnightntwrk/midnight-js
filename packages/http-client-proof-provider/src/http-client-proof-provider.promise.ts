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

import { FetchHttpClient } from '@effect/platform';
import type { UnprovenTransaction } from '@midnight-ntwrk/ledger-v6';
import type { ProofProvider, ProvenTransaction, ProveTxConfig } from '@midnight-ntwrk/midnight-js-types';
import { InvalidProtocolSchemeError } from '@midnight-ntwrk/midnight-js-types';
import { Effect, Either } from 'effect';

import type { ProofProviderError } from './errors';
import { ProofProviderService, ProofProviderServiceLive } from './http-client-proof-provider.effect';
import * as HttpURL from './HttpURL';

const convertErrorToThrowable = (error: ProofProviderError): Error => {
  switch (error._tag) {
    case 'InvalidProtocolError':
      return new InvalidProtocolSchemeError(error.protocol, error.allowed as string[]);
    case 'HttpError':
      return new Error(
        `Failed Proof Server response: url="${error.url}", code="${error.status}", status="${error.statusText}"`
      );
    case 'NetworkError':
      return new Error(`Network error: ${error.message}`);
    case 'TimeoutError':
      return new Error(`Request timeout after ${error.duration}ms`);
    case 'DeserializationError':
      return new Error(`Deserialization error: ${error.message}`);
  }
};

export const httpClientProofProvider = <K extends string>(url: string): ProofProvider<K> => {
  const validationResult = HttpURL.make(url);
  
  if (Either.isLeft(validationResult)) {
    throw new InvalidProtocolSchemeError(validationResult.left.protocol, validationResult.left.allowed as string[]);
  }

  return {
    async proveTx(unprovenTx: UnprovenTransaction, config?: ProveTxConfig<K>): Promise<ProvenTransaction> {
      const program = Effect.gen(function* () {
        const service = yield* ProofProviderService;
        return yield* service.proveTx(unprovenTx, config);
      });

      return program.pipe(
        Effect.provide(ProofProviderServiceLive(url)),
        Effect.provide(FetchHttpClient.layer),
        Effect.mapError(convertErrorToThrowable),
        Effect.runPromise
      );
    }
  };
};
