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
import { CompiledContract, type Contract, type CompactContext } from '@midnight-ntwrk/compact-js/effect';
import { Contract as Contract_ } from '../../contract/managed/counter/contract/index.cjs';

/* eslint-disable @typescript-eslint/no-explicit-any */

type MockCounterContract = Contract_<any>;
const MockCounterContract = Contract_;

describe('CompiledContract', () => {
  const compiledContract = CompiledContract.make<MockCounterContract>('MockCounter', MockCounterContract);

  describe('as initialized', () => {
    it('should require witnesses as defined by contract', () => {
      expect(compiledContract).type.toBeAssignableWith<
        CompiledContract.CompiledContract<MockCounterContract, any, CompactContext.Witnesses<MockCounterContract>>
      >();
    });

    it('should require ZK path configuration', () => {
      expect(compiledContract).type.toBeAssignableWith<
        CompiledContract.CompiledContract<MockCounterContract, any, CompactContext.ZKConfigAssetsPath>
      >();
    });

    describe('with resolved witnesses', () => {
      const contract = compiledContract.pipe(
        CompiledContract.withWitnesses({} as Contract.Contract.Witnesses<MockCounterContract>)
      );

      it('should not require further witnesses', () => {
        expect(contract).type.not.toBeAssignableWith<
          CompiledContract.CompiledContract<MockCounterContract, any, CompactContext.Witnesses<MockCounterContract>>
        >();
      });
    });

    describe('with resolved ZK path configuration', () => {
      const contract = compiledContract.pipe(CompiledContract.withZKConfigFileAssets('~/contracts'));

      it('should not require further witnesses', () => {
        expect(contract).type.not.toBeAssignableWith<
          CompiledContract.CompiledContract<MockCounterContract, any, CompactContext.ZKConfigAssetsPath>
        >();
      });
    });

    describe('as fully resolved', () => {
      const contract = compiledContract.pipe(
        CompiledContract.withWitnesses({} as Contract.Contract.Witnesses<MockCounterContract>),
        CompiledContract.withZKConfigFileAssets('/Users/hosky/compact_contracts/counter')
      );

      it('should require no further context', () => {
        expect(contract).type.toBe<CompiledContract.CompiledContract<MockCounterContract, any, never>>();
      });
    });
  });
});
