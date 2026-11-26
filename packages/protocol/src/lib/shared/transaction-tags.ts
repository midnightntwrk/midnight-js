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

import type { LedgerEra } from './ledger-version';

/** Every transaction stage, in the order a transaction goes through them. */
export const TRANSACTION_STAGES = Object.freeze(['Unproven', 'Unbound', 'Finalized'] as const);

/** The point in its life a transaction has reached: before proving, after proving, after binding. */
export type TransactionStage = (typeof TRANSACTION_STAGES)[number];

/**
 * The full header each ledger era writes in front of a transaction at each stage: the schema
 * version, then the signature, proof and binding markers.
 */
export const LEDGER_TRANSACTION_TAGS = Object.freeze({
  v8: Object.freeze({
    Unproven: 'midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1])',
    Unbound: 'midnight:transaction[v9](signature[v1],proof,embedded-fr[v1])',
    Finalized: 'midnight:transaction[v9](signature[v1],proof,pedersen-schnorr[v1])'
  }),
  v9: Object.freeze({
    Unproven: 'midnight:transaction[v12](signature[v2],proof-preimage,embedded-fr[v1])',
    Unbound: 'midnight:transaction[v12](signature[v2],proof,embedded-fr[v1])',
    Finalized: 'midnight:transaction[v12](signature[v2],proof,pedersen-schnorr[v1])'
  })
} as const satisfies Record<LedgerEra, Record<TransactionStage, string>>);
