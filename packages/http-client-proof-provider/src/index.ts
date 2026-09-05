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
 * import { unwrapV9 } from '@midnight-ntwrk/midnight-js-types';
 *
 * const proofProvider = httpClientProofProvider(
 *   'http://localhost:6300',
 *   zkConfigProvider
 * );
 * // Transaction payloads cross a provider seam version-tagged: tag on the way
 * // in, narrow on `version` on the way out. There is no untagged form.
 * // `unwrapV9` throws V8PayloadUnsupportedError or UntaggedPayloadError, both
 * // carrying a stable `code` you can match with `hasErrorCode`. That applies to
 * // the seam's own refusals — the ones raised before proving starts. A failure
 * // from inside proof generation is whatever the ledger runtime raises, on
 * // either era, and carries no midnight-js code.
 * const provenTx = unwrapV9(
 *   await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
 *   'proveTx'
 * );
 * ```
 *
 * ### Both ledger eras
 * This provider serves the retained (`v8`) era as well as the current one. A retained-era
 * transaction crosses the seam as serialized bytes in both directions, and comes back in the
 * same arm it was sent in:
 *
 * ```typescript
 * const proven = await proofProvider.proveTx({ version: 'v8', txBytes: unprovenTxBytes });
 * if (proven.version === 'v8') {
 *   // `proven.txBytes` is the serialized, proven transaction.
 * }
 * ```
 *
 * The era is carried by the `version` tag, never inferred from the payload. Note that
 * `createProofProvider` in `@midnight-ntwrk/midnight-js-types` refuses the retained arm — it
 * adapts a current-era-only `ProvingProvider` — so reach for this provider, not that helper, when
 * you need both eras.
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
