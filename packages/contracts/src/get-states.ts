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

import { type ContractStatePojo, type LedgerVersion, loadLedgerEra } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ContractAddress, LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PrivateStateId,PrivateStateProvider, PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress, contractStateEnvelopeVersion } from '@midnight-ntwrk/midnight-js-utils';

/**
 * Object containing the publicly visible states of a contract.
 */
export interface PublicContractStates {
  /**
   * The (public) Zswap chain state of a contract.
   */
  readonly zswapChainState: ZswapChainState;
  /**
   * The (public) ledger state of a contract.
   */
  readonly contractState: ContractState;
  /**
   * The ledger parameters in effect on the block associated with the contract state.
   */
  readonly ledgerParameters: LedgerParameters;
}

/**
 * Object containing the publicly visible states of a contract and the private
 * state of a contract.
 */
export interface ContractStates<PS> extends PublicContractStates {
  /**
   * The private state of a contract.
   */
  readonly privateState: PS;
}

/**
 * Fetches only the public visible (Zswap and ledger) states of a contract.
 *
 * @param publicDataProvider The provider to use to fetch the public states (Zswap and ledger)
 *                           from the blockchain.
 * @param contractAddress The ledger address of the contract.
 */
export const getPublicStates = async (
  publicDataProvider: PublicDataProvider,
  contractAddress: ContractAddress,
  blockHash?: string
): Promise<PublicContractStates> => {
  assertIsContractAddress(contractAddress);
  const zswapAndContractState = await publicDataProvider.queryZSwapAndContractState(
    contractAddress,
    blockHash === undefined ? undefined : { type: 'blockHash', blockHash }
  );
  assertDefined(zswapAndContractState, `No public state found at contract address '${contractAddress}'`);
  const [zswapChainState, contractState, ledgerParameters] = zswapAndContractState;
  return { contractState, zswapChainState, ledgerParameters };
};

/**
 * Retrieves the Zswap, ledger, and private states of the contract corresponding
 * to the given identifier using the given providers.
 *
 * @param publicDataProvider The provider to use to fetch the public states (Zswap and ledger)
 *                           from the blockchain.
 * @param privateStateProvider The provider to use to fetch the private state.
 * @param contractAddress The ledger address of the contract.
 * @param privateStateId The identifier for the private state of the contract.
 */
export const getStates = async <PS>(
  publicDataProvider: PublicDataProvider,
  privateStateProvider: PrivateStateProvider<PrivateStateId, PS>,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId,
  blockHash?: string
): Promise<ContractStates<PS>> => {
  const publicContractStates = await getPublicStates(publicDataProvider, contractAddress, blockHash);
  const privateState = await privateStateProvider.get(privateStateId);
  assertDefined(privateState, `No private state found at private state ID '${privateStateId}'`);
  return { ...publicContractStates, privateState };
};

/**
 * The slice of {@link PublicDataProvider} {@link getAnyEraContractState} reads.
 *
 * Declared as a slice rather than the whole provider, so a caller can satisfy it with anything
 * that serves raw contract states.
 */
export type AnyEraContractStateReadSurface = Pick<PublicDataProvider, 'queryRawContractState'>;

/**
 * A contract state read and decoded by whichever ledger era wrote it.
 *
 * Extends {@link ContractStatePojo}, so `state` and `entryPoints` are the members protocol's own
 * decoders answer with, under the names they already use.
 *
 * Every member is plain data. Nothing here is a live WASM handle, so the record survives a
 * `postMessage` to a worker and a write to storage — and `state` can be handed to the caller's OWN
 * Compact runtime, which a handle minted inside the framework cannot be.
 */
export interface AnyEraContractState extends ContractStatePojo {
  /**
   * The ledger era that wrote these bytes, read from the envelope they carry.
   *
   * Not the `version` of the raw record, which is derived from `protocolVersion` and so describes
   * the BLOCK. Two different things make the two disagree legitimately, and neither is a fault:
   * a contract not written to since the fork keeps an OLDER envelope under a newer block, and an
   * unpinned read resolves the state and the block as independent Query-root siblings that can
   * land either side of the boundary. See `EnvelopeUpperBound` in
   * `@midnight-ntwrk/midnight-js-indexer-public-data-provider`.
   */
  readonly envelopeVersion: LedgerVersion;
  /**
   * The protocol-version integer the network reported for the block that dated the read.
   *
   * The raw integer, passed through unexamined. Placing it on the era timeline is
   * `protocolVersionToLedger`'s job, and that throws on an integer it cannot place.
   */
  readonly protocolVersion: number;
  /**
   * The serialized state, byte for byte as the network served it, envelope included.
   *
   * The other members are these bytes decoded, so they agree with them by construction. Reach for
   * these to get at what this record does not decode — the contract's balance and its maintenance
   * authority. NOT the block's ledger parameters: those are a sibling field on the raw record and
   * are not carried here, so a caller needing them reads them separately rather than substituting
   * `initialParameters()`.
   */
  readonly raw: Uint8Array;
}

/**
 * Fetches a contract's public state and decodes it with the era that wrote it, whichever that is.
 *
 * Use this wherever a contract may predate the ledger fork. The deserializing members of the
 * shipped `IndexerPublicDataProvider` — `queryContractState` and its siblings — decode with the
 * current era only and refuse anything else; this reads the era off the state's own envelope and
 * dispatches on it, so a contract deployed before the fork and not yet written to still reads.
 *
 * The read is relative to the network head. There is no block selector, so a historical read goes
 * through `queryRawContractState` directly.
 *
 * The retained-era runtime is acquired only when an envelope calls for it, and — once acquired
 * successfully — reused for the life of the process. See `loadLedgerEra`.
 *
 * @param publicDataProvider The provider to read the raw contract state through.
 * @param contractAddress The ledger address of the contract.
 * @returns The decoded state, or `null` when the read surface reports no contract at
 * `contractAddress`.
 * @throws TypeError if `contractAddress` is not a well-formed contract address.
 * @throws TagParseError if the served payload carries no supported contract-state envelope.
 * @throws StateDecodeFailedError if the envelope's own era cannot read the state behind it.
 * @throws Ledger8RuntimeMissingError if the state carries a retained-era envelope and that runtime
 * cannot be acquired — the everyday case being a build that does not ship it.
 * @throws whatever `queryRawContractState` throws, unchanged.
 */
export const getAnyEraContractState = async (
  publicDataProvider: AnyEraContractStateReadSurface,
  contractAddress: ContractAddress
): Promise<AnyEraContractState | null> => {
  assertIsContractAddress(contractAddress);
  const served = await publicDataProvider.queryRawContractState(contractAddress);
  if (served === null) {
    return null;
  }
  const envelopeVersion = contractStateEnvelopeVersion(served.raw);
  const era = await loadLedgerEra(envelopeVersion);
  // ONE decode, not an `extractState` beside a `decodeContractState`. Those two are kept separate
  // in the keep-state pipeline because there the extraction feeds execution and the decode feeds
  // the key check, and each has to be able to fail without the other. Here both members are
  // returned together or not at all, so a second deserialization of the same bytes would buy
  // nothing and cost a full WASM pass over them.
  const decoded = era.decodeContractState(served.raw);
  return { envelopeVersion, protocolVersion: served.protocolVersion, raw: served.raw, ...decoded };
};
