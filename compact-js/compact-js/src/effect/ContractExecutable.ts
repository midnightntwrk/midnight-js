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

import { Effect, Layer, Data, Option } from 'effect';
import { dual, identity } from 'effect/Function';
import { Pipeable, pipeArguments } from 'effect/Pipeable';
import {
  ContractDeploy,
  ContractState as LedgerContractState,
  NetworkId as LedgerNetworkId,
  ContractMaintenanceAuthority
} from '@midnight-ntwrk/ledger';
import {
  constructorContext,
  ContractState,
  NetworkId as RuntimeNetworkId,
  EncodedZswapLocalState,
  sampleSigningKey,
  signatureVerifyingKey
} from '@midnight-ntwrk/compact-runtime';
import { CompiledContract } from './CompiledContract';
import { Contract, getImpureCircuitIds } from './Contract';
import { ZKConfiguration, ZKConfigurationReadError } from './ZKConfiguration';
import { KeyConfiguration } from './KeyConfiguration';
import * as CoinPublicKey from './CoinPublicKey';
import * as CompactContextInternal from './internal/compactContext';
import * as SigningKey from './SigningKey';

export interface ContractExecutable<in out C extends Contract<PS>, PS, out E = never, out R = never> extends Pipeable {
  readonly compiledContract: CompiledContract<C, PS>;

  initialize(
    privateState: PS,
    ...args: Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.Result<ContractExecutable.DeployState, PS>, E, R>;
}

export declare namespace ContractExecutable {
  /**
   * The services required as context for executing contracts.
   */
  export type Context = ZKConfiguration | KeyConfiguration;

  export type DeployState = {
    /**
     * The initial state of the contract.
     */
    readonly contractState: ContractDeploy;

    /**
     * The signing key that was used to create the Contract Maintenance Authority (CMA) associated
     * with the deployment.
     *
     * @remarks
     * This signing key should be re-used in all future maintenance activities for the contract.
     */
    readonly signingKey: SigningKey.SigningKey;
  };

  export type Result<T, PS> = {
    readonly data: T;

    readonly privateState: PS;

    readonly zswapLocalState: EncodedZswapLocalState;
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
  readonly contractState: LedgerContractState;
  readonly cause?: unknown;
}> {
  static make: (message: string, contractState: LedgerContractState, cause?: unknown) => ContractConfigurationError = (
    message,
    contractState,
    cause
  ) => new ContractConfigurationError({ message, contractState, cause });
}

/**
 * An error occurred while executing a constructor, or a circuit, of an executable contract.
 *`
 * @category errors
 */
export type ContractExecutionError = ContractRuntimeError | ContractConfigurationError | ZKConfigurationReadError;

export const make: <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS, never>
) => ContractExecutable<C, PS, ContractExecutionError, ContractExecutable.Context> = <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS, never>
) => new ContractExecutableImpl<C, PS, ContractExecutionError, ContractExecutable.Context>(compiledContract);

/**
 * @category combinators
 */
export const provide: {
  <LA, LE, LR>(
    layer: Layer.Layer<LA, LE, LR>
  ): <C extends Contract<PS>, PS, E, R>(
    self: ContractExecutable<C, PS, E, R>
  ) => ContractExecutable<C, PS, E | LE, LR | Exclude<R, LA>>;
  <C extends Contract<PS>, PS, E, R, LA, LE, LR>(
    self: ContractExecutable<C, PS, E, R>,
    layer: Layer.Layer<LA, LE, LR>
  ): ContractExecutable<C, PS, E | LE, LR | Exclude<R, LA>>;
} = dual(
  2,
  <C extends Contract<PS>, PS, E, R, LA, LE, LR>(
    self: ContractExecutable<C, PS, E, R>,
    layer: Layer.Layer<LA, LE, LR>
  ) =>
    new ContractExecutableImpl<C, PS, E | LE, LR | Exclude<R, LA>>(self.compiledContract, (e) =>
      Effect.provide(e, layer)
    )
);

// A function that receives an `Effect`, and captures it within another `Effect` that is bound to some
// specified error and context type.
type Transform<E, R> = <A>(effect: Effect.Effect<A, any, any>) => Effect.Effect<A, E, R>; // eslint-disable-line @typescript-eslint/no-explicit-any

class ContractExecutableImpl<C extends Contract<PS>, PS, E, R> implements ContractExecutable<C, PS, E, R> {
  compiledContract: CompiledContract<C, PS>;
  transform: Transform<E, R>;

  constructor(compiledContract: CompiledContract<C, PS, never>, transform: Transform<E, R> = identity) {
    this.compiledContract = compiledContract;
    this.transform = transform;
  }

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return pipeArguments(this, arguments);
  }

  initialize(
    privateState: PS,
    ...args: Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.Result<ContractExecutable.DeployState, PS>, E, R> {
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
              constructorContext(privateState, CoinPublicKey.asHex(keyConfig.coinPublicKey)),
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
              // Add the verifier keys.
              const verifierKeys = yield* zkConfigReader.getVerifierKeys(getImpureCircuitIds(contract));

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
                1
              );

              return {
                data: { contractState: new ContractDeploy(contractState), signingKey },
                privateState,
                zswapLocalState
              };
            })
          )
        )
      ),
      this.transform
    );
  }

  protected createContract(): Effect.Effect<C, ContractRuntimeError> {
    return (this.contract ??= CompactContextInternal.makeContractInstance(
      this.compiledContract[CompactContextInternal.CompactContextId]
    ).pipe(
      Effect.mapError((err: unknown) => ContractRuntimeError.make(String(err), err)),
      Effect.cached,
      Effect.runSync
    ));
  }
  private contract?: Effect.Effect<C, ContractRuntimeError>; // Backing property for `createContract`.
}

const asLedgerContractState: (contractState: ContractState) => LedgerContractState = (contractState) =>
  LedgerContractState.deserialize(contractState.serialize(RuntimeNetworkId.Undeployed), LedgerNetworkId.Undeployed);
