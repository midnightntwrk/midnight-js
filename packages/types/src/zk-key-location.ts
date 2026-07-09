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
 * The canonical key-location grammar for contract calls.
 *
 * The grammar is defined once, upstream, in `@midnight-ntwrk/compact-js` (the
 * `ContractKeyLocation` module) so that every transaction assembler and prover shares a single
 * definition; this module re-exports it. See the upstream module for the full specification:
 * each contract call's proof preimage carries the canonical, self-describing location
 * `contract:<address-hex>/<circuitId>?vk=<sha-256 of the deployed verifier key>`, which provers
 * resolve by verifier-key content rather than by circuit name (see `ZKConfigRegistry`).
 */
export {
  type ContractKeyLocation,
  encodeContractKeyLocation,
  hashVerifierKey,
  parseContractKeyLocation
} from '@midnight-ntwrk/midnight-js-protocol/compact-js';
