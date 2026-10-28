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

import type { LedgerTransactionTypes, TransactionStage } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { ProviderEraUnsupportedError, type TransactionMethod } from '../errors';
import { LedgerTransaction } from '../ledger-transaction';

/** What each era's handler answers with, keyed by era. */
export type EraAnswers = Readonly<Record<LedgerVersion, unknown>>;

/** Each era's ledger transaction class at one stage, keyed by era. */
export type TransactionsAt<S extends TransactionStage> = { readonly [E in LedgerVersion]: LedgerTransactionTypes[E][S] };

/** One handler per ledger era, `undefined` for an era that is not served. */
export type EraHandlers<S extends TransactionStage, A extends readonly unknown[], R extends EraAnswers> = {
  readonly [E in LedgerVersion]: ((tx: LedgerTransactionTypes[E][S], ...args: A) => Promise<R[E]>) | undefined;
};

/** How a provider method routes a handle to its era's handler. */
export interface Route<S extends TransactionStage, A extends readonly unknown[], R extends EraAnswers, T> {
  readonly method: TransactionMethod;
  readonly stage: S;
  readonly handlers: EraHandlers<S, A, R>;
  readonly receiver: object;
  readonly supportedEras: readonly LedgerVersion[];
  readonly answer: <E extends LedgerVersion>(era: E, result: R[E]) => T;
}

const serve = async <E extends LedgerVersion, S extends TransactionStage, A extends readonly unknown[], R extends EraAnswers, T>(
  route: Route<S, A, R, T>,
  era: E,
  handle: LedgerTransaction<S>,
  args: A
): Promise<T> => {
  // Generic in E so the handler call is checked against era E's types; answer(era, ...) is not tied to E by the types.
  const handler = route.handlers[era];
  if (handler === undefined) {
    throw new ProviderEraUnsupportedError(route.method, era, route.supportedEras);
  }
  const tx = LedgerTransaction.unwrap(handle, era);
  const result = await Reflect.apply<object, [LedgerTransactionTypes[E][S], ...A], Promise<R[E]>>(handler, route.receiver, [
    tx,
    ...args
  ]);
  return route.answer(era, result);
};

/**
 * Runs one provider method call: checks the handle, refuses an unserved era
 * before any work, and hands the unwrapped transaction to its era's handler.
 *
 * @throws InvalidTransactionHandleError if `handle` is not a handle of this
 *         package (`not-a-handle`) or is at another stage (`wrong-stage`).
 * @throws ProviderEraUnsupportedError if no handler serves the handle's era.
 */
export const dispatch = async <S extends TransactionStage, A extends readonly unknown[], R extends EraAnswers, T>(
  route: Route<S, A, R, T>,
  handle: LedgerTransaction<S>,
  args: A
): Promise<T> => {
  const checked = LedgerTransaction.require(handle, route.stage, route.method);
  return serve(route, checked.era, checked, args);
};
