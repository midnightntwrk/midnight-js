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

export const HELLO = 'Hello';

/*

interface CompiledCompactContract {
  initialize<PS>(privateState?: PS): Effect.Effect<ContractDeploy, ExecutionError>;
  invokeImpure(circuitId: CircuitId, ...args: any[]): Effect.Effect<ContractCallPrototype>
}

const CounterContract = CompiledContract.make('Counter', Counter).pipe(
  CompiledContract.withWitnesses({
    ...
  }),
  CompiledContract.withFileSystemAssets('/path/to/files')
);

const CounterContractExecutable = ContractExecutable.make(CounterContract);

CounterContractExecutable.initialize(...)

CounterContract.pipe(
  Effect.map((c) => c.initialize(...))
)
Effect.gen(function* () {
  const c = yield* CounterContract;
  const d = yield* c.initialize(...);

  //

  const d = yield* CounterContractExecutable.initialize(...);
})


const compiledContract = new CompactContract(Counter, "Counter")
  .withFileSystemAssets('path/to/managed')
  .withWitnesses(witnesses)
  .withPrivateState(new Impl(), { defaultInitialState: { }})
  .
  .build();

const c1 = compiledContract.initialize();

const c1 = compiledContract.deploy({...used instead of defaultInitialState...});

const result = await c1.some_circuit(10n, 20n);

const c2 = compiledContract.join(address);

*/
