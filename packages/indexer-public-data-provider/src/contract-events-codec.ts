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
import type {
  ContractEventDecodeFailure,
  ContractEventEnvelope,
  VersionedLogItem,
} from '@midnight-ntwrk/midnight-js-types';

import { IndexerDataError } from './errors';
import type { ContractEventsQueryQuery, ContractEventsSubSubscription } from './gen/graphql';

/** Single contract-event row as returned by the indexer (query or subscription). */
export type RawContractEvent =
  | ContractEventsQueryQuery['contractEvents'][number]
  | ContractEventsSubSubscription['contractEvents'];

/** Result of decoding one row: typed item or recoverable failure with cursor-advancing id. */
export type DecodeResult =
  | { readonly ok: true;  readonly item: VersionedLogItem }
  | { readonly ok: false; readonly failure: ContractEventDecodeFailure };

const toEnvelope = (raw: RawContractEvent): ContractEventEnvelope => ({
  id: raw.id,
  version: raw.version,
  protocolVersion: raw.protocolVersion,
  contractAddress: raw.contractAddress as ContractAddress,
  transactionId: raw.transactionId,
  raw: raw.raw,
});

const toAmount = (raw: RawContractEvent, s: string | null): bigint | null => {
  if (s === null) return null;
  try {
    return BigInt(s);
  } catch (cause) {
    throw IndexerDataError.eventMalformedPayload(raw.__typename, 'amount', cause);
  }
};

const toRequiredAmount = (raw: RawContractEvent, s: string): bigint => {
  try {
    return BigInt(s);
  } catch (cause) {
    throw IndexerDataError.eventMalformedPayload(raw.__typename, 'amount', cause);
  }
};

const flattenAddressOrContract = (
  raw: RawContractEvent,
  field: string,
  addr: { readonly kind: string; readonly userAddress: string | null; readonly contractAddress: string | null },
): string => {
  const value = addr.kind === 'USER' ? addr.userAddress : addr.contractAddress;
  if (value === null) {
    throw IndexerDataError.eventMissingRequiredField(raw.__typename, `${field}.${addr.kind === 'USER' ? 'userAddress' : 'contractAddress'}`);
  }
  return value;
};

const toFailure = (
  raw: RawContractEvent,
  reason: 'malformedPayload' | 'unknownTypename',
  message: string,
): ContractEventDecodeFailure => ({
  id: raw.id,
  typename: raw.__typename,
  reason,
  message,
});

/**
 * Decode one GraphQL contract-event row into a typed `VersionedLogItem`.
 *
 * Returns `{ ok: false }` on recoverable failures (unknown __typename, malformed
 * amount) so the caller can skip the row and advance the cursor past it. Throws
 * only on programmer errors not anticipated here (would surface as observable
 * error at the boundary).
 */
export const toVersionedLogItem = (raw: RawContractEvent): DecodeResult => {
  const envelope = toEnvelope(raw);
  try {
    switch (raw.__typename) {
      case 'ShieldedSpendEvent':
        return { ok: true, item: { ...envelope, event_type: 'ShieldedSpend',
          data: { nullifier: raw.nullifier } } };
      case 'ShieldedReceiveEvent':
        return { ok: true, item: { ...envelope, event_type: 'ShieldedReceive',
          data: {
            commitment: raw.commitment,
            ciphertext: raw.ciphertext,
            receivingContractAddress: raw.receivingContractAddress as ContractAddress | null,
          } } };
      case 'ShieldedMintEvent':
        return { ok: true, item: { ...envelope, event_type: 'ShieldedMint',
          data: { commitment: raw.commitment, domainSep: raw.domainSep,
                  amount: toAmount(raw, raw.amount) } } };
      case 'ShieldedBurnEvent':
        return { ok: true, item: { ...envelope, event_type: 'ShieldedBurn',
          data: { nullifier: raw.nullifier, amount: toAmount(raw, raw.amount) } } };
      case 'UnshieldedSpendEvent':
        return { ok: true, item: { ...envelope, event_type: 'UnshieldedSpend',
          data: {
            sender: flattenAddressOrContract(raw, 'sender', raw.sender),
            domainSep: raw.domainSep,
            tokenType: raw.tokenType as never,
            amount: toRequiredAmount(raw, raw.amountRequired),
          } } };
      case 'UnshieldedReceiveEvent':
        return { ok: true, item: { ...envelope, event_type: 'UnshieldedReceive',
          data: {
            recipient: flattenAddressOrContract(raw, 'recipient', raw.recipient),
            domainSep: raw.domainSep,
            tokenType: raw.tokenType as never,
            amount: toRequiredAmount(raw, raw.amountRequired),
          } } };
      case 'UnshieldedMintEvent':
        return { ok: true, item: { ...envelope, event_type: 'UnshieldedMint',
          data: {
            domainSep: raw.domainSep,
            tokenType: raw.tokenType as never,
            amount: toRequiredAmount(raw, raw.amountRequired),
          } } };
      case 'UnshieldedBurnEvent':
        return { ok: true, item: { ...envelope, event_type: 'UnshieldedBurn',
          data: {
            sender: flattenAddressOrContract(raw, 'sender', raw.sender),
            tokenType: raw.tokenType as never,
            amount: toRequiredAmount(raw, raw.amountRequired),
          } } };
      case 'PausedEvent':
        return { ok: true, item: { ...envelope, event_type: 'Paused', data: {} } };
      case 'UnpausedEvent':
        return { ok: true, item: { ...envelope, event_type: 'Unpaused', data: {} } };
      case 'MiscContractEvent':
        return { ok: true, item: { ...envelope, event_type: 'Misc',
          data: { name: raw.name, payload: raw.payload } } };
      default: {
        const typename = (raw as { __typename: string }).__typename;
        return { ok: false, failure: toFailure(
          raw,
          'unknownTypename',
          `Unknown __typename "${typename}"; midnight-js does not recognize this variant.`,
        ) };
      }
    }
  } catch (err) {
    if (err instanceof IndexerDataError && err.context.kind === 'event-malformed-payload') {
      return { ok: false, failure: toFailure(raw, 'malformedPayload', err.message) };
    }
    if (err instanceof IndexerDataError && err.context.kind === 'event-missing-required-field') {
      return { ok: false, failure: toFailure(raw, 'malformedPayload', err.message) };
    }
    throw err;
  }
};
