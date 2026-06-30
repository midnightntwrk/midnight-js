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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ContractEvent, ContractEventAddress, ContractEventBase } from '@midnight-ntwrk/midnight-js-types';

import { IndexerDataError } from './errors';
import type { ContractEventsQueryQuery } from './gen/graphql';

/**
 * A single contract-event node as returned by `CONTRACT_EVENTS_QUERY` /
 * `CONTRACT_EVENTS_SUB`. The two operations select identical fields, so the
 * query element type structurally covers the subscription payload too.
 */
export type ContractEventNode = ContractEventsQueryQuery['contractEvents'][number];

/**
 * The `sender`/`recipient` selection shape, derived from the generated operation
 * type rather than hand-redeclared — a schema change to `AddressOrContract`
 * surfaces as a compile error here instead of silent runtime drift.
 */
type AddressOrContractNode = Extract<ContractEventNode, { sender: object }>['sender'];

const baseFields = (node: ContractEventNode): ContractEventBase => ({
  id: node.id,
  maxId: node.maxId,
  version: node.version,
  contractAddress: node.contractAddress as ContractAddress,
  transactionId: node.transactionId,
  raw: node.raw
});

/**
 * Asserts a nullable indexer field is present, throwing fail-fast on `null`.
 * Selected GraphQL fields are always present in the response, so the only
 * absent case is an explicit `null` (indexer drift) — never `undefined`.
 */
const requireField = (value: string | null, typename: string, field: string): string => {
  if (value === null) {
    throw IndexerDataError.missingEventField(typename, field);
  }
  return value;
};

/** Normalizes an absent (`null`) nullable field to `undefined`. */
const optionalField = (value: string | null): string | undefined => value ?? undefined;

/**
 * Narrows the indexer's `AddressOrContract` tagged union to the public
 * {@link ContractEventAddress}. Fails fast — surfaces indexer inconsistency
 * rather than emitting a half-built address — on an unrecognized `kind`
 * (`unknownAddressKind`) or an absent `kind`-selected address field
 * (`missingEventField`).
 */
const toEventAddress = (
  address: AddressOrContractNode,
  typename: string,
  field: string
): ContractEventAddress => {
  if (address.kind === 'USER') {
    return { kind: 'user', value: requireField(address.userAddress, typename, `${field}.userAddress`) };
  }
  if (address.kind === 'CONTRACT') {
    return { kind: 'contract', value: requireField(address.contractAddress, typename, `${field}.contractAddress`) };
  }
  throw IndexerDataError.unknownAddressKind(typename, field, address.kind);
};

/**
 * Pure response mapper: indexer event node → public {@link ContractEvent}.
 *
 * Discriminates on `__typename`, fails fast on an unknown typename or a missing
 * required field, normalizes absent nullable fields to `undefined`, and carries
 * `raw` verbatim (never decoded or validated). `amount` is carried as the exact
 * indexer string — never coerced through `Number()`.
 */
export const toContractEvent = (node: ContractEventNode): ContractEvent => {
  const tn = node.__typename;
  switch (node.__typename) {
    case 'ShieldedSpendEvent':
      return { eventType: 'ShieldedSpend', ...baseFields(node), nullifier: requireField(node.nullifier, tn, 'nullifier') };
    case 'ShieldedReceiveEvent':
      return {
        eventType: 'ShieldedReceive',
        ...baseFields(node),
        commitment: requireField(node.commitment, tn, 'commitment'),
        ciphertext: optionalField(node.ciphertext),
        receivingContractAddress: optionalField(node.receivingContractAddress)
      };
    case 'ShieldedMintEvent':
      return {
        eventType: 'ShieldedMint',
        ...baseFields(node),
        commitment: requireField(node.commitment, tn, 'commitment'),
        domainSep: requireField(node.domainSep, tn, 'domainSep'),
        amount: optionalField(node.shieldedAmount)
      };
    case 'ShieldedBurnEvent':
      return {
        eventType: 'ShieldedBurn',
        ...baseFields(node),
        nullifier: requireField(node.nullifier, tn, 'nullifier'),
        amount: optionalField(node.shieldedAmount)
      };
    case 'UnshieldedSpendEvent':
      return {
        eventType: 'UnshieldedSpend',
        ...baseFields(node),
        sender: toEventAddress(node.sender, tn, 'sender'),
        domainSep: requireField(node.domainSep, tn, 'domainSep'),
        tokenType: requireField(node.tokenType, tn, 'tokenType'),
        amount: requireField(node.amount, tn, 'amount')
      };
    case 'UnshieldedReceiveEvent':
      return {
        eventType: 'UnshieldedReceive',
        ...baseFields(node),
        recipient: toEventAddress(node.recipient, tn, 'recipient'),
        domainSep: requireField(node.domainSep, tn, 'domainSep'),
        tokenType: requireField(node.tokenType, tn, 'tokenType'),
        amount: requireField(node.amount, tn, 'amount')
      };
    case 'UnshieldedMintEvent':
      return {
        eventType: 'UnshieldedMint',
        ...baseFields(node),
        domainSep: requireField(node.domainSep, tn, 'domainSep'),
        tokenType: requireField(node.tokenType, tn, 'tokenType'),
        amount: requireField(node.amount, tn, 'amount')
      };
    case 'UnshieldedBurnEvent':
      return {
        eventType: 'UnshieldedBurn',
        ...baseFields(node),
        sender: toEventAddress(node.sender, tn, 'sender'),
        tokenType: requireField(node.tokenType, tn, 'tokenType'),
        amount: requireField(node.amount, tn, 'amount')
      };
    case 'PausedEvent':
      return { eventType: 'Paused', ...baseFields(node) };
    case 'UnpausedEvent':
      return { eventType: 'Unpaused', ...baseFields(node) };
    case 'MiscContractEvent':
      return {
        eventType: 'Misc',
        ...baseFields(node),
        name: requireField(node.name, tn, 'name'),
        payload: requireField(node.payload, tn, 'payload')
      };
    default: {
      // Compile-time exhaustiveness: a new generated variant makes this fail to
      // type-check. Runtime throw guards against indexer schema drift.
      const _exhaustive: never = node;
      throw IndexerDataError.unknownEventType((_exhaustive as { __typename: string }).__typename);
    }
  }
};
