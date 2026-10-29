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

import { MidnightJsError, UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  LEDGER_STATE_KINDS,
  LEDGER_STATE_TAGS,
  LEDGER_VERSIONS,
  type LedgerVersion,
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
export type StateDecoders = Readonly<Partial<Record<LedgerVersion, StateDecoder>>>;

type DecodedByEra<D extends StateDecoders, E extends LedgerVersion> = E extends keyof D
  ? D[E] extends StateDecoder<infer T> | undefined
    ? T
    : never
  : never;

/**
 * What {@link SerializedState.deserialize} returns for decoders `D` and a value of era `E`.
 */
export type DecodedState<D extends StateDecoders, E extends LedgerVersion> = DecodedByEra<D, E>;

/**
 * Decoders `D` that can read a value of era `E`, or `never` when `D` has no decoder for any era `E`
 * can be, so such a call does not compile.
 */
export type DecodersFor<D extends StateDecoders, E extends LedgerVersion> = [Extract<keyof D, E>] extends [never] ? never : D;

const startsWithTag = (bytes: Uint8Array, tag: string): boolean => {
  const prefix = new TextEncoder().encode(`${tag}:`);
  return bytes.length >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
};

const isDecoderMap = (decoders: unknown): decoders is StateDecoders =>
  typeof decoders === 'object' && decoders !== null;

const FROM_BYTES: unique symbol = Symbol('SerializedState.fromBytes');

/**
 * A value the ledger wrote — a contract state, ledger parameters or a zswap chain state — carried
 * as its bytes, with the era of the ledger that wrote them.
 *
 * No read hands out a decoded state. The caller decodes it with its own runtime, so a contract
 * state comes back as an object its compiled contract accepts:
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
 * A `SerializedState` keeps its bytes in a private field, so `structuredClone`, `postMessage` and JSON
 * drop them. To send one elsewhere, send `serialize()` and `era`, and rebuild it with
 * {@link SerializedState.fromBytes}.
 *
 * @typeParam K The kind of value.
 * @typeParam E The era of the ledger that wrote it.
 */
export class SerializedState<K extends StateKind = StateKind, out E extends LedgerVersion = LedgerVersion> {
  readonly #bytes: Uint8Array;

  private constructor(
    fromBytes: typeof FROM_BYTES,
    readonly era: E,
    readonly kind: K,
    bytes: Uint8Array
  ) {
    if (fromBytes !== FROM_BYTES) {
      throw new InvalidSerializedStateError(undefined, undefined, 'not-from-bytes');
    }
    this.#bytes = bytes;
    Object.freeze(this);
  }

  /**
   * Wraps bytes the ledger of `era` wrote for a value of `kind`.
   *
   * @throws UnknownLedgerVersionError when `era` is not a supported ledger era.
   * @throws InvalidSerializedStateError when `kind` is unknown, `bytes` is not a `Uint8Array`, or the
   * bytes do not start with the tag that ledger writes for that kind.
   */
  static fromBytes<E extends LedgerVersion, K extends StateKind>(
    era: E,
    kind: K,
    bytes: Uint8Array
  ): SerializedState<K, E> {
    if (!LEDGER_VERSIONS.includes(era)) {
      throw new UnknownLedgerVersionError(String(era));
    }
    if (!LEDGER_STATE_KINDS.includes(kind)) {
      throw new InvalidSerializedStateError(String(kind), era, 'unknown-kind');
    }
    if (!(bytes instanceof Uint8Array)) {
      throw new InvalidSerializedStateError(kind, era, 'not-bytes');
    }
    if (!startsWithTag(bytes, LEDGER_STATE_TAGS[kind][era])) {
      throw new InvalidSerializedStateError(kind, era, 'tag-mismatch');
    }
    return new SerializedState(FROM_BYTES, era, kind, new Uint8Array(bytes));
  }

  /**
   * Whether `value` was made by {@link SerializedState.fromBytes} of this copy of the package. A
   * look-alike object, or one made by a second installed copy of the package, gives `false`.
   */
  static isSerializedState(value: unknown): value is SerializedState {
    return typeof value === 'object' && value !== null && #bytes in value;
  }

  /**
   * @returns A copy of the bytes, exactly as the ledger wrote them.
   */
  serialize(): Uint8Array {
    return new Uint8Array(this.#bytes);
  }

  /**
   * Decodes the value with the decoder for its own era.
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
    const decoder: StateDecoder | undefined =
      isDecoderMap(decoders) && Object.hasOwn(decoders, this.era) ? decoders[this.era] : undefined;
    if (typeof decoder?.deserialize !== 'function') {
      throw new SerializedStateDecoderMissingError(this.kind, this.era);
    }
    try {
      return decoder.deserialize(this.serialize()) as DecodedState<D, E>;
    } catch (cause: unknown) {
      if (cause instanceof MidnightJsError) {
        throw cause;
      }
      throw new SerializedStateDecodeFailedError(this.kind, this.era, { cause });
    }
  }
}
