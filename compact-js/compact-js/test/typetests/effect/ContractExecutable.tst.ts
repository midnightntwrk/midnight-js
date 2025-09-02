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

import { describe, expect, it } from 'tstyche';
import { Effect, Layer, Context } from 'effect';
import {
  CompiledContract,
  ContractExecutable,
  Contract,
  ZKConfiguration
} from '@midnight-ntwrk/compact-js/effect';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import * as NetworkId from '@midnight-ntwrk/platform-js/effect/NetworkId';
import { Contract as Contract_ } from '../../contract/managed/counter/contract/index.cjs';

/* eslint-disable @typescript-eslint/no-explicit-any */

type MockCounterContract = Contract_<any>;
const MockCounterContract = Contract_;

class StringDep extends Context.Tag('StringDep')<StringDep, string>() {}

describe('ContractExecutable', () => {
  const compiledContract = CompiledContract.make<MockCounterContract>('MockCounter', MockCounterContract).pipe(
    CompiledContract.withWitnesses({} as Contract.Contract.Witnesses<MockCounterContract>),
    CompiledContract.withZKConfigFileAssets('/Users/hosky/compact_contracts/counter')
  );
  const contractExecutable = ContractExecutable.make(compiledContract);

  describe('as initialized', () => {
    it('should require ZKConfig and KeyConfig', () => {
      expect(contractExecutable).type.toBeAssignableWith<
        ContractExecutable.ContractExecutable<
          MockCounterContract,
          any,
          ContractExecutable.ContractExecutionError,
          ZKConfiguration.ZKConfiguration | Configuration.Keys
        >
      >();
    });

    describe('with fully resolved layer', () => {
      const layer = Layer.mergeAll(
        Layer.effect(
          ZKConfiguration.ZKConfiguration,
          Effect.sync(() => ({})) as Effect.Effect<ZKConfiguration.ZKConfiguration.Service>
        ),
        Layer.effect(
          Configuration.Keys,
          Effect.sync(() => ({})) as Effect.Effect<Configuration.Configuration.Keys>
        ),
        Layer.effect(
          Configuration.Network,
          Effect.sync(() => NetworkId.make('hosky-devnet'))
        )
      );
      const executable = contractExecutable.pipe(ContractExecutable.provide(layer));

      it('should require no further context', () => {
        expect(executable).type.toBe<
          ContractExecutable.ContractExecutable<
            MockCounterContract,
            any,
            ContractExecutable.ContractExecutionError,
            never
          >
        >();
      });
    });

    describe('with partially resolved layer', () => {
      const layer = Layer.mergeAll(
        Layer.effect(
          ZKConfiguration.ZKConfiguration,
          Effect.sync(() => ({})) as unknown as Effect.Effect<ZKConfiguration.ZKConfiguration.Service, never, StringDep>
        ),
        Layer.effect(
          Configuration.Keys,
          Effect.sync(() => ({})) as Effect.Effect<Configuration.Configuration.Keys>
        ),
        Layer.effect(
          Configuration.Network,
          Effect.sync(() => NetworkId.make('hosky-devnet'))
        )
      );
      const executable = contractExecutable.pipe(ContractExecutable.provide(layer));

      it('should require additional context from the layer', () => {
        expect(executable).type.toBe<
          ContractExecutable.ContractExecutable<
            MockCounterContract,
            any,
            ContractExecutable.ContractExecutionError,
            StringDep
          >
        >();
        expect(executable.initialize({})).type.toBe<
          Effect.Effect<
            ContractExecutable.ContractExecutable.DeployResult<any>,
            ContractExecutable.ContractExecutionError,
            StringDep
          >
        >();
        expect(executable.circuit(Contract.ImpureCircuitId<MockCounterContract>('reset'), {} as any)).type.toBe<
          Effect.Effect<
            ContractExecutable.ContractExecutable.CallResult<
              MockCounterContract,
              any,
              Contract.ImpureCircuitId<MockCounterContract>
            >,
            ContractExecutable.ContractExecutionError,
            StringDep
          >
        >();
      });
    });
  });
});
