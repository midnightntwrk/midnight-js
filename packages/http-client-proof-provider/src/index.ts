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

/**
 * HTTP Client Proof Provider
 *
 * This package provides two levels of abstraction for interacting with a Midnight proof server:
 *
 * ## High-Level: Transaction Proving (ProofProvider)
 * Use `httpClientProofProvider` for most use cases. It handles complete transactions
 * by using the low-level ProvingProvider internally.
 *
 * ```typescript
 * import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
 *
 * const proofProvider = httpClientProofProvider(
 *   'http://localhost:6300',
 *   zkConfigProvider
 * );
 * const provenTx = await proofProvider.proveTx(unprovenTx, { zkConfig });
 * ```
 *
 * ## Low-Level: Circuit Proving (ProvingProvider)
 * Use `httpClientProvingProvider` for advanced scenarios where you need fine-grained
 * control over individual circuit proving operations.
 *
 * ```typescript
 * import { httpClientProvingProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
 *
 * const provingProvider = httpClientProvingProvider(
 *   'http://localhost:6300',
 *   zkConfigProvider
 * );
 * const checkResult = await provingProvider.check(serializedPreimage, circuitId);
 * const proof = await provingProvider.prove(serializedPreimage, circuitId);
 * ```
 *
 * ## Architecture
 * ```
 * ProofProvider (httpClientProofProvider)
 *     ↓ uses
 * ProvingProvider (httpClientProvingProvider)
 *     ↓ calls
 * Proof Server (/check, /prove)
 * ```
 */

// High-level: Transaction-level proving (ProofProvider)
// This is an adapter that uses ProvingProvider internally
export {
  DEFAULT_CONFIG,
  httpClientProofProvider} from './http-client-proof-provider';

// Low-level: Circuit-level proving (ProvingProvider)
// This is the base implementation that talks to /check and /prove endpoints
export {
  DEFAULT_TIMEOUT,
  httpClientProvingProvider,
  type ProvingProviderConfig
} from './http-client-proving-provider';
