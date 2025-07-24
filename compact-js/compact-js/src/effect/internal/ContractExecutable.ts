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

import { Effect, Data, identity, Layer } from 'effect';
import { dual } from 'effect/Function';
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
import * as Contract from '../Contract';
import { Meta, MetaTypeId } from './CompiledContract';
import { ZKConfig, ZKConfigReadError } from '../ZKConfig';
import { pipeArguments } from 'effect/Pipeable';

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
  readonly contractState: LedgerContractState;
}> {
  static make: (message: string, contractState: LedgerContractState) => ContractConfigurationError = (
    message,
    contractState
  ) => new ContractConfigurationError({ message, contractState });
}

/**
 * An error occurred while executing a constructor, or a circuit, of an executable contract.
 *
 * @category errors
 */
export type ContractExecutionError = ContractRuntimeError | ContractConfigurationError | ZKConfigReadError;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Transform<E, R> = (effect: Effect.Effect<any, any, any>) => Effect.Effect<any, E, R>;

/** @internal */
export const make: <C extends Contract.Contract.Any>(
  compiledContract: CompiledContract<C, never>
) => ContractExecutable.ContractExecutable<C, ContractExecutionError, ContractExecutable.ContractExecutable.Context> = <
  C extends Contract.Contract.Any
>(
  compiledContract: CompiledContract<C, never>
) =>
  new ContractExecutableImpl<
    C,
    Contract.Contract.PrivateState<C>,
    ContractExecutionError,
    ContractExecutable.ContractExecutable.Context
  >(compiledContract);

export const provide = dual<
  <LA, LE, LR>(
    layer: Layer.Layer<LA, LE, LR>
  ) => <C extends Contract.Contract.Any, E, R>(
    self: ContractExecutable.ContractExecutable<C, E, R>
  ) => ContractExecutable.ContractExecutable<C, E | LE, LR | Exclude<R, LA>>,
  <C extends Contract.Contract.Any, E, R, LA, LE, LR>(
    self: ContractExecutable.ContractExecutable<C, E, R>,
    layer: Layer.Layer<LA, LE, LR>
  ) => ContractExecutable.ContractExecutable<C, E | LE, LR | Exclude<R, LA>>
>(
  2,
  <C extends Contract.Contract.Any, E, R, LA, LE, LR>(
    self: ContractExecutable.ContractExecutable<C, E, R>,
    layer: Layer.Layer<LA, LE, LR>
  ) =>
    new ContractExecutableImpl<C, Contract.Contract.PrivateState<C>, E | LE, LR | Exclude<R, LA>>(
      self.compiledContract,
      (e) => Effect.provide(e, layer)
    )
);

class ContractExecutableImpl<C extends Contract.Contract<PS>, PS, E, R>
  implements ContractExecutable.ContractExecutable<C, E, R>
{
  compiledContract: CompiledContract<C>;
  transform: Transform<E, R>;

  constructor(compiledContract: CompiledContract<C, never>, transform: Transform<E, R> = identity) {
    this.compiledContract = compiledContract;
    this.transform = transform;
  }

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return pipeArguments(this, arguments);
  }

  initialize(
    privateState: Contract.Contract.PrivateState<C>,
    ...args: Contract.Contract.InitializeParameters<C>
  ): Effect.Effect<
    ContractExecutable.ContractExecutable.Result<ContractDeploy, Contract.Contract.PrivateState<C>>,
    E,
    R
  > {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.transform(
      Effect.all({
        zkConfigReader: ZKConfig.pipe(Effect.andThen((zkConfig) => zkConfig.createReader<C>(this.compiledContract))),
        contract: this.createContract()
      }).pipe(
        Effect.flatMap(({ zkConfigReader, contract }) =>
          Effect.try({
            try: () => {
              // TODO: Inject this, or pass it in?
              const cpk: CoinPublicKey = 'coin-public-key';
              const { currentContractState, currentPrivateState, currentZswapLocalState } = contract.initialState(
                constructorContext(privateState, cpk),
                ...args
              );
              return {
                contractState: asLedgerContractState(currentContractState),
                privateState: currentPrivateState,
                zswapLocalState: currentZswapLocalState
              };
            },
            catch: (err: unknown) => ContractRuntimeError.make(String(err), err)
          }).pipe(
            Effect.flatMap(({ contractState, privateState, zswapLocalState }) =>
              Effect.gen(this, function* () {
                const verifierKeys = yield* zkConfigReader.getVerifierKeys(Contract.getImpureCircuitIds(contract));

                for (const [impureCircuitId, verifierKey] of verifierKeys) {
                  const op = contractState.operation(impureCircuitId);

                  if (!op)
                    return yield* ContractConfigurationError.make(
                      `Circuit '${impureCircuitId}' is undefined`,
                      contractState
                    );

                  op.verifierKey = verifierKey;

                  contractState.setOperation(impureCircuitId, op);
                }

                return {
                  data: new ContractDeploy(contractState),
                  privateState,
                  zswapLocalState
                };
              })
            )
          )
        )
      )
    );
  }

  private contract?: Effect.Effect<C, ContractRuntimeError>; // Backing property for `createContract`.
  protected createContract(): Effect.Effect<C, ContractRuntimeError> {
    return (this.contract ??= Effect.try({
      try: () =>
        new (this.compiledContract as Meta<C>)[MetaTypeId].ctor(
          (this.compiledContract as Meta<C>)[MetaTypeId].witnesses
        ),
      catch: (err: unknown) => ContractRuntimeError.make(String(err), err)
    }).pipe(Effect.cached, Effect.runSync));
  }
}

const asLedgerContractState: (contractState: ContractState) => LedgerContractState = (contractState) =>
  LedgerContractState.deserialize(contractState.serialize(RuntimeNetworkId.Undeployed), LedgerNetworkId.Undeployed);
