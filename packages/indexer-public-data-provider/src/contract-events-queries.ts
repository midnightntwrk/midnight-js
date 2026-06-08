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

import { gql } from './gen';

// Aliases reconcile two GraphQL field-merge conflicts in the response shape:
// - `amount` differs between Shielded (nullable String) and Unshielded (non-null String!)
//   variants; the non-null sites are aliased to `amountRequired`.
// - `sender`/`recipient` on Unshielded variants are `AddressOrContract` objects with
//   nested fields; they're inlined here rather than fragmented to keep the codec flat.
export const CONTRACT_EVENT_FIELDS_FRAGMENT = gql(`
  fragment ContractEventFields on ContractEvent {
    __typename
    id
    raw
    maxId
    protocolVersion
    version
    contractAddress
    transactionId
    ... on ShieldedSpendEvent { nullifier }
    ... on ShieldedReceiveEvent {
      commitment
      ciphertext
      receivingContractAddress
    }
    ... on ShieldedMintEvent {
      commitment
      domainSep
      amount
    }
    ... on ShieldedBurnEvent {
      nullifier
      amount
    }
    ... on UnshieldedSpendEvent {
      sender { kind userAddress contractAddress }
      domainSep
      tokenType
      amountRequired: amount
    }
    ... on UnshieldedReceiveEvent {
      recipient { kind userAddress contractAddress }
      domainSep
      tokenType
      amountRequired: amount
    }
    ... on UnshieldedMintEvent {
      domainSep
      tokenType
      amountRequired: amount
    }
    ... on UnshieldedBurnEvent {
      sender { kind userAddress contractAddress }
      tokenType
      amountRequired: amount
    }
    ... on MiscContractEvent { name payload }
  }
`);

export const CONTRACT_EVENTS_QUERY = gql(`
  query CONTRACT_EVENTS_QUERY($filter: ContractEventFilter!, $limit: Int, $offset: Int) {
    contractEvents(filter: $filter, limit: $limit, offset: $offset) {
      ...ContractEventFields
    }
  }
`);

export const CONTRACT_EVENTS_SUB = gql(`
  subscription CONTRACT_EVENTS_SUB($filter: ContractEventFilter!, $id: Int) {
    contractEvents(filter: $filter, id: $id) {
      ...ContractEventFields
    }
  }
`);
