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

import type { LedgerState } from './ledger-state';

/**
 * A contract state read from the network, as bytes.
 *
 * Decode it with your own runtime, so the object is one your compiled contract accepts:
 *
 * ```ts
 * import { ContractState } from '@midnight-ntwrk/compact-runtime';
 *
 * const read = await publicDataProvider.queryContractState(address);
 * if (read !== null) {
 *   const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
 * }
 * ```
 */
export interface ContractStateRead {
  /**
   * The protocol-version integer of the block that dates the read. A state keeps the era of the
   * ledger that wrote it, so this era can be newer than `contractState.era`. On a read with no block
   * given, the block and the state are looked up separately, so near the hard fork this era can also
   * be older than `contractState.era`.
   */
  readonly protocolVersion: number;
  /** The contract state. */
  readonly contractState: LedgerState<'ContractState'>;
}

/**
 * A {@link ContractStateRead} together with the ledger parameters of the block that dates the read.
 * `queryContractState` returns it, because building a call needs both.
 */
export interface ContractStateAndParametersRead extends ContractStateRead {
  /**
   * The ledger parameters of the block that dates the read. On a read with no block given, that
   * block is looked up separately from the state, so near the hard fork it can be a block other than
   * the one the state was read at.
   */
  readonly ledgerParameters: LedgerState<'LedgerParameters'>;
}

/**
 * The public states of one contract read from one block: the contract state, the zswap chain state
 * and the ledger parameters, all as bytes and all written by the ledger of one era.
 */
export interface PublicStatesRead extends ContractStateAndParametersRead {
  /** The zswap chain state of the contract, resolved at the block. */
  readonly zswapChainState: LedgerState<'ZswapChainState'>;
}
