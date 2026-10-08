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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { CostModel } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { proveV8Transaction } from '@midnight-ntwrk/midnight-js-protocol/prove';
import {
  createProofProviderFromHandlers,
  type ProofProvider,
  type ProveTxConfig,
  type ZKConfigProvider,
  type ZKConfigRegistry
} from '@midnight-ntwrk/midnight-js-types';
import type { KeyMaterialProvider, ProvingProvider } from '@midnightntwrk/dapp-connector-api';

import { type DAppConnectorProvingAPI, dappConnectorProvingProvider } from './dapp-connector-proving-provider';

type Assert<T extends true> = T;
type Identical<A, B> = (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0 ? true : false;

// The typecheck fails here once the wallet proving surface changes shape; forward a timeout then
// and drop refuseTimeout. See https://github.com/midnightntwrk/midnight-dapp-connector-api/issues/97
type _WalletProvingProviderUnchanged = Assert<
  Identical<
    ProvingProvider,
    {
      check(serializedPreimage: Uint8Array, keyLocation: string): Promise<(bigint | undefined)[]>;
      prove(serializedPreimage: Uint8Array, keyLocation: string, overwriteBindingInput?: bigint): Promise<Uint8Array>;
    }
  >
>;
type _GetProvingProviderUnchanged = Assert<
  Identical<
    DAppConnectorProvingAPI,
    { getProvingProvider(keyMaterialProvider: KeyMaterialProvider): Promise<ProvingProvider> }
  >
>;

const refuseTimeout = (config: ProveTxConfig | undefined): void => {
  if (config?.timeout !== undefined) {
    throw new InvalidArgumentError(
      'proveTxConfig.timeout is not supported by dappConnectorProofProvider: the wallet proving API takes no timeout. ' +
        'See https://github.com/midnightntwrk/midnight-dapp-connector-api/issues/97'
    );
  }
};

/**
 * Creates a {@link ProofProvider} that delegates proving to a DApp Connector wallet.
 *
 * @remarks
 * Combines a wallet-backed {@link dappConnectorProvingProvider} with the given `costModel`
 * to produce a transaction-level proof provider. The wallet's proving provider is obtained
 * once during initialization and reused for all subsequent `proveTx` calls.
 *
 * @typeParam K - Union of circuit identifier strings defined by the contract.
 * @param api - DApp Connector wallet API exposing `getProvingProvider`.
 * @param zkConfigProvider - A single {@link ZKConfigProvider} or a multi-source
 * {@link ZKConfigRegistry} that supplies ZK configuration artifacts and key material. A registry is
 * required to prove transactions that make cross-contract calls, which carry one proof per contract
 * in the call tree.
 * @param costModel - Cost model applied during transaction proving on the CURRENT ledger era.
 *
 * **Not consulted on the retained (`v8`) era**, which uses that era's own cost model instead. This
 * is not an oversight and not a silent fallback: the retained ledger ships its own `CostModel`
 * class and type-checks `prove()`'s argument against it across the WASM boundary, so the value
 * passed here would be rejected outright. Pairing the transaction with its own era's model is the
 * only correct pairing, so an override is not offered at all rather than offered and quietly
 * ignored.
 * @returns A {@link ProofProvider} whose `proveTx` method delegates to the wallet. Its `proveTx`
 * rejects with `InvalidArgumentError` when `proveTxConfig.timeout` is set, before any proving
 * starts, because the wallet proving API takes no timeout.
 */
export const dappConnectorProofProvider = async <K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry,
  costModel: CostModel,
): Promise<ProofProvider> => {
  const provingProvider = await dappConnectorProvingProvider(api, zkConfigProvider);
  return createProofProviderFromHandlers({
    currentEra: (tx, config) => {
      refuseTimeout(config);
      return tx.prove(provingProvider, costModel);
    },
    // Bytes in, bytes out: a retained-era transaction cannot cross this seam as a live object. See
    // the `costModel` parameter above for why this arm does not take one.
    retainedEras: {
      v8: (txBytes, config) => {
        refuseTimeout(config);
        return proveV8Transaction(txBytes, provingProvider);
      }
    }
  });
};
