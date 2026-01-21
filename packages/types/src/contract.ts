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

import { type CompiledContract, Contract, type ContractExecutable, ContractExecutableRuntime, 
  ZKConfiguration, ZKConfigurationReadError } from '@midnight-ntwrk/compact-js/effect';
import { ContractAddress } from '@midnight-ntwrk/platform-js';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import { Cause, type ConfigError, ConfigProvider, Effect, Exit,Layer, Option } from 'effect';
import { type ManagedRuntime } from 'effect/ManagedRuntime';

import { type ZKConfigProvider } from './zk-config-provider';

/**
 * Creates a ZK configuration reader by adapting a given {@link ZKConfigProvider}.
 *
 * @param zkConfigProvider The {@link ZKConfigProvider} that is to be adapted.
 * @returns A {@link ZKConfiguration.ZKConfiguration.Reader | ZKConfiguration.Reader} that reads from
 * `zkConfigProvider`.
 *
 * @internal
 */
const makeAdaptedReader = <C extends Contract.Contract<PS>, PS>(zkConfigProvider: ZKConfigProvider<string>) =>
  (compiledContract: CompiledContract.CompiledContract<C, PS>) =>
    Effect.gen(function* () { // eslint-disable-line require-yield
      // TODO: Consider implementing the logic used in Compact.js (look at the contract manifest to determine
      // if the circuit is verifiable). See PM-21376.
      const getVerifierKey = (impureCircuitId: Contract.ImpureCircuitId<C>) =>
        Effect.tryPromise({
          try: () => zkConfigProvider.getVerifierKey(impureCircuitId).then((verifierKey) => Option.some(Contract.VerifierKey(verifierKey))),
          catch: (err: unknown) => ZKConfigurationReadError.make(compiledContract.tag, impureCircuitId, 'verifier-key', err)
        });
      return {
        getVerifierKey,
        getVerifierKeys: (impureCircuitIds) =>
          Effect.forEach(
            impureCircuitIds,
            (impureCircuitId) =>
              getVerifierKey(impureCircuitId).pipe(
                Effect.map((verifierKey) => [impureCircuitId, verifierKey] as const)
              ),
            { concurrency: 'unbounded', discard: false }
          )
      } satisfies ZKConfiguration.ZKConfiguration.Reader<C, PS>
    });

const makeAdaptedRuntimeLayer = (zkConfigProvider: ZKConfigProvider<string>, configMap: Map<string, string>) =>
  Layer.mergeAll(
    Layer.succeed(
      ZKConfiguration.ZKConfiguration,
      ZKConfiguration.ZKConfiguration.of({
        createReader: makeAdaptedReader(zkConfigProvider)
      })
    ),
    Configuration.layer
  ).pipe(
    Layer.provide(
      Layer.setConfigProvider(ConfigProvider.fromMap(configMap, { pathDelim: '_' }).pipe(ConfigProvider.constantCase))
    )
  );

/**
 * Options for use when constructing a Compact.js contract executable runtime.
 */
export type ContractExecutableRuntimeOptions = {
  /** The current user's ZSwap public key. */
  readonly coinPublicKey: string;

  /** The signing key to add as the to-be-deployed contract's maintenance authority. */
  readonly signingKey?: string;
}

/**
 * Constructs an Effect managed runtime configured to execute contract executables.
 *
 * @param zkConfigProvider The {@link ZKConfigProvider} that is to be adapted.
 * @param options Values that will be mapped into and made available within the constructed runtime.
 * @returns An Effect {@link ManagedRuntime} that can be used to execute {@link ContractExecutable} instances.
 */
export const makeContractExecutableRuntime:
  (zkConfigProvider: ZKConfigProvider<string>, options: ContractExecutableRuntimeOptions) => ManagedRuntime<ContractExecutable.ContractExecutable.Context, ConfigError.ConfigError> =
  (zkConfigProvider, options) => {
    let config: readonly [string, string][] = [['KEYS_COIN_PUBLIC', options.coinPublicKey]];
    if (options.signingKey) {
      config = config.concat([['KEYS_SIGNING', options.signingKey]])
    }
    return ContractExecutableRuntime.make(makeAdaptedRuntimeLayer(zkConfigProvider, new Map(config)));
  };

/**
 * Unwraps an Effect `Exit` instance, returning its value if it is successful, or throwing the error contained
 * within it.
 * 
 * @param exit The source Effect `Exit` instance.
 * @returns The value from `exit` if it is successful, otherwise throws the error contained within it.
 */
export const exitResultOrError: <A, E>(exit: Exit.Exit<A, E>) => A =
  (exit) => Exit.match(exit, {
    onSuccess: (a) => a,
    onFailure: (cause) => {
      if (Cause.isFailType(cause)) throw cause.error;
      throw new Error(`Unexpected error: ${Cause.pretty(cause)}`);
    }
  });

/**
 * Wraps an object into an `Option.some`.
 *
 * @param obj The value that should be wrapped into an `Option`.
 * @returns An `Option.some` for `obj`.
 */
export const asEffectOption = <T>(obj: unknown): Option.Option<T> => {
  return Option.some(obj) as Option.Option<T>;
}

/**
 * Constructs a branded contract address from a given string value.
 *
 * @param address A string value representing a contract address.
 * @returns A {@link ContractAddress.ContractAddress | ContractAddress} constructed from `address`.
 */
export const asContractAddress = (address: string): ContractAddress.ContractAddress =>
  ContractAddress.ContractAddress(address);