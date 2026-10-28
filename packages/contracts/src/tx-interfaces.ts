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

import type { CoinPublicKey, ContractAddress, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { type CompiledContract, ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { type CallResult } from './call';
import { type Ledger9ContractProviders } from './contract-providers';
import { hasLedger8ContractShape } from './internal/era';
import type {
  Ledger8CallTxOptions,
  Ledger8CircuitCallTxInterface,
  Ledger8CircuitId,
  Ledger8CircuitParameters,
  Ledger8Contract,
  Ledger8ContractProviders
} from './ledger8-contract';
import { submitCallTx } from './submit-call-tx';
import * as Transaction from './transaction';
import type { Ledger9FinalizedCallTxData } from './tx-model';
import type { Ledger9CallTxOptions, Ledger9CallTxOptionsWithPrivateStateId } from './unproven-call-tx';

/**
 * A type that lifts each circuit defined in a contract to a function that builds
 * and submits a call transaction.
 */
export type Ledger9CircuitCallTxInterface<C extends Contract.Any> = {
  [PCK in Contract.ProvableCircuitId<C>]: {
    (...args: Contract.CircuitParameters<C, PCK>): Promise<Ledger9FinalizedCallTxData<C, PCK>>,
    (txCtx: Transaction.TransactionContext<C, PCK>, ...args: Contract.CircuitParameters<C, PCK>): Promise<CallResult<C, PCK>>
  };
};

/**
 * Builds a ledger 8 `CallTxOptions`, leaving out every member the caller did not supply.
 */
const createLedger8CallTxOptions = <C extends Ledger8Contract, K extends Ledger8CircuitId<C>>(
  compiledContract: C,
  circuitId: K,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  additionalCoinEncPublicKeyMappings: ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined,
  args: Ledger8CircuitParameters<C, K>
): Ledger8CallTxOptions<C, K> => {
  const target = {
    compiledContract,
    contractAddress,
    circuitId,
    ...(additionalCoinEncPublicKeyMappings === undefined ? {} : { additionalCoinEncPublicKeyMappings }),
    // Omitted, not `undefined`: downstream must tell "named none" from "named one".
    ...(privateStateId === undefined ? {} : { privateStateId })
  };
  return (args.length === 0 ? target : { ...target, args }) as Ledger8CallTxOptions<C, K>;
};

/**
 * Creates the options `submitCallTx` takes to call one circuit: a {@link Ledger9CallTxOptions} for a
 * ledger 9 `CompiledContract`, or a {@link Ledger8CallTxOptions} for a ledger 8 contract.
 *
 * `args` is left out for a circuit that takes no arguments, and `privateStateId` when it is
 * `undefined`. `circuitId` must be a circuit the contract declares; a plain string literal is
 * accepted.
 *
 * @param compiledContract The contract the circuit belongs to.
 * @param circuitId The circuit to call.
 * @param contractAddress The ledger address of the contract.
 * @param privateStateId Where to read and store the contract's private state,
 * or `undefined` for a contract that carries none.
 * @param additionalCoinEncPublicKeyMappings Encryption keys for shielded coins the circuit pays
 * to a recipient other than the calling wallet, or `undefined` for none.
 * @param args The circuit's own arguments.
 * @throws EraArtifactMismatchError If `compiledContract` has the shape of neither a ledger 8
 * contract nor a ledger 9 `CompiledContract`.
 */
export function createCallTxOptions<C extends Ledger8Contract, K extends Ledger8CircuitId<C>>(
  compiledContract: C,
  circuitId: K,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  additionalCoinEncPublicKeyMappings: ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined,
  args: Ledger8CircuitParameters<C, K>
): Ledger8CallTxOptions<C, K>;
export function createCallTxOptions<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  circuitId: PCK,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  additionalCoinEncPublicKeyMappings: ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined,
  args: Contract.CircuitParameters<C, PCK>
): Ledger9CallTxOptions<C, PCK>;
export function createCallTxOptions<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  compiledContract: CompiledContract.CompiledContract<C, any> | Ledger8Contract, // eslint-disable-line @typescript-eslint/no-explicit-any
  circuitId: PCK,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined,
  additionalCoinEncPublicKeyMappings: ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined,
  args: Contract.CircuitParameters<C, PCK> | Ledger8CircuitParameters<Ledger8Contract, string>
): Ledger9CallTxOptions<C, PCK> | Ledger8CallTxOptions<Ledger8Contract, string> {
  if (hasLedger8ContractShape(compiledContract)) {
    return createLedger8CallTxOptions(
      compiledContract,
      circuitId,
      contractAddress,
      privateStateId,
      additionalCoinEncPublicKeyMappings,
      args as Ledger8CircuitParameters<Ledger8Contract, string>
    );
  }
  const callOptionsBase = {
    additionalCoinEncPublicKeyMappings,
    compiledContract,
    circuitId,
    contractAddress
  };
  const callTxOptionsBase = args.length !== 0 ? { ...callOptionsBase, args } : callOptionsBase;
  const callTxOptions = privateStateId === undefined ? callTxOptionsBase : { ...callTxOptionsBase, privateStateId };
  return callTxOptions as Ledger9CallTxOptions<C, PCK>;
}

/**
 * Creates a circuit call transaction interface for a RETAINED-ERA contract.
 *
 * `privateStateId` is carried on every call this interface makes, exactly as
 * the ledger 9 path of {@link createCircuitCallTxInterface} carries it. A handle
 * that could not carry one would execute against a DEFAULT private state and
 * then discard the state each call produced, with nothing erroring at any
 * stage — see the private-state section of `docs/keep-state-pipeline.md`.
 *
 * @param providers The providers to use to build transactions.
 * @param compiledContract The retained-era contract instance to execute circuits on.
 * @param contractAddress The ledger address of the contract.
 * @param privateStateId Where to read and store the contract's private state,
 * or `undefined` for a contract that carries none.
 */
export const createLedger8CircuitCallTxInterface = <C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  compiledContract: C,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined
): Ledger8CircuitCallTxInterface<C> => {
  assertIsContractAddress(contractAddress);
  const circuitIds = Object.keys(compiledContract.provableCircuits) as Ledger8CircuitId<C>[];
  return circuitIds.reduce(
    (acc, circuitId) => ({
      ...acc,
      [circuitId]: (...args: Ledger8CircuitParameters<C, typeof circuitId>) =>
        submitCallTx(
          providers,
          createLedger8CallTxOptions(compiledContract, circuitId, contractAddress, privateStateId, undefined, args)
        )
    }),
    {}
  ) as Ledger8CircuitCallTxInterface<C>;
};

/**
 * Creates a {@link Ledger9CircuitCallTxInterface}, or the retained era's `Ledger8CircuitCallTxInterface`
 * for a contract the retained Compact toolchain produced.
 *
 * @param providers The providers to use to build transactions.
 * @param compiledContract The contract to use to execute circuits.
 * @param contractAddress The ledger address of the contract.
 * @param privateStateId The identifier of the state of the witnesses of the contract,
 * or `undefined` for a contract that carries none.
 * @throws InvalidArgumentError If `contractAddress` is malformed.
 * @throws EraArtifactMismatchError If `compiledContract` has the shape of neither a ledger 8
 * contract nor a ledger 9 `CompiledContract`.
 */
export function createCircuitCallTxInterface<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  compiledContract: C,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined
): Ledger8CircuitCallTxInterface<C>;
export function createCircuitCallTxInterface<C extends Contract.Any>(
  providers: Ledger9ContractProviders<C>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined
): Ledger9CircuitCallTxInterface<C>;
export function createCircuitCallTxInterface<C extends Contract.Any>(
  providers: Ledger9ContractProviders<C>,
  compiledContract: CompiledContract.CompiledContract<C, any> | Ledger8Contract, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId | undefined
): Ledger9CircuitCallTxInterface<C> | Ledger8CircuitCallTxInterface<Ledger8Contract> {
  assertIsContractAddress(contractAddress);
  if (hasLedger8ContractShape(compiledContract)) {
    return createLedger8CircuitCallTxInterface(providers, compiledContract, contractAddress, privateStateId);
  }
  providers.privateStateProvider.setContractAddress(contractAddress);
  return ContractExecutable.make(compiledContract).getProvableCircuitIds().reduce(
    (acc, circuitId) => ({
      ...acc,
      [circuitId]: (...args: unknown[]) => {
        const txCtx = args.length > 0 && Transaction.isTransactionContext(args[0]) ? args[0] : undefined;
        const callArgs = txCtx ? args.slice(1) : args;
        const callOptions = createCallTxOptions<C, Contract.ProvableCircuitId<C>>(
          compiledContract,
          circuitId,
          contractAddress,
          privateStateId,
          txCtx?.getAdditionalMappings(),
          callArgs as Contract.CircuitParameters<C, Contract.ProvableCircuitId<C>>
        );
        return txCtx
          ? submitCallTx(providers, callOptions as Ledger9CallTxOptionsWithPrivateStateId<C, Contract.ProvableCircuitId<C>>, txCtx)
          : submitCallTx(providers, callOptions)
      }
    }),
    {}
  ) as Ledger9CircuitCallTxInterface<C>;
}
