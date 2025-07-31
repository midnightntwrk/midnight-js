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

import { ConfigProvider, Console, Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from '@effect/vitest';
import { NodeContext } from '@effect/platform-node';
import {
  CompiledContract,
  ContractExecutable,
  Contract,
  KeyConfiguration,
  ZKFileConfiguration,
  ContractAddress
} from '@midnight-ntwrk/compact-js/effect';
import { ContractState, sampleSigningKey, NetworkId as RuntimeNetworkId } from '@midnight-ntwrk/compact-runtime';
import {
  ContractState as LedgerContractState,
  NetworkId as LedgerNetworkId,
  ContractDeploy
} from '@midnight-ntwrk/ledger';
import { resolve } from 'node:path';
import { CounterContract } from '../contract';

const COUNTER_ASSETS_PATH = resolve(import.meta.dirname, '../contract/managed/counter');

const VALID_COIN_PUBLIC_KEY = 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79';
const INVALID_COIN_PUBLIC_KEY = 'INVALIDd9da5fcd4c601';
const VALID_SIGNING_KEY = sampleSigningKey();

const testLayer = (configMap: Map<string, string>) =>
  Layer.mergeAll(ZKFileConfiguration.layer, KeyConfiguration.layer).pipe(
    Layer.provideMerge(NodeContext.layer),
    Layer.provide(
      Layer.setConfigProvider(ConfigProvider.fromMap(configMap, { pathDelim: '_' }).pipe(ConfigProvider.constantCase))
    )
  );

describe('ContractExecutable', () => {
  const initialPS = { count: 0 };
  const counterContract = CompiledContract.make<CounterContract>('Counter', CounterContract).pipe(
    CompiledContract.withWitnesses({
      private_increment: ({ privateState }) => [{ count: privateState.count + 1 }, []]
    }),
    CompiledContract.withZKConfigFileAssets(COUNTER_ASSETS_PATH),
    ContractExecutable.make
  );

  describe('initialize', () => {
    it.effect('should initialize a new instance', () =>
      Effect.gen(function* () {
        const contract = counterContract.pipe(
          ContractExecutable.provide(testLayer(new Map([['KEYS_COIN_PUBLIC', VALID_COIN_PUBLIC_KEY]])))
        );
        const result = yield* contract.initialize(initialPS);

        expect(result.public.contractState).toBeDefined();
        expect(result.public.contractState.data).toBeDefined();
        expect(result.private.signingKey).toBeDefined();
        expect(result.private.privateState).toMatchObject(initialPS);
      })
    );

    it.effect('should return the given signing key', () =>
      Effect.gen(function* () {
        const contract = counterContract.pipe(
          ContractExecutable.provide(
            testLayer(
              new Map([
                ['KEYS_COIN_PUBLIC', VALID_COIN_PUBLIC_KEY],
                ['KEYS_SIGNING', VALID_SIGNING_KEY]
              ])
            )
          )
        );
        const initialPS = { count: 0 };
        const result = yield* contract.initialize(initialPS);

        expect(result.public.contractState).toBeDefined();
        expect(result.private.signingKey).toBe(VALID_SIGNING_KEY);
      })
    );

    it.effect('should fail with an invalid CoinPublicKey', () =>
      Effect.gen(function* () {
        const contract = counterContract.pipe(
          ContractExecutable.provide(testLayer(new Map([['KEYS_COIN_PUBLIC', INVALID_COIN_PUBLIC_KEY]])))
        );
        const error = yield* contract.initialize({ count: 0 }).pipe(Effect.flip);

        expect(error).toBeInstanceOf(ContractExecutable.ContractConfigurationError);
        expect((error as ContractExecutable.ContractConfigurationError).cause).toBeInstanceOf(Error);
      })
    );
  });

  describe('circuits', () => {
    let contract: ContractExecutable.ContractExecutable<
      CounterContract,
      Contract.Contract.PrivateState<CounterContract>,
      unknown
    >;
    let deployment: ContractDeploy;

    // Create and initialize a new contract instance for each test.
    beforeEach(async () => {
      contract = counterContract.pipe(
        ContractExecutable.provide(testLayer(new Map([['KEYS_COIN_PUBLIC', VALID_COIN_PUBLIC_KEY]])))
      );
      const result = await contract.initialize({ count: 0 }).pipe(Effect.runPromise);
      deployment = new ContractDeploy(asLedgerContractState(result.public.contractState));
    });

    it.effect('should return updated contract state', () =>
      Effect.gen(function* () {
        const result = yield* contract.circuit(Contract.ImpureCircuitId<CounterContract>('increment'), {
          address: ContractAddress.ContractAddress(deployment.address),
          contractState: asContractState(deployment.initialState),
          privateState: { count: 0 }
        });

        expect(result.public.contractState).toBeDefined();
        expect(result.private.privateState).toMatchObject({ count: 1 });
      })
    );
  });
});

const asLedgerContractState = (contractState: ContractState): LedgerContractState =>
  LedgerContractState.deserialize(contractState.serialize(RuntimeNetworkId.Undeployed), LedgerNetworkId.Undeployed);

const asContractState = (contractState: LedgerContractState): ContractState =>
  ContractState.deserialize(contractState.serialize(LedgerNetworkId.Undeployed), RuntimeNetworkId.Undeployed);
