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

import { UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  LEDGER_STATE_KINDS,
  LEDGER_STATE_TAGS,
  LEDGER_VERSIONS,
  type LedgerStateKind,
  type LedgerVersion
} from '@midnight-ntwrk/midnight-js-protocol/version';

import { InvalidLedgerStateError, LedgerStateDecoderMissingError } from './errors';

export type { LedgerStateKind };

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

/**
 * What {@link LedgerState.deserialize} returns for decoders `D` and a value of era `E`.
 */
export type DecodedState<D extends StateDecoders, E extends LedgerVersion> = E extends keyof D
  ? D[E] extends StateDecoder<infer T>
    ? T
    : never
  : never;

const startsWithTag = (bytes: Uint8Array, tag: string): boolean => {
  const prefix = new TextEncoder().encode(`${tag}:`);
  return bytes.length >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
};

/**
 * A value the ledger wrote — a contract state, ledger parameters or a zswap chain state — carried
 * as its bytes, with the version of the ledger that wrote them.
 *
 * The framework never hands out a decoded state. The caller decodes it with its own runtime, so a
 * contract state comes back as an object its compiled contract accepts:
 *
 * ```ts
 * import { ContractState } from '@midnight-ntwrk/compact-runtime';
 *
 * const read = await publicDataProvider.queryContractState(address);
 * const state = ledger(read.contractState.deserialize({ v9: ContractState }).data);
 * ```
 *
 * @typeParam K The kind of value.
 * @typeParam E The version of the ledger that wrote it.
 */
export class LedgerState<K extends LedgerStateKind = LedgerStateKind, E extends LedgerVersion = LedgerVersion> {
  readonly #bytes: Uint8Array;

  private constructor(
    readonly kind: K,
    readonly version: E,
    bytes: Uint8Array
  ) {
    this.#bytes = bytes;
    Object.freeze(this);
  }

  /**
   * Wraps bytes the ledger of `version` wrote for a value of `kind`.
   *
   * @throws UnknownLedgerVersionError when `version` is not a supported ledger version.
   * @throws InvalidLedgerStateError when `kind` is unknown, `bytes` is not a `Uint8Array`, or the
   * bytes do not start with the tag that ledger writes for that kind.
   */
  static fromBytes<K extends LedgerStateKind, E extends LedgerVersion>(
    kind: K,
    version: E,
    bytes: Uint8Array
  ): LedgerState<K, E> {
    if (!LEDGER_VERSIONS.includes(version)) {
      throw new UnknownLedgerVersionError(String(version));
    }
    if (!LEDGER_STATE_KINDS.includes(kind)) {
      throw new InvalidLedgerStateError(String(kind), version, 'unknown-kind');
    }
    if (!(bytes instanceof Uint8Array)) {
      throw new InvalidLedgerStateError(kind, version, 'not-bytes');
    }
    if (!startsWithTag(bytes, LEDGER_STATE_TAGS[kind][version])) {
      throw new InvalidLedgerStateError(kind, version, 'tag-mismatch');
    }
    return new LedgerState(kind, version, bytes.slice());
  }

  /**
   * @returns A copy of the bytes, exactly as the ledger wrote them.
   */
  serialize(): Uint8Array {
    return this.#bytes.slice();
  }

  /**
   * Decodes the value with the decoder for its own version.
   *
   * @param decoders One decoder per ledger version, from the caller's own runtime, e.g.
   * `{ v9: ContractState }`.
   * @throws LedgerStateDecoderMissingError when `decoders` has none for {@link version}.
   */
  deserialize<D extends StateDecoders>(decoders: D): DecodedState<D, E> {
    const decoder: StateDecoder | undefined = Object.hasOwn(decoders, this.version) ? decoders[this.version] : undefined;
    if (typeof decoder?.deserialize !== 'function') {
      throw new LedgerStateDecoderMissingError(this.kind, this.version);
    }
    return decoder.deserialize(this.serialize()) as DecodedState<D, E>;
  }
}
