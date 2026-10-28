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
 * const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
 * ```
 */
export interface ContractStateRead {
  /**
   * The protocol-version integer of the block that dates the read. Its era can be newer than
   * `contractState.version`: a state keeps the version of the ledger that wrote it.
   */
  readonly protocolVersion: number;
  /** The contract state. */
  readonly contractState: LedgerState<'ContractState'>;
  /**
   * The ledger parameters of the block that dates the read. They come from the same block as the
   * state. Optional, because a provider that cannot serve them is still a usable provider.
   */
  readonly ledgerParameters?: LedgerState<'LedgerParameters'>;
}

/**
 * The public states of one contract read from one block: the contract state, the zswap chain state
 * and the ledger parameters, all as bytes.
 */
export interface PublicStatesRead extends ContractStateRead {
  /** The ledger parameters of the block, always present on this record. */
  readonly ledgerParameters: LedgerState<'LedgerParameters'>;
  /** The zswap chain state of the contract, resolved at the block. */
  readonly zswapChainState: LedgerState<'ZswapChainState'>;
}
