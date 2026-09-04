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

import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type ZKConfigProvider,
  type TimeoutAwareProvingProvider,
  TIMEOUT_AWARE_BRAND,
  ZKConfigRegistry,
  zkConfigToProvingKeyMaterial
} from '@midnight-ntwrk/midnight-js-types';
import type { WalletConnectedAPI } from '@midnightntwrk/dapp-connector-api';

/**
 * Minimal interface required from the DApp Connector wallet.
 *
 * @remarks
 * Picks only {@link WalletConnectedAPI.getProvingProvider | getProvingProvider} from the full
 * wallet API, allowing loose coupling between the framework and the wallet implementation.
 */
export type DAppConnectorProvingAPI = Pick<WalletConnectedAPI, 'getProvingProvider'>;

/**
 * Obtains a {@link TimeoutAwareProvingProvider} from the DApp Connector wallet.
 *
 * @remarks
 * Extracts key material from the given `zkConfigProvider` and passes it to the wallet's
 * `getProvingProvider` method. Use this when you need direct, circuit-level access to the
 * wallet's proving capabilities without cost model integration.
 *
 * The returned provider carries the {@link TIMEOUT_AWARE_BRAND} brand and accepts an optional
 * trailing `overrideTimeout` parameter on `check` / `prove`. The per-call timeout is forwarded
 * to the wallet implementation when the wallet accepts the parameter; when the wallet's
 * underlying `getProvingProvider` does not (current state of the upstream wallet), the
 * parameter is silently ignored — the framework side is structurally ready, and wallet
 * implementations can opt in to honor the override without further changes here.
 *
 * @typeParam K - Union of circuit identifier strings defined by the contract.
 * @param api - DApp Connector wallet API exposing `getProvingProvider`.
 * @param zkConfigProvider - Provider that supplies ZK configuration artifacts and key material.
 * @returns A {@link TimeoutAwareProvingProvider} backed by the wallet.
 */
export const dappConnectorProvingProvider = async <K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry,
): Promise<TimeoutAwareProvingProvider> => {
  // The wallet round-trips each proof preimage's key location into this provider, so contract
  // key locations must be resolved through the registry's verifier-key join.
  const registry =
    zkConfigProvider instanceof ZKConfigRegistry ? zkConfigProvider : new ZKConfigRegistry([zkConfigProvider]);
  const walletProvingProvider = await api.getProvingProvider(registry.asKeyMaterialProvider());
  return {
    [TIMEOUT_AWARE_BRAND]: true,
    check: (serializedPreimage, keyLocation, _overrideTimeout?: number) =>
      walletProvingProvider.check(serializedPreimage, keyLocation),
    prove: (serializedPreimage, keyLocation, overwriteBindingInput, _overrideTimeout?: number) =>
      walletProvingProvider.prove(serializedPreimage, keyLocation, overwriteBindingInput),
    async lookupKey(keyLocation) {
      const resolved = await registry.resolveKeyLocation(keyLocation);
      return resolved === undefined ? undefined : zkConfigToProvingKeyMaterial(resolved);
    }
  };
};

// Re-export `ProvingProvider` from this module for backwards compatibility with downstream
// consumers that imported it from here. New code should import directly from the protocol
// package.
export type { ProvingProvider };
