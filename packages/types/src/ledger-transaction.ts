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

import {
  isFrameworkLedgerTransaction,
  type LedgerTransactionTypes,
  type TransactionStage
} from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { ForeignLedgerTransactionError, InvalidTransactionHandleError, TransactionEraMismatchError } from './errors';
import { describeArgument } from './internal/read-era-entries';

export type { LedgerTransactionTypes, TransactionStage };

type EraSlot<S extends TransactionStage> = { readonly [E in LedgerVersion]?: LedgerTransactionTypes[E][S] };

const slotOf: {
  readonly [E in LedgerVersion]: <S extends TransactionStage>(tx: LedgerTransactionTypes[E][S]) => EraSlot<S>;
} = Object.freeze({
  v8: (tx) => ({ v8: tx }),
  v9: (tx) => ({ v9: tx })
});

const TRANSACTION_STAGES: readonly TransactionStage[] = Object.freeze(['Unproven', 'Unbound', 'Finalized']);

/**
 * An opaque ledger transaction of one era at one {@link TransactionStage}.
 *
 * Made only by {@link LedgerTransaction.seal}, which refuses an object of any
 * ledger copy other than the one this framework loaded, and read only by
 * {@link LedgerTransaction.unwrap}, which refuses the wrong era.
 */
export class LedgerTransaction<S extends TransactionStage> {
  readonly #slot: EraSlot<S>;
  readonly #serialize: () => Uint8Array;

  private constructor(
    readonly era: LedgerVersion,
    readonly stage: S,
    slot: EraSlot<S>,
    serialize: () => Uint8Array
  ) {
    this.#slot = slot;
    this.#serialize = serialize;
    Object.freeze(this);
  }

  /** The transaction's serialized bytes. */
  serialize(): Uint8Array {
    return this.#serialize();
  }

  /**
   * Wraps a ledger transaction object in a handle.
   *
   * @param era The era of the object.
   * @param stage The stage the object is at.
   * @param tx The transaction, an object of the ledger copy this framework
   *   loaded for `era`.
   * @throws InvalidTransactionHandleError If `stage` is not a transaction stage.
   * @throws ForeignLedgerTransactionError If `tx` is not an object of that
   *   ledger copy, or `era` is v8 and the v8 ledger is not loaded yet.
   * @throws UnknownLedgerVersionError If `era` is not a ledger version.
   */
  static seal<E extends LedgerVersion, S extends TransactionStage>(
    era: E,
    stage: S,
    tx: LedgerTransactionTypes[E][S]
  ): LedgerTransaction<S> {
    if (!TRANSACTION_STAGES.includes(stage)) {
      throw new InvalidTransactionHandleError('LedgerTransaction.seal', 'invalid-stage', describeArgument(stage));
    }
    const check = isFrameworkLedgerTransaction(era, tx);
    if (check !== 'own') {
      throw new ForeignLedgerTransactionError(era, check);
    }
    return new LedgerTransaction(era, stage, slotOf[era](tx), () => tx.serialize());
  }

  /**
   * Reads the ledger transaction object out of a handle.
   *
   * @param handle A handle made by {@link LedgerTransaction.seal}.
   * @param era The era the caller serves.
   * @returns The object that was sealed.
   * @throws InvalidTransactionHandleError If `handle` is not a handle of this
   *   copy of the package.
   * @throws TransactionEraMismatchError If the handle carries another era.
   */
  static unwrap<E extends LedgerVersion, S extends TransactionStage>(
    handle: LedgerTransaction<S>,
    era: E
  ): LedgerTransactionTypes[E][S] {
    if (!LedgerTransaction.is(handle)) {
      throw new InvalidTransactionHandleError('LedgerTransaction.unwrap', 'not-a-handle', describeArgument(handle));
    }
    const tx = handle.#slot[era];
    if (tx === undefined) {
      throw new TransactionEraMismatchError(era, handle.era);
    }
    return tx;
  }

  /** Whether `value` is a handle made by this copy of the package. */
  static is(value: unknown): value is LedgerTransaction<TransactionStage> {
    return typeof value === 'object' && value !== null && #slot in value;
  }
}

/** A transaction before proving. */
export type UnprovenTx = LedgerTransaction<'Unproven'>;
/** A proven transaction, before binding. */
export type UnboundTx = LedgerTransaction<'Unbound'>;
/** A proven and bound transaction, ready to submit. */
export type FinalizedTx = LedgerTransaction<'Finalized'>;
