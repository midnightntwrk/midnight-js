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

import { Effect, type Layer, Data, Option, Either } from 'effect';
import { dual, identity } from 'effect/Function';
import { type Pipeable, pipeArguments } from 'effect/Pipeable';
import {
  QueryContext as LedgerQueryContext,
  StateValue as LedgerStateValue,
  type Transcript,
  partitionTranscripts,
  PreTranscript,
  LedgerParameters
} from '@midnight-ntwrk/ledger';
import {
  ContractMaintenanceAuthority,
  constructorContext,
  type ContractState,
  sampleSigningKey,
  signatureVerifyingKey,
  CompactError,
  QueryContext,
  emptyZswapLocalState,
  type StateValue,
  type Op,
  type AlignedValue,
  type ZswapLocalState,
  decodeZswapLocalState
} from '@midnight-ntwrk/compact-runtime';
import { type CompiledContract } from './CompiledContract.js';
import * as Contract from './Contract.js';
import { ZKConfiguration, type ZKConfigurationReadError } from './ZKConfiguration.js';
import { KeyConfiguration } from './KeyConfiguration.js';
import * as CoinPublicKey from './CoinPublicKey.js';
import * as CompactContextInternal from './internal/compactContext.js';
import * as SigningKey from './SigningKey.js';
import type * as ContractAddress from './ContractAddress.js';

export interface ContractExecutable<in out C extends Contract.Contract<PS>, PS, out E = never, out R = never>
  extends Pipeable {
  readonly compiledContract: CompiledContract<C, PS>;

  initialize(
    initialPrivateState: PS,
    ...args: Contract.Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.DeployResult<PS>, E, R>;

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
  export type Context = ZKConfiguration | KeyConfiguration;

  export type CircuitContext<PS> = {
    readonly address: ContractAddress.ContractAddress;

    readonly contractState: ContractState;

    readonly privateState: PS;
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
 * A runtime error occurred while executing a constructor, or a circuit, of an executable contract.
 *
 * @category errors
 */
export class ContractRuntimeError extends Data.TaggedError('ContractRuntimeError')<{
  /** A human-readable description of the error. */
  readonly message: string;
  /** Indicates a more specific original cause of the error. */
  readonly cause?: unknown;
}> {
  /**
   * @param message A human-readable description of the runtime error.
   * @param cause The optional cause of the runtime error.
   * @returns A {@link ContractRuntimeError}.
   */
  static make: (message: string, cause?: unknown) => ContractRuntimeError = (message, cause) =>
    new ContractRuntimeError({ message, cause });
}

/**
 * An error occurred while executing a constructor, or a circuit, of an executable contract with regards to
 * its configuration.
 *
 * @category errors
 */
export class ContractConfigurationError extends Data.TaggedError('ContractConfigurationError')<{
  readonly message: string;
  readonly contractState?: ContractState | undefined;
  readonly cause?: unknown;
}> {
  static make: {
    (message: string): ContractConfigurationError;
    (message: string, contractState: ContractState | undefined): ContractConfigurationError;
    (message: string, contractState: ContractState | undefined, cause: unknown): ContractConfigurationError;
  } = (message: string, contractState?: ContractState, cause?: unknown) =>
    new ContractConfigurationError({ message, contractState, cause });
}

/**
 * An error occurred while executing a constructor, or a circuit, of an executable contract.
 *`
 * @category errors
 */
export type ContractExecutionError = ContractRuntimeError | ContractConfigurationError | ZKConfigurationReadError;

// A function that receives an `Effect`, and captures it within another `Effect` that is bound to some
// specified error and context type.
type Transform<E, R> = <A>(effect: Effect.Effect<A, any, any>) => Effect.Effect<A, E, R>; // eslint-disable-line @typescript-eslint/no-explicit-any

const DEFAULT_CMA_THRESHOLD = 1;

const asLedgerQueryContext = (queryContext: QueryContext): LedgerQueryContext =>
  new LedgerQueryContext(LedgerStateValue.decode(queryContext.state.encode()), queryContext.address);

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
    LedgerParameters.dummyParameters()
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
      keyConfig: KeyConfiguration,
      contract: this.createContract()
    }).pipe(
      Effect.flatMap(({ zkConfigReader, keyConfig, contract }) =>
        Effect.try({
          try: () => {
            const { currentContractState, currentPrivateState, currentZswapLocalState } = contract.initialState(
              constructorContext(initialPrivateState, CoinPublicKey.asHex(keyConfig.coinPublicKey)),
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
              contractState.maintenanceAuthority = new ContractMaintenanceAuthority(
                [signatureVerifyingKey(signingKey)],
                DEFAULT_CMA_THRESHOLD
              );

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
      keyConfig: KeyConfiguration,
      contract: this.createContract()
    }).pipe(
      Effect.flatMap(({ keyConfig, contract }) =>
        Effect.try({
          try: () => {
            const circuit = contract.impureCircuits[impureCircuitId] as Contract.ImpureCircuit<
              PS,
              Contract.Contract.CircuitReturnType<C, K>
            >;
            const initialTxContext = new QueryContext(circuitContext.contractState.data, circuitContext.address);
            return {
              ...circuit(
                {
                  originalState: circuitContext.contractState,
                  currentPrivateState: circuitContext.privateState,
                  currentZswapLocalState: emptyZswapLocalState(CoinPublicKey.asHex(keyConfig.coinPublicKey)),
                  transactionContext: initialTxContext
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
                  contractState: context.transactionContext.state,
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

  protected createContract(): Effect.Effect<C, ContractRuntimeError> {
    return (this.contract ??= CompactContextInternal.createContract(this.compiledContract).pipe(
      Effect.mapError((err: unknown) => ContractRuntimeError.make(String(err), err)),
      Effect.cached,
      Effect.runSync
    ));
  }
  private contract?: Effect.Effect<C, ContractRuntimeError>; // Backing property for `createContract`.
}

export const make: <C extends Contract.Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS, never>
) => ContractExecutable<C, PS, ContractExecutionError, ContractExecutable.Context> = <
  C extends Contract.Contract<PS>,
  PS
>(
  compiledContract: CompiledContract<C, PS, never>
) => new ContractExecutableImpl<C, PS, ContractExecutionError, ContractExecutable.Context>(compiledContract);

/**
 * @category combinators
 */
export const provide: {
  <LA, LE, LR>(
    layer: Layer.Layer<LA, LE, LR>
  ): <C extends Contract.Contract<PS>, PS, E, R>(
    self: ContractExecutable<C, PS, E, R>
  ) => ContractExecutable<C, PS, E | LE, LR | Exclude<R, LA>>;
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
