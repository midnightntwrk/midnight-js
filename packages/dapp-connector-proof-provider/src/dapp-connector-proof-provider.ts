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

import type { CostModel } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  createProofProvider,
  type ProofProvider,
  type ProveTxConfig,
  type VersionedUnboundTransaction,
  type VersionedUnprovenTransaction,
  type ZKConfigProvider,
  type ZKConfigRegistry
} from '@midnight-ntwrk/midnight-js-types';
import { proveV8Transaction } from '@midnight-ntwrk/midnight-js-utils';

import { type DAppConnectorProvingAPI, dappConnectorProvingProvider } from './dapp-connector-proving-provider';

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
 * passed here would be rejected outright. A caller cannot supply a correct one either — the
 * retained runtime is reachable only through the framework's own lazy loader, so the class is not
 * constructible from application code. Overriding the cost model on the retained era is therefore
 * not offered at all, rather than offered and quietly ignored.
 * @returns A {@link ProofProvider} whose `proveTx` method delegates to the wallet.
 */
export const dappConnectorProofProvider = async <K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry,
  costModel: CostModel,
): Promise<ProofProvider> => {
  const provingProvider = await dappConnectorProvingProvider(api, zkConfigProvider);
  // The current era keeps delegating wholesale, so that path stays exactly what it was before this
  // package grew a second arm -- including how it reports an untagged payload.
  const currentEraProofProvider = createProofProvider(provingProvider, costModel);
  return {
    async proveTx(
      unprovenTx: VersionedUnprovenTransaction,
      proveTxConfig?: ProveTxConfig
    ): Promise<VersionedUnboundTransaction> {
      // Bytes in, bytes out: a retained-era transaction cannot cross this seam as a live object.
      // `proveV8Transaction` owns the payload tag assertion and pairs the transaction with its own
      // era's cost model -- see the `costModel` parameter above for why this one is not forwarded.
      //
      // Read through `?.` so a payload that is not an object at all falls through to the current-era
      // provider, which reports it as `UntaggedPayloadError`. Dispatching on a bare `.version` would
      // turn that caller's mistake into a bare `TypeError` carrying no code.
      if (unprovenTx?.version === 'v8') {
        return { version: 'v8', txBytes: await proveV8Transaction(unprovenTx.txBytes, provingProvider) };
      }
      return currentEraProofProvider.proveTx(unprovenTx, proveTxConfig);
    }
  };
};
