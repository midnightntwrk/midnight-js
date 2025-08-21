/*
 * This file is part of platform-js.
 * Copyright (C) 2025 Midnight Foundation
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

import * as Equal from 'effect/Equal';
import { hasProperty } from 'effect/Predicate';
import { NodeInspectSymbol, type Inspectable } from 'effect/Inspectable';
import * as equivalence from 'effect/Equivalence';
import { dual } from 'effect/Function';
import * as ledger from '@midnight-ntwrk/ledger';
import * as runtime from '@midnight-ntwrk/compact-runtime';

const MAINNET_MONIKER = 'main';

const TypeId: unique symbol = Symbol.for('platform-js/effect/NetworkId');
export type TypeId = typeof TypeId;

const MonikerSymbol: unique symbol = Symbol.for('platform-js/effect/NetworkId#NetworkMoniker');

export interface NetworkId extends Equal.Equal, Inspectable {
  readonly [TypeId]: TypeId;
  readonly [MonikerSymbol]: string | true;
  /**
   * Determines if the network identifier represents the Midnight MainNet.
   *
   * @returns `true` if the {@link NetworkId} represents the Midnight MainNet; `false` otherwise.
   */
  readonly isMainNet: () => boolean;
}

export type NetworkIdInput = string | NetworkId;

/**
 * Provides equivalence for {@link NetworkId} instances.
 *
 * @remarks
 * For two {@link NetworkId} instances to be considered equal, their underlying monikers must be equal.
 *
 * @category equivalence
 */
export const Equivalence: equivalence.Equivalence<NetworkId> =
  equivalence.mapInput(
    (a, b) => Equal.equals(a, b),
    (_) => _[MonikerSymbol]
  );

/**
 * Determines if a value is a network identifier.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link NetworkId}; `false` otherwise.
 *
 * @category guards
 */
export const isNetworkId = (u: unknown): u is NetworkId => hasProperty(u, TypeId);

/**
 * Determines if two network identifiers are equal.
 *
 * @category predicates
 */
export const equals: {
  (that: NetworkId): (self: NetworkId) => boolean;
  (self: NetworkId, that: NetworkId): boolean;
} = dual(2, (self: NetworkId, that: NetworkId): boolean => Equivalence(self, that));


const NetworkIdProto = (networkMoniker: string | true) => ({
  [TypeId]: TypeId,
  [Equal.symbol](this: NetworkId, that: unknown) {
    return isNetworkId(that) && equals(this, that)
  },
  toString(this: NetworkId) {
    return this[MonikerSymbol] === true
      ? MAINNET_MONIKER
      : this[MonikerSymbol];
  },
  toJSON(this: NetworkId) {
    return {
      _id: 'NetworkId',
      moniker: this.toString()
    };
  },
  [NodeInspectSymbol](this: NetworkId) {
    return this.toJSON()
  },
  [MonikerSymbol]: networkMoniker,
  isMainNet(this: NetworkId): boolean {
    return this[MonikerSymbol] === true;
  }
});

/**
 * A network identifier that represents the Midnight MainNet.
 */
export const MainNet: NetworkId = Object.create(NetworkIdProto(true));

/**
 * Create a network identifier.
 *
 * @param input The input to use when constructing the network identifier.
 * @returns A {@link NetworkId} derived from `input`.
 *
 * @category constructors
 */
export const make: (input: NetworkIdInput) => NetworkId =
  (input) => Object.create(NetworkIdProto(isNetworkId(input) ? input[MonikerSymbol] : input));
