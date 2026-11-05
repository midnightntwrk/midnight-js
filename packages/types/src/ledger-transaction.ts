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

import { MidnightJsError, UnknownLedgerEraError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { LedgerTransactionTypes, TransactionStage } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import {
  LEDGER_ERAS,
  LEDGER_TRANSACTION_TAGS,
  type LedgerEra,
  TRANSACTION_STAGES
} from '@midnight-ntwrk/midnight-js-protocol/version';

import {
  InvalidTransactionHandleError,
  TransactionDecodeFailedError,
  TransactionDecoderMissingError,
  type TransactionHandleMethod
} from './errors';
import { describeArgument } from './internal/read-era-entries';

export type { LedgerTransactionTypes, TransactionStage };

/**
 * What a handler of `createProofProviderFromHandlers` or `createWalletProviderFromHandlers` answers
 * with: a transaction object of any ledger copy, or its bytes. The provider makes the handle, in the
 * era of the request and at the stage the method produces.
 */
export type TransactionAnswer = { serialize(): Uint8Array } | Uint8Array;

/**
 * The `Transaction` class of a ledger copy, such as `Transaction` from `@midnightntwrk/ledger-v9`.
 * `deserialize` reads the bytes; `fromParts` gives the types of the transactions it decodes.
 */
export interface TransactionDecoder {
  deserialize(
    markerS: 'signature',
    markerP: 'pre-proof' | 'proof',
    markerB: 'pre-binding' | 'binding',
    raw: Uint8Array
  ): unknown;
  fromParts(networkId: string): unknown;
}

/**
 * One `Transaction` class per ledger era. Only the class of the handle's own era is called.
 */
export type TransactionDecoders = Readonly<Partial<Record<LedgerEra, TransactionDecoder>>>;

type StageTypesOf<C> = C extends { fromParts(...args: never[]): infer Unproven }
  ? Unproven extends { prove(...args: never[]): Promise<infer Unbound> }
    ? Unbound extends { bind(): infer Finalized }
      ? { readonly Unproven: Unproven; readonly Unbound: Unbound; readonly Finalized: Finalized }
      : never
    : never
  : never;

/**
 * What `deserialize` returns for decoders `D`, a handle of era `E` and stage `S`: the transaction
 * type of the caller's own class at that stage.
 */
export type DecodedTransaction<D extends TransactionDecoders, E extends LedgerEra, S extends TransactionStage> =
  E extends keyof D ? StageTypesOf<NonNullable<D[E]>>[S] : never;

/**
 * Decoders `D` that can read a handle of era `E`, or `never` when `D` has no class for any era `E`
 * can be, so such a call does not compile.
 */
export type TransactionDecodersFor<D extends TransactionDecoders, E extends LedgerEra> = [
  Extract<keyof D, E>
] extends [never]
  ? never
  : D;

const MARKERS: Readonly<Record<TransactionStage, readonly ['signature', 'pre-proof' | 'proof', 'pre-binding' | 'binding']>> = Object.freeze({
  Unproven: ['signature', 'pre-proof', 'pre-binding'],
  Unbound: ['signature', 'proof', 'pre-binding'],
  Finalized: ['signature', 'proof', 'binding']
});

const isStage = (stage: unknown): stage is TransactionStage => TRANSACTION_STAGES.some((known) => known === stage);

const LEADING_HEADER = /^midnight:[A-Za-z-]+\[v\d+\](?:\([A-Za-z0-9[\](),-]*\))?:/;

const leadingHeader = (bytes: Uint8Array, maxLength: number): string =>
  LEADING_HEADER.exec(String.fromCharCode(...bytes.subarray(0, maxLength)))?.[0] ?? '';

const startsWithHeader = (bytes: Uint8Array, header: string): boolean => {
  const prefix = new TextEncoder().encode(`${header}:`);
  return bytes.length >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
};

const isTransactionShaped = (value: unknown): value is { serialize(): Uint8Array } =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'serialize') === 'function';

const FROM_BYTES: unique symbol = Symbol('LedgerTransaction.fromBytes');

const isAtStage = <S extends TransactionStage>(
  handle: LedgerTransaction<TransactionStage>,
  stage: S
): handle is LedgerTransaction<S> => handle.stage === stage;

/**
 * A ledger transaction of one era at one {@link TransactionStage}, as the bytes that ledger wrote.
 *
 * Made only by {@link LedgerTransaction.fromBytes}, which checks the header the ledger of that era
 * writes for that stage, or by {@link LedgerTransaction.seal}, which does the same with an object's
 * bytes. No handle holds a ledger object. The caller decodes it with its own ledger copy:
 *
 * ```ts
 * import { Transaction } from '@midnightntwrk/ledger-v9';
 *
 * const tx = record.tx.deserialize({ v9: Transaction });
 * ```
 *
 * The bytes live in a private field, so `structuredClone`, `postMessage` and JSON drop them. To send
 * one elsewhere, send `serialize()`, `era` and `stage`, and rebuild it with
 * {@link LedgerTransaction.fromBytes}.
 *
 * @typeParam S The stage the transaction is at.
 * @typeParam E The era the transaction belongs to; any era when not known.
 */
export class LedgerTransaction<S extends TransactionStage, out E extends LedgerEra = LedgerEra> {
  readonly #bytes: Uint8Array;

  private constructor(
    fromBytes: typeof FROM_BYTES,
    readonly era: E,
    readonly stage: S,
    bytes: Uint8Array
  ) {
    if (fromBytes !== FROM_BYTES) {
      throw new InvalidTransactionHandleError(
        'LedgerTransaction.fromBytes',
        'not-a-handle',
        'a handle constructed without LedgerTransaction.fromBytes'
      );
    }
    this.#bytes = bytes;
    Object.freeze(this);
  }

  /**
   * Makes a handle from the bytes of a transaction.
   *
   * @param era The era of the ledger that wrote the bytes.
   * @param stage The stage the transaction is at.
   * @param bytes The serialized transaction. The handle keeps a copy.
   * @param method The provider method whose answer is wrapped, named in a refusal;
   *   `LedgerTransaction.fromBytes` when omitted.
   * @throws UnknownLedgerEraError If `era` is not a ledger era.
   * @throws InvalidTransactionHandleError If `stage` is not a transaction stage (`invalid-stage`),
   *   `bytes` is not a `Uint8Array` (`not-bytes`), or the bytes do not start with the header the
   *   ledger of `era` writes for `stage` (`header-mismatch`).
   */
  static fromBytes<E extends LedgerEra, S extends TransactionStage>(
    era: E,
    stage: S,
    bytes: Uint8Array,
    method: TransactionHandleMethod = 'LedgerTransaction.fromBytes'
  ): LedgerTransaction<S, E> {
    if (!LEDGER_ERAS.includes(era)) {
      throw new UnknownLedgerEraError(era);
    }
    if (!isStage(stage)) {
      throw new InvalidTransactionHandleError(method, 'invalid-stage', describeArgument(stage));
    }
    if (!(bytes instanceof Uint8Array)) {
      throw new InvalidTransactionHandleError(method, 'not-bytes', describeArgument(bytes));
    }
    const header = LEDGER_TRANSACTION_TAGS[era][stage];
    if (!startsWithHeader(bytes, header)) {
      throw new InvalidTransactionHandleError(
        method,
        'header-mismatch',
        `the bytes are not a ${stage} transaction of the ${era} ledger: ` +
          `expected header tag '${header}:', got '${leadingHeader(bytes, 2 * header.length)}'`
      );
    }
    return new LedgerTransaction(FROM_BYTES, era, stage, new Uint8Array(bytes));
  }

  /**
   * Makes a handle from a transaction object of any ledger copy:
   * `fromBytes(era, stage, tx.serialize())`.
   *
   * @param era The era of the object.
   * @param stage The stage the object is at.
   * @param tx The transaction.
   * @param method The provider method whose answer is sealed, named in a refusal;
   *   `LedgerTransaction.seal` when omitted.
   * @throws InvalidTransactionHandleError If `tx` has no `serialize` method (`not-a-transaction`),
   *   or as {@link LedgerTransaction.fromBytes} does.
   * @throws UnknownLedgerEraError If `era` is not a ledger era.
   */
  static seal<E extends LedgerEra, S extends TransactionStage>(
    era: E,
    stage: S,
    tx: { serialize(): Uint8Array },
    method: TransactionHandleMethod = 'LedgerTransaction.seal'
  ): LedgerTransaction<S, E> {
    if (!isTransactionShaped(tx)) {
      throw new InvalidTransactionHandleError(method, 'not-a-transaction', describeArgument(tx));
    }
    return LedgerTransaction.fromBytes(era, stage, tx.serialize(), method);
  }

  /**
   * @returns A copy of the bytes, exactly as the ledger wrote them.
   */
  serialize(): Uint8Array {
    return new Uint8Array(this.#bytes);
  }

  /**
   * Decodes the transaction with the class for its own era, at its own stage.
   *
   * @param decoders One `Transaction` class per ledger era, from the caller's own ledger copy, e.g.
   *   `{ v9: Transaction }`. Decoders with none for any era this handle can be do not compile.
   * @returns An object of the caller's class at this handle's stage.
   * @throws TransactionDecoderMissingError When `decoders` has none for {@link era}.
   * @throws TransactionDecodeFailedError When the class throws an error that is not a
   *   `MidnightJsError`, for example because the bytes after the header are corrupt. A
   *   `MidnightJsError` is rethrown unchanged.
   */
  deserialize<D extends TransactionDecoders>(decoders: TransactionDecodersFor<D, E>): DecodedTransaction<D, E, S> {
    const decoder: TransactionDecoder | undefined =
      typeof decoders === 'object' && decoders !== null && Object.hasOwn(decoders, this.era)
        ? decoders[this.era]
        : undefined;
    if (typeof decoder?.deserialize !== 'function') {
      throw new TransactionDecoderMissingError(this.era);
    }
    try {
      const [markerS, markerP, markerB] = MARKERS[this.stage];
      return decoder.deserialize(markerS, markerP, markerB, new Uint8Array(this.#bytes)) as DecodedTransaction<D, E, S>;
    } catch (cause: unknown) {
      if (cause instanceof MidnightJsError) {
        throw cause;
      }
      throw new TransactionDecodeFailedError(this.era, this.stage, { cause });
    }
  }

  /**
   * Checks that a value is a handle of this copy of the package at the stage a
   * method takes.
   *
   * @param value The value the method received.
   * @param stage The stage the method takes.
   * @param method The method, named in a refusal.
   * @returns The handle, narrowed to `stage`.
   * @throws InvalidTransactionHandleError If `value` is not a handle
   *   (`not-a-handle`) or is at another stage (`wrong-stage`).
   */
  static require<S extends TransactionStage>(
    value: unknown,
    stage: S,
    method: TransactionHandleMethod
  ): LedgerTransaction<S> {
    if (!LedgerTransaction.isLedgerTransaction(value)) {
      throw new InvalidTransactionHandleError(method, 'not-a-handle', describeArgument(value));
    }
    if (!isAtStage(value, stage)) {
      throw new InvalidTransactionHandleError(
        method,
        'wrong-stage',
        `${value.stage} handle, where ${method} takes ${stage} handles`
      );
    }
    return value;
  }

  /**
   * Whether `value` is a handle made by this copy of the package. A look-alike object, or a
   * handle made by a second installed copy of the package, gives `false`.
   */
  static isLedgerTransaction(value: unknown): value is LedgerTransaction<TransactionStage> {
    return typeof value === 'object' && value !== null && #bytes in value;
  }
}

/** A transaction before proving. */
export type UnprovenTx = LedgerTransaction<'Unproven'>;
/** A proven transaction, before binding. */
export type UnboundTx = LedgerTransaction<'Unbound'>;
/** A proven and bound transaction, ready to submit. */
export type FinalizedTx = LedgerTransaction<'Finalized'>;
