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
import * as zswap from '@midnight-ntwrk/zswap';

import { NetworkIdTypeError } from './errors';
import { NetworkId } from './network-id';

const toLedgerNetworkId = (id: NetworkId): ledger.NetworkId => {
  switch (id) {
    case NetworkId.Undeployed:
      return ledger.NetworkId.Undeployed;
    case NetworkId.DevNet:
      return ledger.NetworkId.DevNet;
    case NetworkId.TestNet:
      return ledger.NetworkId.TestNet;
    case NetworkId.MainNet:
      return ledger.NetworkId.MainNet;
    default:
      throw new NetworkIdTypeError(String(id));
  }
};

const toRuntimeNetworkId = (id: NetworkId): runtime.NetworkId => {
  switch (id) {
    case NetworkId.Undeployed:
      return runtime.NetworkId.Undeployed;
    case NetworkId.DevNet:
      return runtime.NetworkId.DevNet;
    case NetworkId.TestNet:
      return runtime.NetworkId.TestNet;
    case NetworkId.MainNet:
      return runtime.NetworkId.MainNet;
    default:
      throw new NetworkIdTypeError(String(id));
  }
};

const toZswapNetworkId = (id: NetworkId): zswap.NetworkId => {
  switch (id) {
    case NetworkId.Undeployed:
      return zswap.NetworkId.Undeployed;
    case NetworkId.DevNet:
      return zswap.NetworkId.DevNet;
    case NetworkId.TestNet:
      return zswap.NetworkId.TestNet;
    case NetworkId.MainNet:
      return zswap.NetworkId.MainNet;
    default:
      throw new NetworkIdTypeError(String(id));
  }
};

// Module level state that will be preserved by the JavaScript module system.
let currentNetworkId: NetworkId = NetworkId.Undeployed;

/**
 * Sets the global network identifier.
 *
 * @param id A valid {@link NetworkId} value.
 */
export const setNetworkId = (id: NetworkId): void => {
  currentNetworkId = id;
};

/**
 * Retrieves the currently set global network identifier.
 *
 * @returns The currently set {@link NetworkId}.
 */
export const getNetworkId = (): NetworkId => currentNetworkId;

/**
 * Retrieves the currently set global network identifier as a {@link runtime.NetworkId} value.
 *
 * @returns The currently set {@link runtime.NetworkId}.
 */
export const getRuntimeNetworkId = (): runtime.NetworkId => toRuntimeNetworkId(getNetworkId());

/**
 * Retrieves the currently set global network identifier as a {@link ledger.NetworkId} value.
 *
 * @returns The currently set {@link ledger.NetworkId}.
 */
export const getLedgerNetworkId = (): ledger.NetworkId => toLedgerNetworkId(getNetworkId());

/**
 * Retrieves the currently set global network identifier as a {@link zswap.NetworkId} value.
 *
 * @returns The currently set {@link zswap.NetworkId}.
 */
export const getZswapNetworkId = (): zswap.NetworkId => toZswapNetworkId(getNetworkId());

/**
 * Converts a potential network ID into a {@link NetworkId}. Returns null if the string is not
 * a valid network ID.
 *
 * @param networkId The string to convert.
 */
export const stringToNetworkId = (networkId: string): NetworkId | null => {
  switch (networkId) {
    case 'Undeployed':
      return NetworkId.Undeployed;
    case 'DevNet':
      return NetworkId.DevNet;
    case 'TestNet':
      return NetworkId.TestNet;
    case 'MainNet':
      return NetworkId.MainNet;
    default:
      return null;
  }
};

/**
 * Converts a network ID to hex representation. Used for debugging.
 *
 * @param networkId The network ID to convert to hex.
 */
export const networkIdToHex = (networkId: NetworkId): string => {
  switch (networkId) {
    case NetworkId.Undeployed:
      return '00';
    case NetworkId.DevNet:
      return '01';
    case NetworkId.TestNet:
      return '02';
    case NetworkId.MainNet:
      return '04';
    default:
      throw new NetworkIdTypeError(String(networkId));
  }
};

export * from './errors';
export * from './network-id';
