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

import {
  type AlignedValue,
  type CoinPublicKey,
  type ContractAddress,
  type ContractState,
  decodeZswapLocalState,
  emptyZswapLocalState,
  type Op,
  QueryContext,
  type StateValue,
  type ZswapLocalState
} from '@midnight-ntwrk/compact-runtime';
import type { Transcript, ZswapChainState } from '@midnight-ntwrk/ledger';
import { LedgerParameters,partitionTranscripts, PreTranscript } from '@midnight-ntwrk/ledger';
import {
  type CallResult,
  type CallResultPrivate,
  type CallResultPublic,
  type PartitionedTranscript
} from '@midnight-ntwrk/midnight-js-contract-core';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type {
  CircuitParameters,
  CircuitReturnType,
  Contract,
  ImpureCircuitId,
  PrivateState
} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';

import { toLedgerQueryContext } from './utils';

/**
 * Describes the target of a circuit invocation.
 */
export type CallOptionsBase<C extends Contract, ICK extends ImpureCircuitId<C>> = {
  /**
   * The contract defining the circuit to call.
   */
  readonly contract: C;
  /**
   * The identifier of the circuit to call.
   */
  readonly circuitId: ICK;
  /**
   * The address of the contract being executed.
   */
  readonly contractAddress: ContractAddress;
};

/**
 * Conditional type that optionally adds the inferred circuit argument types to
 * the options for a circuit call.
 */
export type CallOptionsWithArguments<C extends Contract, ICK extends ImpureCircuitId<C>> =
  CircuitParameters<C, ICK> extends []
    ? CallOptionsBase<C, ICK>
    : CallOptionsBase<C, ICK> & {
    /**
     * Arguments to pass to the circuit being called.
     */
    readonly args: CircuitParameters<C, ICK>;
  };

/**
 * Data retrieved via providers that should be included in the call options.
 */
export type CallOptionsProviderDataDependencies = {
  /**
   * The Zswap public key of the current user.
   */
  readonly coinPublicKey: CoinPublicKey;
  /**
   * The initial public state of the contract to run the circuit against.
   */
  readonly initialContractState: ContractState;
  /**
   * The initial public Zswap state of the contract to run the circuit against.
   */
  readonly initialZswapChainState: ZswapChainState;
};

/**
 * Call options with circuit arguments and data
 */
export type CallOptionsWithProviderDataDependencies<
  C extends Contract,
  ICK extends ImpureCircuitId<C>
> = CallOptionsWithArguments<C, ICK> & CallOptionsProviderDataDependencies;

/**
 * Call options for contracts with private state.
 */
export type CallOptionsWithPrivateState<
  C extends Contract,
  ICK extends ImpureCircuitId<C>
> = CallOptionsWithProviderDataDependencies<C, ICK> & {
  /**
   * The private state to run the circuit against.
   */
  readonly initialPrivateState: PrivateState<C>;
};

/**
 * Call options for a given contract and circuit.
 */
export type CallOptions<C extends Contract, ICK extends ImpureCircuitId<C>> =
  | CallOptionsWithProviderDataDependencies<C, ICK>
  | CallOptionsWithPrivateState<C, ICK>;

// Re-export CallResult types from contract-core for backward compatibility
export type { CallResult, CallResultPrivate, CallResultPublic, PartitionedTranscript } from '@midnight-ntwrk/midnight-js-contract-core';

const partitionTranscript = (
  initialTxContext: QueryContext,
  finalTxContext: QueryContext,
  publicTranscript: Op<AlignedValue>[]
): PartitionedTranscript => {
  const partitionedTranscripts = partitionTranscripts(
    [
      new PreTranscript(
        Array.from(finalTxContext.comIndicies).reduce(
          (queryContext, entry) => queryContext.insertCommitment(...entry),
          toLedgerQueryContext(initialTxContext)
        ),
        publicTranscript
      )
    ],
    LedgerParameters.dummyParameters()
  );
  if (partitionedTranscripts.length !== 1) {
    throw new Error(`Expected one transcript partition pair, received: ${partitionedTranscripts.length}`);
  }
  return partitionedTranscripts[0]!;
};

/**
 * Calls a circuit in the given contract according to the given configuration.
 *
 * @param options Configuration.
 */
export const call = <C extends Contract, ICK extends ImpureCircuitId<C>>(
  options: CallOptions<C, ICK>
): CallResult<C, ICK> => {
  const { contract, circuitId, contractAddress, coinPublicKey, initialContractState } = options;
  const circuit = contract.impureCircuits[circuitId];
  assertDefined(circuit, `Circuit '${circuitId}' is not defined`);
  const initialTxContext = new QueryContext(initialContractState.data, contractAddress);
  initialTxContext.block = {
    ...initialTxContext.block,
    secondsSinceEpoch: BigInt(Math.floor(Date.now() / 1_000)),
  }
  const { result, context, proofData } = circuit(
    {
      originalState: initialContractState,
      currentPrivateState: 'initialPrivateState' in options ? options.initialPrivateState : undefined,
      transactionContext: initialTxContext,
      currentZswapLocalState: emptyZswapLocalState(parseCoinPublicKeyToHex(coinPublicKey, getZswapNetworkId()))
    },
    ...('args' in options ? options.args : [])
  );
  return {
    public: {
      nextContractState: context.transactionContext.state,
      publicTranscript: proofData.publicTranscript,
      partitionedTranscript: partitionTranscript(
        initialTxContext,
        context.transactionContext,
        proofData.publicTranscript
      )
    },
    private: {
      result,
      input: proofData.input,
      output: proofData.output,
      privateTranscriptOutputs: proofData.privateTranscriptOutputs,
      nextPrivateState: context.currentPrivateState,
      nextZswapLocalState: decodeZswapLocalState(context.currentZswapLocalState)
    }
  };
};
