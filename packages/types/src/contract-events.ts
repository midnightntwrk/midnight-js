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

import type {
  ContractAddress,
  RawTokenType,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';

/** Hex-encoded byte string as returned by the indexer GraphQL surface. */
export type HexEncoded = string;

/** Sender or recipient for unshielded events — either a user address or a contract address. */
export type AddressOrContract = string;

export type LogEventType =
  | 'ShieldedSpend' | 'ShieldedReceive' | 'ShieldedMint' | 'ShieldedBurn'
  | 'UnshieldedSpend' | 'UnshieldedReceive' | 'UnshieldedMint' | 'UnshieldedBurn'
  | 'Paused' | 'Unpaused' | 'Misc';

export type ContractEventEnvelope = {
  readonly id: number;
  readonly version: number;
  readonly protocolVersion: number;
  readonly contractAddress: ContractAddress;
  readonly transactionId: number;
  readonly raw: HexEncoded;
};

export type ShieldedSpend   = { readonly nullifier: HexEncoded };
export type ShieldedReceive = {
  readonly commitment: HexEncoded;
  readonly ciphertext: HexEncoded | null;
  readonly receivingContractAddress: ContractAddress | null;
};
export type ShieldedMint    = {
  readonly commitment: HexEncoded;
  readonly domainSep: HexEncoded;
  readonly amount: bigint | null;
};
export type ShieldedBurn    = {
  readonly nullifier: HexEncoded;
  readonly amount: bigint | null;
};
export type UnshieldedSpend   = {
  readonly sender: AddressOrContract;
  readonly domainSep: HexEncoded;
  readonly tokenType: RawTokenType;
  readonly amount: bigint;
};
export type UnshieldedReceive = {
  readonly recipient: AddressOrContract;
  readonly domainSep: HexEncoded;
  readonly tokenType: RawTokenType;
  readonly amount: bigint;
};
export type UnshieldedMint    = {
  readonly domainSep: HexEncoded;
  readonly tokenType: RawTokenType;
  readonly amount: bigint;
};
export type UnshieldedBurn    = {
  readonly sender: AddressOrContract;
  readonly tokenType: RawTokenType;
  readonly amount: bigint;
};
export type Paused   = Record<string, never>;
export type Unpaused = Record<string, never>;
export type Misc     = { readonly name: HexEncoded; readonly payload: HexEncoded };

export type VersionedLogItem = ContractEventEnvelope & (
  | { readonly event_type: 'ShieldedSpend';     readonly data: ShieldedSpend }
  | { readonly event_type: 'ShieldedReceive';   readonly data: ShieldedReceive }
  | { readonly event_type: 'ShieldedMint';      readonly data: ShieldedMint }
  | { readonly event_type: 'ShieldedBurn';      readonly data: ShieldedBurn }
  | { readonly event_type: 'UnshieldedSpend';   readonly data: UnshieldedSpend }
  | { readonly event_type: 'UnshieldedReceive'; readonly data: UnshieldedReceive }
  | { readonly event_type: 'UnshieldedMint';    readonly data: UnshieldedMint }
  | { readonly event_type: 'UnshieldedBurn';    readonly data: UnshieldedBurn }
  | { readonly event_type: 'Paused';            readonly data: Paused }
  | { readonly event_type: 'Unpaused';          readonly data: Unpaused }
  | { readonly event_type: 'Misc';              readonly data: Misc }
);

export type ContractEventFilter = {
  readonly contractAddress: ContractAddress;
  readonly types?: readonly LogEventType[];
  readonly fieldPrefixes?: readonly {
    readonly fieldName: string;
    readonly prefix: HexEncoded;
  }[];
  readonly fromBlock?: number;
  readonly toBlock?: number;
};

export type ContractEventCursor = { readonly after: number };

export type ContractEventDecodeFailure = {
  readonly id: number;
  readonly typename: string;
  readonly reason: 'malformedPayload' | 'unknownTypename';
  readonly message: string;
};

export type ContractEventPage = {
  readonly events: readonly VersionedLogItem[];
  readonly nextCursor: ContractEventCursor | null;
  readonly decodeFailures: readonly ContractEventDecodeFailure[];
};

// Type guards — one per variant.
export const isShieldedSpend    = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'ShieldedSpend'    }> => e.event_type === 'ShieldedSpend';
export const isShieldedReceive  = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'ShieldedReceive'  }> => e.event_type === 'ShieldedReceive';
export const isShieldedMint     = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'ShieldedMint'     }> => e.event_type === 'ShieldedMint';
export const isShieldedBurn     = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'ShieldedBurn'     }> => e.event_type === 'ShieldedBurn';
export const isUnshieldedSpend  = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'UnshieldedSpend'  }> => e.event_type === 'UnshieldedSpend';
export const isUnshieldedReceive = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'UnshieldedReceive' }> => e.event_type === 'UnshieldedReceive';
export const isUnshieldedMint   = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'UnshieldedMint'   }> => e.event_type === 'UnshieldedMint';
export const isUnshieldedBurn   = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'UnshieldedBurn'   }> => e.event_type === 'UnshieldedBurn';
export const isPaused           = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'Paused'           }> => e.event_type === 'Paused';
export const isUnpaused         = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'Unpaused'         }> => e.event_type === 'Unpaused';
export const isMisc             = (e: VersionedLogItem): e is Extract<VersionedLogItem, { event_type: 'Misc'             }> => e.event_type === 'Misc';
