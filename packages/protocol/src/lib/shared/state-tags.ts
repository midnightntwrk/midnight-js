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

// The bracketed number is the format version of one kind, not the ledger era. Pinned by
// test/state-tags.test.ts; see docs/architecture/era-tagged-payload-decoders.md.
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

type Assert<T extends true> = T;
type TagOf<K extends LedgerStateKind, E extends LedgerVersion> = (typeof LEDGER_STATE_TAGS)[K][E];
type ErasSharingATag<K extends LedgerStateKind> = {
  [A in LedgerVersion]: { [B in Exclude<LedgerVersion, A>]: TagOf<K, A> extends TagOf<K, B> ? A : never }[Exclude<
    LedgerVersion,
    A
  >];
}[LedgerVersion];
type _ContractStateTagsAreDistinct = Assert<[ErasSharingATag<'ContractState'>] extends [never] ? true : false>;
type _LedgerParametersTagsAreDistinct = Assert<[ErasSharingATag<'LedgerParameters'>] extends [never] ? true : false>;
