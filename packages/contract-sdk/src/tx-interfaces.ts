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

import type { SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/ledger';
import {
  type CircuitParameters,
  type Contract,
  type FinalizedTxData,
  getImpureCircuitIds,
  type ImpureCircuitId,
  type PrivateStateId,
  type VerifierKey} from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from '@midnight-ntwrk/midnight-js-contract-core';
import { submitCallTx } from './submit-call-tx';
import type { FinalizedCallTxData } from './tx-model';
import type { CallTxOptions } from './unproven-call-tx';

/**
 * A type that lifts each circuit defined in a contract to a function that builds
 * and submits a call transaction.
 */
export type CircuitCallTxInterface<C extends Contract> = {
  [ICK in ImpureCircuitId<C>]: (...args: CircuitParameters<C, ICK>) => Promise<FinalizedCallTxData<C, ICK>>;
};

/**
 * Creates a {@link CallTxOptions} object from various data.
 */
export const createCallTxOptions = <C extends Contract, ICK extends ImpureCircuitId<C>>(
  contract: C,
  circuitId: ICK,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  args: CircuitParameters<C, ICK>
): CallTxOptions<C, ICK> => {
  const callOptionsBase = {
    contract,
    circuitId,
    contractAddress
  };
  const callTxOptionsBase = args.length !== 0 ? { ...callOptionsBase, args } : callOptionsBase;
  const callTxOptions = privateStateId ? { ...callTxOptionsBase, privateStateId } : callTxOptionsBase;
  return callTxOptions as CallTxOptions<C, ICK>;
};

/**
 * Creates a circuit call transaction interface for a contract.
 *
 * @param providers The providers to use to build transactions.
 * @param contract The contract to use to execute circuits.
 * @param contractAddress The ledger address of the contract.
 * @param privateStateId The identifier of the state of the witnesses of the contract.
 */
export const createCircuitCallTxInterface = <C extends Contract>(
  providers: ContractProviders<C>,
  contract: C,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined
): CircuitCallTxInterface<C> => {
  assertIsContractAddress(contractAddress);
  return getImpureCircuitIds(contract).reduce(
    (acc, circuitId) => ({
      ...acc,
      [circuitId]: (...args: CircuitParameters<C, typeof circuitId>) =>
        submitCallTx(providers, createCallTxOptions(contract, circuitId, contractAddress, privateStateId, args))
    }),
    {}
  ) as CircuitCallTxInterface<C>;
};
