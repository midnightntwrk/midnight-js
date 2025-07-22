/*
 * This file is part of compact-js.
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

import { Effect } from 'effect';
import {
  ContractDeploy,
  ContractState as LedgerContractState,
  NetworkId as LedgerNetworkId
} from '@midnight-ntwrk/ledger';
import {
  constructorContext,
  CoinPublicKey,
  ContractState,
  NetworkId as RuntimeNetworkId
} from '@midnight-ntwrk/compact-runtime';
import type * as ContractExecutable from '../ContractExecutable';
import type { CompiledContract } from '../CompiledContract';
import type { Contract } from '../Contract';
import { Meta, MetaTypeId } from './CompiledContract';

/** @internal */
export const make: <C extends Contract.Any>(
  compiledContract: CompiledContract<C, never>
) => ContractExecutable.ContractExecutable<C> = <C extends Contract.Any>(
  compiledContract: CompiledContract<C, never>
) => new ContractExecutableImpl<C>(compiledContract);

export class ContractExecutableImpl<C extends Contract<PS>, PS = Contract.PrivateState<C>>
  implements ContractExecutable.ContractExecutable<C, PS>
{
  #meta: Meta<C, never>;
  #contract: C;

  constructor(readonly compiledContract: CompiledContract<C, never>) {
    this.#meta = compiledContract as Meta<C, never>;
    this.#contract = new this.#meta[MetaTypeId].ctor(this.#meta[MetaTypeId].witnesses);
  }

  initialize(
    privateState: PS,
    ...args: Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.ContractExecutable.Result<ContractDeploy, PS>, Error> {
    return Effect.try({
      try: () => {
        const cpk: CoinPublicKey = '';
        const { currentContractState, currentPrivateState, currentZswapLocalState } = this.#contract.initialState(
          constructorContext(privateState, cpk),
          ...args
        );
        const ledgerContractState = asLedgerContractState(currentContractState);

        return {
          result: new ContractDeploy(ledgerContractState),
          privateState: currentPrivateState,
          zswapLocalState: currentZswapLocalState
        };
      },
      catch: (_: unknown) => new Error(`Failed to initialize instance of contract '${this.#meta[MetaTypeId].tag}'`)
    });
  }
}

const asLedgerContractState: (contractState: ContractState) => LedgerContractState = (contractState) =>
  LedgerContractState.deserialize(contractState.serialize(RuntimeNetworkId.Undeployed), LedgerNetworkId.Undeployed);
