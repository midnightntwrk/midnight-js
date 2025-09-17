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
  ChargedState,
  CompactError,
  ContractMaintenanceAuthority,
  type ContractState,
  CostModel,
  createConstructorContext,
  decodeZswapLocalState,
  emptyZswapLocalState,
  encodeZswapLocalState,
  type Op,
  QueryContext,
  sampleSigningKey,
  signatureVerifyingKey,
  StateValue,
  type ZswapLocalState} from '@midnight-ntwrk/compact-runtime';
import {
  ChargedState as LedgerChargedState,
  LedgerParameters,
  partitionTranscripts,
  PreTranscript,
  QueryContext as LedgerQueryContext,
  StateValue as LedgerStateValue,
  type Transcript
} from '@midnight-ntwrk/ledger';
import * as CoinPublicKey from '@midnight-ntwrk/platform-js/effect/CoinPublicKey';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import type * as ContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';
import * as SigningKey from '@midnight-ntwrk/platform-js/effect/SigningKey';
import { Effect, Either,type Layer, Option } from 'effect';
import { dual, identity } from 'effect/Function';
import { type Pipeable, pipeArguments } from 'effect/Pipeable';

import { type CompiledContract } from './CompiledContract.js';
import * as Contract from './Contract.js';
import * as ContractConfigurationError from './ContractConfigurationError.js';
import * as ContractRuntimeError from './ContractRuntimeError.js';
import * as CompactContextInternal from './internal/compactContext.js';
import { ZKConfiguration } from './ZKConfiguration.js';
import { type ZKConfigurationReadError } from './ZKConfigurationReadError.js';

/**
 * An executable form of a Compact compiled contract.
 */
export interface ContractExecutable<in out C extends Contract.Contract<PS>, PS, out E = never, out R = never>
  extends Pipeable {
  readonly compiledContract: CompiledContract<C, PS>;

  /**
   * Creates and initializes a new instance of the contract.
   *
   * @param initialPrivateState The initial private state to apply when initializing the new contract instance.
   * @param args The arguments to supply the contract constructor.
   * @returns A {@link ContractExecutable.DeployResult} describing the result of initializing a new contract
   * instance.
   */
  initialize(
    initialPrivateState: PS,
    ...args: Contract.Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.DeployResult<PS>, E, R>;

  /**
   * Invokes a circuit on deployed instance of the contract.
   * 
   * @param impureCircuitId The circuit to be invoked.
   * @param circuitContext Execution context for `impureCircuitId` including its current onchain and private
   * states.
   * @param args The arguments to supply the circuit.
   * @returns A {@link ContractExecutable.CallResult} describing the result of invoking `impureCircuitId`.
   */
  circuit<K extends Contract.ImpureCircuitId<C> = Contract.ImpureCircuitId<C>>(
    impureCircuitId: K,
    circuitContext: ContractExecutable.CircuitContext<PS>,
    ...args: Contract.Contract.CircuitParameters<C, K>
  ): Effect.Effect<ContractExecutable.CallResult<C, PS, K>, E, R>;
}

export declare namespace ContractExecutable {
  /**
   * The services required as context for executing contracts.
   */
  export type Context = ZKConfiguration | Configuration.Keys | Configuration.Network;

  export type CircuitContext<PS> = {
    readonly address: ContractAddress.ContractAddress;

    readonly contractState: ContractState;

    readonly privateState: PS;

    readonly zswapLocalState?: ZswapLocalState;
  };

  export type DeployResultPublic = {
    readonly contractState: ContractState;
  };
  export type DeployResultPrivate<PS> = {
    readonly signingKey: SigningKey.SigningKey;
    readonly privateState: PS;
    readonly zswapLocalState: ZswapLocalState;
  };
  export type DeployResult<PS> = {
    readonly public: DeployResultPublic;
    readonly private: DeployResultPrivate<PS>;
  };

  export type PartitionedTranscript = [Transcript<AlignedValue> | undefined, Transcript<AlignedValue> | undefined];
  export type CallResultPublic = {
    readonly contractState: StateValue;
    readonly publicTranscript: Op<AlignedValue>[];
    readonly partitionedTranscript: PartitionedTranscript;
  };
  export type CallResultPrivate<C extends Contract.Contract<PS>, PS, K extends Contract.ImpureCircuitId<C>> = {
    readonly input: AlignedValue;
    readonly output: AlignedValue;
    readonly privateTranscriptOutputs: AlignedValue[];
    readonly result: Contract.Contract.CircuitReturnType<C, K>;
    readonly privateState: PS;
    readonly zswapLocalState: ZswapLocalState;
  };
  export type CallResult<C extends Contract.Contract<PS>, PS, K extends Contract.ImpureCircuitId<C>> = {
    readonly public: CallResultPublic;
    readonly private: CallResultPrivate<C, PS, K>;
  };
}

/**
 * An error occurred while executing a constructor, or a circuit, of an executable contract.
 *`
 * @category errors
 */
export type ContractExecutionError =
  | ContractRuntimeError.ContractRuntimeError
  | ContractConfigurationError.ContractConfigurationError
  | ZKConfigurationReadError;

// A function that receives an `Effect`, and captures it within another `Effect` that is bound to some
// specified error and context type.
type Transform<E, R> = <A>(effect: Effect.Effect<A, any, any>) => Effect.Effect<A, E, R>; // eslint-disable-line @typescript-eslint/no-explicit-any

const DEFAULT_CMA_THRESHOLD = 1;

const asLedgerQueryContext = (queryContext: QueryContext): LedgerQueryContext =>
  new LedgerQueryContext(
    new LedgerChargedState(LedgerStateValue.decode(queryContext.state.state.encode())),
    queryContext.address
  );

const partitionTranscript = (
  txContext: QueryContext,
  finalTxContext: QueryContext,
  publicTranscript: Op<AlignedValue>[]
): Either.Either<ContractExecutable.PartitionedTranscript, Error> => {
  const partitionedTranscripts = partitionTranscripts(
    [
      new PreTranscript(
        Array.from(finalTxContext.comIndices).reduce(
          (queryContext, entry) => queryContext.insertCommitment(...entry),
          asLedgerQueryContext(txContext)
        ),
        publicTranscript
      )
    ],
    LedgerParameters.initialParameters()
  );
  return partitionedTranscripts.length === 1
    ? Either.right(partitionedTranscripts[0])
    : Either.left(new Error(`Expected one transcript partition pair, received: ${partitionedTranscripts.length}`));
};

class ContractExecutableImpl<C extends Contract.Contract<PS>, PS, E, R> implements ContractExecutable<C, PS, E, R> {
  compiledContract: CompiledContract<C, PS>;
  transform: Transform<E, R>;

  constructor(compiledContract: CompiledContract<C, PS, never>, transform: Transform<E, R> = identity) {
    this.compiledContract = compiledContract;
    this.transform = transform;
  }

  pipe() {
    return pipeArguments(this, arguments); // eslint-disable-line prefer-rest-params
  }

  initialize(
    initialPrivateState: PS,
    ...args: Contract.Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.DeployResult<PS>, E, R> {
    return Effect.all({
      zkConfigReader: ZKConfiguration.pipe(
        Effect.andThen((zkConfig) => zkConfig.createReader<C, PS>(this.compiledContract))
      ),
      keyConfig: Configuration.Keys,
      contract: this.createContract()
    }).pipe(
      Effect.flatMap(({ zkConfigReader, keyConfig, contract }) =>
        Effect.try({
          try: () => {
            const { currentContractState, currentPrivateState, currentZswapLocalState } = contract.initialState(
              createConstructorContext(initialPrivateState, CoinPublicKey.asHex(keyConfig.coinPublicKey)),
              ...args
            );
            return {
              contractState: currentContractState,
              privateState: currentPrivateState,
              zswapLocalState: decodeZswapLocalState(currentZswapLocalState)
            };
          },
          catch: (err: unknown) =>
            err instanceof CompactError
              ? ContractRuntimeError.make('Failed to initialize contract', err)
              : ContractConfigurationError.make(
                  'Failed to configure constructor context with coin public key', undefined, err)
        }).pipe(
          Effect.flatMap(({ contractState, privateState, zswapLocalState }) =>
            Effect.gen(this, function* () {
              // Add the verifier keys.
              const verifierKeys = yield* zkConfigReader.getVerifierKeys(Contract.getImpureCircuitIds(contract));

              for (const [impureCircuitId, verifierKey] of verifierKeys) {
                const operation = contractState.operation(impureCircuitId);

                if (!operation) {
                  return yield* ContractConfigurationError.make(
                    `Circuit '${impureCircuitId}' is undefined for the given contract state`,
                    contractState
                  );
                }

                try {
                  operation.verifierKey = verifierKey;
                  contractState.setOperation(impureCircuitId, operation);
                } catch (err: unknown) {
                  return yield* ContractConfigurationError.make(
                    `Failed to configure verifier key for circuit '${impureCircuitId}' for the given contract state`,
                    contractState,
                    err
                  );
                }
              }

              // Add the Contract Maintenance Authority (CMA).
              const signingKey = Option.match(keyConfig.getSigningKey(), {
                onSome: identity,
                onNone: () => SigningKey.SigningKey(sampleSigningKey())
              });
              try {
                contractState.maintenanceAuthority = new ContractMaintenanceAuthority(
                  [signatureVerifyingKey(signingKey)],
                  DEFAULT_CMA_THRESHOLD
                );
              } catch (err: unknown) {
                  return yield* ContractConfigurationError.make(
                    `Failed to create a signature verifying key for signing key '${signingKey}'`,
                    contractState,
                    err
                  );
              }

              return {
                public: {
                  contractState
                },
                private: {
                  signingKey,
                  privateState,
                  zswapLocalState
                }
              };
            })
          )
        )
      ),
      this.transform
    );
  }

  circuit<K extends Contract.ImpureCircuitId<C> = Contract.ImpureCircuitId<C>>(
    impureCircuitId: K,
    circuitContext: ContractExecutable.CircuitContext<PS>,
    ...args: Contract.Contract.CircuitParameters<C, K>
  ): Effect.Effect<ContractExecutable.CallResult<C, PS, K>, E, R> {
    return Effect.all({
      keyConfig: Configuration.Keys,
      contract: this.createContract()
    }).pipe(
      Effect.flatMap(({ keyConfig, contract }) =>
        Effect.try({
          try: () => {
            const circuit = contract.impureCircuits[impureCircuitId] as Contract.ImpureCircuit<
              PS,
              Contract.Contract.CircuitReturnType<C, K>
            >;
            if (!circuit) {
              throw new Error(`Circuit ${this.compiledContract.tag}#${impureCircuitId} could not be found.`);
            }
            const initialTxContext = new QueryContext(
              new ChargedState(StateValue.decode(circuitContext.contractState.data.state.encode())),
              circuitContext.address
            );
            return {
              ...circuit(
                {
                  currentPrivateState: circuitContext.privateState,
                  currentZswapLocalState: circuitContext.zswapLocalState
                    ? encodeZswapLocalState(circuitContext.zswapLocalState)
                    : emptyZswapLocalState(CoinPublicKey.asHex(keyConfig.coinPublicKey)),
                  transactionContext: initialTxContext,
                  costModel: CostModel.initialCostModel()
                },
                ...args
              ),
              initialTxContext
            };
          },
          catch: identity
        }).pipe(
          Effect.flatMap(({ initialTxContext, result, context, proofData }) =>
            Effect.gen(function* () {
              return {
                public: {
                  contractState: context.transactionContext.state.state,
                  publicTranscript: proofData.publicTranscript,
                  partitionedTranscript: yield* partitionTranscript(
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
                  privateState: context.currentPrivateState,
                  zswapLocalState: decodeZswapLocalState(context.currentZswapLocalState)
                }
              };
            })
          ),
          Effect.mapError((err) => ContractRuntimeError.make(`Error executing circuit '${impureCircuitId}'`, err))
        )
      ),
      this.transform
    );
  }

  protected createContract(): Effect.Effect<C, ContractRuntimeError.ContractRuntimeError> {
    return (this.contract ??= CompactContextInternal.createContract(this.compiledContract).pipe(
      Effect.mapError((err: unknown) => ContractRuntimeError.make(String(err), err)),
      Effect.cached,
      Effect.runSync
    ));
  }
  private contract?: Effect.Effect<C, ContractRuntimeError.ContractRuntimeError>; // Backing property for `createContract`.
}

/**
 * Takes a Compact compiled contract, and makes it executable.
 *
 * @param compiledContract A {@link CompiledContract}
 * @returns A {@link ContractExecutable} for `compiledContract`.
 * 
 * @category constructors
 */
export const make: <C extends Contract.Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS, never>
) => ContractExecutable<C, PS, ContractExecutionError, ContractExecutable.Context> = <
  C extends Contract.Contract<PS>,
  PS
>(
  compiledContract: CompiledContract<C, PS, never>
) => new ContractExecutableImpl<C, PS, ContractExecutionError, ContractExecutable.Context>(compiledContract);

/**
 * Provides a layer to the executable contract.
 *
 * @category combinators
 */
export const provide: {
  /**
   * @param layer The layer to provide.
   * @returns A function that receives the {@link ContractExecutable} that `layer` should be provided to.
   */
  <LA, LE, LR>(
    layer: Layer.Layer<LA, LE, LR>
  ): <C extends Contract.Contract<PS>, PS, E, R>(
    self: ContractExecutable<C, PS, E, R>
  ) => ContractExecutable<C, PS, E | LE, LR | Exclude<R, LA>>;
  /**
   * @param self The {@link ContractExecutable} that `layer` should be provided with.
   * @param layer The layer to provide.
   */
  <C extends Contract.Contract<PS>, PS, E, R, LA, LE, LR>(
    self: ContractExecutable<C, PS, E, R>,
    layer: Layer.Layer<LA, LE, LR>
  ): ContractExecutable<C, PS, E | LE, LR | Exclude<R, LA>>;
} = dual(
  2,
  <C extends Contract.Contract<PS>, PS, E, R, LA, LE, LR>(
    self: ContractExecutable<C, PS, E, R>,
    layer: Layer.Layer<LA, LE, LR>
  ) =>
    new ContractExecutableImpl<C, PS, E | LE, LR | Exclude<R, LA>>(self.compiledContract, (e) =>
      Effect.provide(e, layer)
    )
);
