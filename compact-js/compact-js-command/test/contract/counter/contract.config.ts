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

import { CompiledContract, type Contract,ContractExecutable } from '@midnight-ntwrk/compact-js/effect';

import { Contract as C_ } from '../../../../compact-js/test/contract/managed/counter/contract/index.cjs';

type PrivateState = {
  count: number;
};

type CounterContract = C_<PrivateState>;
const CounterContract = C_;

const witnesses: Contract.Contract.Witnesses<CounterContract> = {
  private_increment: ({ privateState }) => [{ count: privateState.count + 1 }, []]
}

const createInitialPrivateState: () => PrivateState = () => ({
  count: 0
});

export default {
  contractExecutable: CompiledContract.make<CounterContract>('CounterContract', CounterContract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets('../../../../compact-js/test/contract/managed/counter'),
    ContractExecutable.make
  ),
  createInitialPrivateState,
  config: {
    keys: {
      coinPublic: 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79',
    },
    network: 'undeployed'
  }
}
