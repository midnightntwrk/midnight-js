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
import {
  LEDGER_ERAS,
  LEDGER_STATE_TAGS,
  type LedgerEra,
  type StateKind
} from '@midnight-ntwrk/midnight-js-protocol/version';

import { InvalidSerializedStateError, SerializedStateDecodeFailedError, SerializedStateDecoderMissingError } from './errors';

export type { StateKind };

/**
 * Anything that turns bytes into an object, such as the `ContractState` class of a runtime.
 */
export interface StateDecoder<T = unknown> {
  deserialize(bytes: Uint8Array): T;
}

/**
 * One decoder per ledger era. Only the decoder of the value's own era is called.
 */
export type StateDecoders = Readonly<Partial<Record<LedgerEra, StateDecoder>>>;

type DecodedByEra<D extends StateDecoders, E extends LedgerEra> = E extends keyof D
  ? D[E] extends StateDecoder<infer T> | undefined
    ? T
    : never
  : never;

/**
 * What `deserialize` returns for decoders `D` and a value of era `E`.
 */
export type DecodedState<D extends StateDecoders, E extends LedgerEra> = DecodedByEra<D, E>;

/**
 * Decoders `D` that can read a value of era `E`, or `never` when `D` has no decoder for any era `E`
 * can be, so such a call does not compile.
 */
export type DecodersFor<D extends StateDecoders, E extends LedgerEra> = [Extract<keyof D, E>] extends [never] ? never : D;

const startsWithTag = (bytes: Uint8Array, tag: string): boolean => {
  const prefix = new TextEncoder().encode(`${tag}:`);
  return bytes.length >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
};

const isDecoderMap = (decoders: unknown): decoders is StateDecoders =>
  typeof decoders === 'object' && decoders !== null;

const FROM_BYTES: unique symbol = Symbol('Serialized.fromBytes');

const checkedCopy = (kind: StateKind, era: LedgerEra, bytes: Uint8Array): Uint8Array => {
  if (!LEDGER_ERAS.includes(era)) {
    throw new UnknownLedgerEraError(era);
  }
  if (!(bytes instanceof Uint8Array)) {
    throw new InvalidSerializedStateError(kind, era, 'not-bytes');
  }
  if (!startsWithTag(bytes, LEDGER_STATE_TAGS[kind][era])) {
    throw new InvalidSerializedStateError(kind, era, 'tag-mismatch');
  }
  return new Uint8Array(bytes);
};

const requireFromBytes = (fromBytes: typeof FROM_BYTES, kind: StateKind): void => {
  if (fromBytes !== FROM_BYTES) {
    throw new InvalidSerializedStateError(kind, undefined, 'not-from-bytes');
  }
};

const decode = (kind: StateKind, era: LedgerEra, bytes: Uint8Array, decoders: unknown): unknown => {
  const decoder: StateDecoder | undefined =
    isDecoderMap(decoders) && Object.hasOwn(decoders, era) ? decoders[era] : undefined;
  if (typeof decoder?.deserialize !== 'function') {
    throw new SerializedStateDecoderMissingError(kind, era);
  }
  try {
    return decoder.deserialize(new Uint8Array(bytes));
  } catch (cause: unknown) {
    if (cause instanceof MidnightJsError) {
      throw cause;
    }
    throw new SerializedStateDecodeFailedError(kind, era, { cause });
  }
};

/**
 * A contract state as the bytes the ledger wrote, with the era of the ledger that wrote them.
 *
 * No read hands out a decoded state. The caller decodes it with its own runtime, so the state comes
 * back as an object its compiled contract accepts:
 *
 * ```ts
 * import { ContractState } from '@midnight-ntwrk/compact-runtime';
 *
 * const read = await publicDataProvider.queryContractState(address);
 * if (read !== null) {
 *   const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
 * }
 * ```
 *
 * The bytes live in a private field, so `structuredClone`, `postMessage` and JSON drop them. To send
 * one elsewhere, send `serialize()` and `era`, and rebuild it with
 * {@link SerializedContractState.fromBytes}.
 *
 * @typeParam E The era of the ledger that wrote it.
 */
export class SerializedContractState<out E extends LedgerEra = LedgerEra> {
  readonly #bytes: Uint8Array;

  private constructor(
    fromBytes: typeof FROM_BYTES,
    readonly era: E,
    bytes: Uint8Array
  ) {
    requireFromBytes(fromBytes, 'ContractState');
    this.#bytes = bytes;
    Object.freeze(this);
  }

  /**
   * Wraps the bytes of a contract state the ledger of `era` wrote.
   *
   * @throws UnknownLedgerEraError when `era` is not a supported ledger era.
   * @throws InvalidSerializedStateError when `bytes` is not a `Uint8Array`, or does not start with
   * the tag that ledger writes for a contract state.
   */
  static fromBytes<E extends LedgerEra>(era: E, bytes: Uint8Array): SerializedContractState<E> {
    return new SerializedContractState(FROM_BYTES, era, checkedCopy('ContractState', era, bytes));
  }

  /**
   * Whether `value` was made by {@link SerializedContractState.fromBytes} of this copy of the
   * package. A look-alike object, or one made by a second installed copy of the package, gives
   * `false`.
   */
  static isSerializedContractState(value: unknown): value is SerializedContractState {
    return typeof value === 'object' && value !== null && #bytes in value;
  }

  /**
   * @returns A copy of the bytes, exactly as the ledger wrote them.
   */
  serialize(): Uint8Array {
    return new Uint8Array(this.#bytes);
  }

  /**
   * Decodes the state with the decoder for its own era.
   *
   * @param decoders One decoder per ledger era, from the caller's own runtime, e.g.
   * `{ v9: ContractState }`. Decoders with none for any era this value can be do not compile.
   * @throws SerializedStateDecoderMissingError when `decoders` has none for {@link era}, which only a
   * value whose era is not known when compiling can reach.
   * @throws SerializedStateDecodeFailedError when the decoder throws an error that is not a
   * `MidnightJsError`, for example because it decodes another kind or the bytes after the tag are
   * corrupt. A `MidnightJsError` from the decoder is rethrown unchanged.
   */
  deserialize<D extends StateDecoders>(decoders: DecodersFor<D, E>): DecodedState<D, E> {
    return decode('ContractState', this.era, this.#bytes, decoders) as DecodedState<D, E>;
  }
}

/**
 * Ledger parameters as the bytes the ledger wrote, with the era of the ledger that wrote them. The
 * caller decodes them with its own runtime: `read.ledgerParameters.deserialize({ v9: LedgerParameters })`.
 *
 * The bytes live in a private field, so `structuredClone`, `postMessage` and JSON drop them. To send
 * one elsewhere, send `serialize()` and `era`, and rebuild it with
 * {@link SerializedLedgerParameters.fromBytes}.
 *
 * @typeParam E The era of the ledger that wrote them.
 */
export class SerializedLedgerParameters<out E extends LedgerEra = LedgerEra> {
  readonly #bytes: Uint8Array;

  private constructor(
    fromBytes: typeof FROM_BYTES,
    readonly era: E,
    bytes: Uint8Array
  ) {
    requireFromBytes(fromBytes, 'LedgerParameters');
    this.#bytes = bytes;
    Object.freeze(this);
  }

  /**
   * Wraps the bytes of ledger parameters the ledger of `era` wrote.
   *
   * @throws UnknownLedgerEraError when `era` is not a supported ledger era.
   * @throws InvalidSerializedStateError when `bytes` is not a `Uint8Array`, or does not start with
   * the tag that ledger writes for ledger parameters.
   */
  static fromBytes<E extends LedgerEra>(era: E, bytes: Uint8Array): SerializedLedgerParameters<E> {
    return new SerializedLedgerParameters(FROM_BYTES, era, checkedCopy('LedgerParameters', era, bytes));
  }

  /**
   * Whether `value` was made by {@link SerializedLedgerParameters.fromBytes} of this copy of the
   * package. A look-alike object, or one made by a second installed copy of the package, gives
   * `false`.
   */
  static isSerializedLedgerParameters(value: unknown): value is SerializedLedgerParameters {
    return typeof value === 'object' && value !== null && #bytes in value;
  }

  /**
   * @returns A copy of the bytes, exactly as the ledger wrote them.
   */
  serialize(): Uint8Array {
    return new Uint8Array(this.#bytes);
  }

  /**
   * Decodes the parameters with the decoder for their own era.
   *
   * @param decoders One decoder per ledger era, from the caller's own runtime, e.g.
   * `{ v9: LedgerParameters }`. Decoders with none for any era this value can be do not compile.
   * @throws SerializedStateDecoderMissingError when `decoders` has none for {@link era}.
   * @throws SerializedStateDecodeFailedError when the decoder throws an error that is not a
   * `MidnightJsError`. A `MidnightJsError` from the decoder is rethrown unchanged.
   */
  deserialize<D extends StateDecoders>(decoders: DecodersFor<D, E>): DecodedState<D, E> {
    return decode('LedgerParameters', this.era, this.#bytes, decoders) as DecodedState<D, E>;
  }
}

/**
 * A zswap chain state as the bytes the ledger wrote, with the era of the ledger that wrote them. The
 * caller decodes it with its own runtime: `read.zswapChainState.deserialize({ v9: ZswapChainState })`.
 *
 * Both eras write the same zswap tag, so the era is the one the reader stated, not one the bytes
 * prove.
 *
 * The bytes live in a private field, so `structuredClone`, `postMessage` and JSON drop them. To send
 * one elsewhere, send `serialize()` and `era`, and rebuild it with
 * {@link SerializedZswapChainState.fromBytes}.
 *
 * @typeParam E The era of the ledger that wrote it.
 */
export class SerializedZswapChainState<out E extends LedgerEra = LedgerEra> {
  readonly #bytes: Uint8Array;

  private constructor(
    fromBytes: typeof FROM_BYTES,
    readonly era: E,
    bytes: Uint8Array
  ) {
    requireFromBytes(fromBytes, 'ZswapChainState');
    this.#bytes = bytes;
    Object.freeze(this);
  }

  /**
   * Wraps the bytes of a zswap chain state the ledger of `era` wrote.
   *
   * @throws UnknownLedgerEraError when `era` is not a supported ledger era.
   * @throws InvalidSerializedStateError when `bytes` is not a `Uint8Array`, or does not start with
   * the tag that ledger writes for a zswap chain state.
   */
  static fromBytes<E extends LedgerEra>(era: E, bytes: Uint8Array): SerializedZswapChainState<E> {
    return new SerializedZswapChainState(FROM_BYTES, era, checkedCopy('ZswapChainState', era, bytes));
  }

  /**
   * Whether `value` was made by {@link SerializedZswapChainState.fromBytes} of this copy of the
   * package. A look-alike object, or one made by a second installed copy of the package, gives
   * `false`.
   */
  static isSerializedZswapChainState(value: unknown): value is SerializedZswapChainState {
    return typeof value === 'object' && value !== null && #bytes in value;
  }

  /**
   * @returns A copy of the bytes, exactly as the ledger wrote them.
   */
  serialize(): Uint8Array {
    return new Uint8Array(this.#bytes);
  }

  /**
   * Decodes the state with the decoder for its own era.
   *
   * @param decoders One decoder per ledger era, from the caller's own runtime, e.g.
   * `{ v9: ZswapChainState }`. Decoders with none for any era this value can be do not compile.
   * @throws SerializedStateDecoderMissingError when `decoders` has none for {@link era}.
   * @throws SerializedStateDecodeFailedError when the decoder throws an error that is not a
   * `MidnightJsError`. A `MidnightJsError` from the decoder is rethrown unchanged.
   */
  deserialize<D extends StateDecoders>(decoders: DecodersFor<D, E>): DecodedState<D, E> {
    return decode('ZswapChainState', this.era, this.#bytes, decoders) as DecodedState<D, E>;
  }
}
