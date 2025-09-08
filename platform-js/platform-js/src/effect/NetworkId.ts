/*
 * This file is part of midnight-js.
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

import * as runtime from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnight-ntwrk/ledger';
import * as Equal from 'effect/Equal';
import * as equivalence from 'effect/Equivalence';
import { dual } from 'effect/Function';
import * as HashMap from 'effect/HashMap';
import { type Inspectable,NodeInspectSymbol } from 'effect/Inspectable';
import * as Option from 'effect/Option';
import { hasProperty } from 'effect/Predicate';

import * as NetworkIdMoniker from './NetworkIdMoniker.js';

const MAINNET_MONIKER = NetworkIdMoniker.NetworkIdMoniker('main');

const TypeId: unique symbol = Symbol.for('platform-js/effect/NetworkId');
export type TypeId = typeof TypeId;

const MonikerSymbol: unique symbol = Symbol.for('platform-js/effect/NetworkId#NetworkMoniker');

/**
 * Represents a Midnight network identifier.
 * 
 * @remarks
 * A {@link NetworkId} can be constructed by calling {@link make} with a valid
 * {@link NetworkIdMoniker.NetworkIdMoniker | NetworkIdMoniker} identifying the network. Alternatively, in order
 * to use the Midnight MainNet, use the exported instance {@link MainNet}.
 * 
 * @see {@link NetworkIdInput}
 * @see {@link make}
 */
export interface NetworkId extends Equal.Equal, Inspectable {
  readonly [TypeId]: TypeId;
  readonly [MonikerSymbol]: NetworkIdMoniker.NetworkIdMoniker | true;
  /**
   * Determines if the network identifier represents the Midnight MainNet.
   *
   * @returns `true` if the {@link NetworkId} represents the Midnight MainNet; `false` otherwise.
   */
  readonly isMainNet: () => boolean;
}

/**
 * An input for constructing {@link NetworkId} instances.
 * 
 * @see {@link make}
 */
export type NetworkIdInput = NetworkIdMoniker.NetworkIdMoniker | NetworkId;

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
 * Creates a network identifier.
 *
 * @param input The input to use when constructing the network identifier.
 * @returns A {@link NetworkId} derived from `input`.
 *
 * @category constructors
 */
export const make: (input: NetworkIdInput) => NetworkId =
  (input) => Object.create(NetworkIdProto(isNetworkId(input) ? input[MonikerSymbol] : input));

const monikerMap = HashMap.make(
  ['undeployed', [ledger.NetworkId.Undeployed, runtime.NetworkId.Undeployed] as const ],
  ['dev', [ledger.NetworkId.DevNet, runtime.NetworkId.DevNet]] as const,
  ['test', [ledger.NetworkId.TestNet, runtime.NetworkId.TestNet]] as const,
  [MAINNET_MONIKER.toLocaleLowerCase(), [ledger.NetworkId.MainNet, runtime.NetworkId.MainNet]] as const
);

/**
 * Converts a {@link NetworkId} to a legacy 'Ledger' `NetworkId`.
 *
 * @param self The network identifier.
 * @returns A `NetworkId` value from the `'@midnight-ntwrk/ledger'` package that represents `self`.
 * 
 * @deprecated This will be removed in version 0.1.
 */
export const asLedgerLegacy: (self: NetworkId) => ledger.NetworkId =
  (self) => {
    const networkIds = Option.getOrThrow(HashMap.get(monikerMap, self.toString()));
    return networkIds[0];
  };

/**
 * Converts a {@link NetworkId} to a legacy 'Runtime' `NetworkId`.
 *
 * @param self The network identifier.
 * @returns A `NetworkId` value from the `'@midnight-ntwrk/compact-runtime'` package that represents `self`.
 *
 * @deprecated This will be removed in version 0.1.
 */
export const asRuntimeLegacy: (self: NetworkId) => ledger.NetworkId =
  (self) => {
    const networkIds = Option.getOrThrow(HashMap.get(monikerMap, self.toString()));
    return networkIds[1];
  };
