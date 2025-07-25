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

import { describe, expect, it } from 'tstyche';
import { Effect, Layer, Context } from 'effect';
import { CompiledContract, ContractExecutable, Contract, ZKConfig } from '@midnight-ntwrk/compact-js/effect';
import type { ContractDeploy } from '@midnight-ntwrk/ledger';
import { Contract as Contract_ } from '../../MockCounter';

type MockCounterContract = Contract_<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const MockCounterContract = Contract_;

class StringDep extends Context.Tag('StringDep')<StringDep, string>() {}

describe('ContractExecutable', () => {
  const compiledContract = CompiledContract.make<MockCounterContract>('MockCounter', MockCounterContract).pipe(
    CompiledContract.withWitnesses({} as Contract.Contract.Witnesses<MockCounterContract>),
    CompiledContract.withZKConfigFileAssets('/Users/hosky/compact_contracts/counter')
  );
  const contractExecutable = ContractExecutable.make(compiledContract);

  describe('as initialized', () => {
    it('should require ZKConfig', () => {
      expect(contractExecutable).type.toBeAssignableWith<
        ContractExecutable.ContractExecutable<MockCounterContract, any, ZKConfig.ZKConfig> // eslint-disable-line @typescript-eslint/no-explicit-any
      >();
    });

    describe('with fully resolved layer', () => {
      const zkConfigLayer = Layer.effect(
        ZKConfig.ZKConfig,
        Effect.sync(() => ({})) as Effect.Effect<ZKConfig.ZKConfig.Service>
      );
      const executable = contractExecutable.pipe(ContractExecutable.provide(zkConfigLayer));

      it('should require no further context', () => {
        expect(executable).type.toBe<
          ContractExecutable.ContractExecutable<MockCounterContract, ContractExecutable.ContractExecutionError, never>
        >();
      });
    });

    describe('with partially resolved layer', () => {
      // The layer requires `StringDep`. When provided, to a ContractExecutable, it (and any Effect's its functions
      // return), should require it.
      const zkConfigLayer = Layer.effect(
        ZKConfig.ZKConfig,
        Effect.sync(() => ({})) as unknown as Effect.Effect<ZKConfig.ZKConfig.Service, never, StringDep>
      );
      const executable = contractExecutable.pipe(ContractExecutable.provide(zkConfigLayer));

      it('should require additional context from the layer', () => {
        expect(executable).type.toBe<
          ContractExecutable.ContractExecutable<
            MockCounterContract,
            ContractExecutable.ContractExecutionError,
            StringDep
          >
        >();
        expect(executable.initialize({})).type.toBe<
          Effect.Effect<
            ContractExecutable.ContractExecutable.Result<ContractDeploy, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
            ContractExecutable.ContractExecutionError,
            StringDep
          >
        >();
      });
    });
  });
});
