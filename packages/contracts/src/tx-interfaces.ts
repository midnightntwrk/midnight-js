/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { type CompiledContract, ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { CoinPublicKey, ContractAddress, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { type CallResult } from './call';
import { type ContractProviders } from './contract-providers';
import { submitCallTx } from './submit-call-tx';
import * as Transaction from './transaction';
import type { FinalizedCallTxData } from './tx-model';
import type { CallTxOptions, CallTxOptionsWithPrivateStateId } from './unproven-call-tx';

/**
 * A type that lifts each circuit defined in a contract to a function that builds
 * and submits a call transaction.
 */
export type CircuitCallTxInterface<C extends Contract.Any> = {
  [PCK in Contract.ProvableCircuitId<C>]: {
    (...args: Contract.CircuitParameters<C, PCK>): Promise<FinalizedCallTxData<C, PCK>>,
    (txCtx: Transaction.TransactionContext<C, PCK>, ...args: Contract.CircuitParameters<C, PCK>): Promise<CallResult<C, PCK>>
  };
};

/**
 * Creates a {@link CallTxOptions} object from various data.
 */
export const createCallTxOptions = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  circuitId: PCK,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  additionalCoinEncPublicKeyMappings: ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined,
  args: Contract.CircuitParameters<C, PCK>
): CallTxOptions<C, PCK> => {
  const callOptionsBase = {
    additionalCoinEncPublicKeyMappings,
    compiledContract,
    circuitId,
    contractAddress
  };
  const callTxOptionsBase = args.length !== 0 ? { ...callOptionsBase, args } : callOptionsBase;
  const callTxOptions = privateStateId ? { ...callTxOptionsBase, privateStateId } : callTxOptionsBase;
  return callTxOptions as CallTxOptions<C, PCK>;
};

/**
 * Creates a circuit call transaction interface for a contract.
 *
 * @param providers The providers to use to build transactions.
 * @param compiledContract The contract to use to execute circuits.
 * @param contractAddress The ledger address of the contract.
 * @param privateStateId The identifier of the state of the witnesses of the contract.
 */
export const createCircuitCallTxInterface = <C extends Contract.Any>(
  providers: ContractProviders<C>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined
): CircuitCallTxInterface<C> => {
  assertIsContractAddress(contractAddress);
  providers.privateStateProvider.setContractAddress(contractAddress);
  return ContractExecutable.make(compiledContract).getProvableCircuitIds().reduce(
    (acc, circuitId) => ({
      ...acc,
      [circuitId]: (...args: unknown[]) => {
        const txCtx = args.length > 0 && Transaction.isTransactionContext(args[0]) ? args[0] : undefined;
        const callArgs = txCtx ? args.slice(1) : args;
        const callOptions = createCallTxOptions(
          compiledContract,
          circuitId,
          contractAddress,
          privateStateId,
          txCtx?.getAdditionalMappings(),
          callArgs as Contract.CircuitParameters<C, typeof circuitId>
        );
        return txCtx
          ? submitCallTx(providers, callOptions as CallTxOptionsWithPrivateStateId<C, typeof circuitId>, txCtx)
          : submitCallTx(providers, callOptions)
      }
    }),
    {}
  ) as CircuitCallTxInterface<C>;
};
