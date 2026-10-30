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

/**
 * The guard that narrows a result of either era.
 *
 * The entry-point overloads select ONE era's result type by inference, which is
 * what a caller making a call wants. A caller RECEIVING a result -- a telemetry
 * sink, a retry handler, a queue consumer -- declares its parameter with
 * `AnyFinalizedCallTxData`, `AnySubmittedCallTx` or `FinalizedMaintenanceTxData`,
 * or with a union of its contracts (`FoundContract<C | L8>`), and narrows it here.
 */

import { CURRENT_LEDGER_VERSION, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { EraMismatchError } from './errors';
import { readEraTag } from './internal/era';

/**
 * What the guard narrows a result to.
 *
 * `Extract` for a union, an intersection for a value whose `era` is the whole
 * `LedgerVersion` union. DO NOT REMOVE THE TUPLE WRAPPER: it is what stops the
 * conditional distributing.
 *
 * @see {@link OverloadTyping} for why the fallback branch has to be there.
 */
type NarrowedToLedger8<T> = [Extract<T, { readonly era: 'v8' }>] extends [never]
  ? T & { readonly era: 'v8' }
  : Extract<T, { readonly era: 'v8' }>;

/**
 * Whether a result came from the RETAINED pipeline, narrowing it to that era's
 * variant.
 *
 * Reads `era`, which every result carries and which each variant declares as its
 * own literal -- so this narrows a union of any two result shapes that carry
 * the tag, not only the flat unions.
 *
 * `era` names the PIPELINE that produced the objects in the result, read off
 * the compiled artifact. It is NOT the era that recorded the transaction:
 * `public.era` answers that, and the two disagree after the fork, when a
 * retained-era call is recorded as a keep-state transaction tagged `'v9'`.
 * Branch on this one to decide which module a result's objects came from, and
 * on `era` to decide which ledger recorded it.
 *
 * @param result Any result carrying an era tag.
 * @returns `true` when the retained pipeline produced it.
 */
export const isLedger8Result = <T extends { readonly era: LedgerVersion }>(
  result: T
): result is NarrowedToLedger8<T> => {
  switch (result?.era) {
    case 'v8':
      return true;
    case CURRENT_LEDGER_VERSION:
      return false;
    default: {
      const unhandled: never = result?.era;
      throw new EraMismatchError('unrecognised-result-era', {
        detail: `Received: ${readEraTag({ era: unhandled })}.`
      });
    }
  }
};
