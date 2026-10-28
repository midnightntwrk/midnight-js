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

import type { LedgerVersion } from './ledger-version';

export const LEDGER_STATE_KINDS = Object.freeze(['ContractState', 'LedgerParameters', 'ZswapChainState'] as const);

/**
 * A kind of value the ledger writes and the indexer serves as bytes.
 */
export type LedgerStateKind = (typeof LEDGER_STATE_KINDS)[number];

// The bracketed number is the FORMAT version of one kind, not the ledger era, and the kinds number
// independently: never derive an era from it by arithmetic or by analogy with another kind. Two eras
// share a tag when the later ledger kept the format (a zswap chain state in v8 and v9).
//
// DO NOT COPY THIS TABLE. It decides which era's decoder is handed network-supplied bytes; see
// `packages/protocol/docs/shared-table-discipline.md`. `satisfies` makes a new `LedgerVersion` with
// no row here a build failure. Every entry is pinned against what the runtimes write by
// `test/state-tags.test.ts`.
export const LEDGER_STATE_TAGS = Object.freeze({
  ContractState: Object.freeze({
    v8: 'midnight:contract-state[v6]',
    v9: 'midnight:contract-state[v8]'
  }),
  LedgerParameters: Object.freeze({
    v8: 'midnight:ledger-parameters[v5]',
    v9: 'midnight:ledger-parameters[v8]'
  }),
  ZswapChainState: Object.freeze({
    v8: 'midnight:zswap-ledger-state[v5]',
    v9: 'midnight:zswap-ledger-state[v5]'
  })
} as const satisfies Record<LedgerStateKind, Record<LedgerVersion, string>>);
