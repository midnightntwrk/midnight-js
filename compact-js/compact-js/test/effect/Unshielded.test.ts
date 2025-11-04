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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { resolve } from 'node:path';

import { NodeContext } from '@effect/platform-node';
import { describe, expect,it } from '@effect/vitest';
import {
  CompiledContract,
  Contract,
  ContractExecutable,
  ContractExecutableRuntime
} from '@midnight-ntwrk/compact-js/effect';
import { ZKFileConfiguration } from '@midnight-ntwrk/compact-js-node/effect';
import { ContractState, decodeRawTokenType, encodeRawTokenType, rawTokenType } from '@midnight-ntwrk/compact-runtime';
import { ContractDeploy, ContractState as LedgerContractState } from '@midnight-ntwrk/ledger';
import { CoinPublicKey, ContractAddress, DomainSeparator } from '@midnight-ntwrk/platform-js';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import { ConfigProvider, Effect, Layer } from 'effect';

import { UnshieldedContract } from '../contract';
import * as Arbitrary from './Arbitrary.js';

const COUNTER_ASSETS_PATH = resolve(import.meta.dirname, '../contract/managed/unshielded');

const VALID_COIN_PUBLIC_KEY = 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79';

const asLedgerContractState = (contractState: ContractState): LedgerContractState =>
  LedgerContractState.deserialize(contractState.serialize());

const asContractState = (contractState: LedgerContractState): ContractState =>
  ContractState.deserialize(contractState.serialize());

const testLayer = (configMap: Map<string, string>) =>
  Layer.mergeAll(ZKFileConfiguration.layer(COUNTER_ASSETS_PATH), Configuration.layer).pipe(
    Layer.provideMerge(NodeContext.layer),
    Layer.provide(
      Layer.setConfigProvider(ConfigProvider.fromMap(configMap, { pathDelim: '_' }).pipe(ConfigProvider.constantCase))
    )
  );
const runtime = ContractExecutableRuntime.make(testLayer(new Map([['KEYS_COIN_PUBLIC', VALID_COIN_PUBLIC_KEY]])));

const inputsAndOutputs: (
  partitionedTranscript: ContractExecutable.ContractExecutable.PartitionedTranscript
) => readonly [any, any] =
  (partitionedTranscript) => {
    const inputs = partitionedTranscript[0]!.effects.unshieldedInputs.entries()
      .reduce((agg, [tokenType, amount]) => ({
        ...agg,
        [(tokenType as any).raw]: {
          tokenTag: tokenType.tag,
          amount
        }
      }), {});
    const outputs = partitionedTranscript[0]!.effects.unshieldedOutputs.entries()
      .reduce((agg, [tokenType, amount]) => ({
        ...agg,
        [(tokenType as any).raw]: {
          tokenTag: tokenType.tag,
          amount
        }
      }), {});
    return [inputs, outputs] as const;
  };

const spendsAndMints: (
  partitionedTranscript: ContractExecutable.ContractExecutable.PartitionedTranscript
) => readonly [any, any] =
  (partitionedTranscript) => {
    const spends = partitionedTranscript[0]!.effects.claimedUnshieldedSpends.entries()
      .reduce((agg, [[tokenType, address], amount]) => ({
        ...agg,
        [address.address]: {
          addressTag: address.tag,
          tokenTag: tokenType.tag,
          amount
        }
      }), {});
    const mints = partitionedTranscript[0]!.effects.unshieldedMints.entries()
      .reduce((agg, [address, amount]) => ({
        ...agg,
        [address]: amount
      }), {});
    return [spends, mints] as const;
  };

describe('Unshielded Tokens', () => {
  let contract: ContractExecutable.ContractExecutable<UnshieldedContract, undefined, any, any>;
  let deployment: ContractDeploy;
  let domainSep: DomainSeparator.DomainSeparator;

  beforeEach(async () => {
    contract = CompiledContract.make<UnshieldedContract>('UnshieldedContract', UnshieldedContract).pipe(
      CompiledContract.withVacantWitnesses,
      CompiledContract.withCompiledFileAssets(COUNTER_ASSETS_PATH),
      ContractExecutable.make
    );

    const result = await runtime.runPromise(contract.initialize(undefined));
    
    deployment = new ContractDeploy(asLedgerContractState(result.public.contractState));
    domainSep = Arbitrary.getSampleDomainSeparator();
  });

  describe('minting', () => {
    it.effect('should return unshielded spends for a given contract address', () => Effect.gen(function* () {
      const address = Arbitrary.getSampleContractAddress();
      const mintResult = yield* runtime.runFork(contract.circuit(
        Contract.ImpureCircuitId<UnshieldedContract>('mintUnshieldedToContractTest'),
        {
          address: ContractAddress.ContractAddress(deployment.address),
          contractState: asContractState(deployment.initialState),
          privateState: undefined
        },
        DomainSeparator.asBytes(domainSep),
        { bytes: ContractAddress.asBytes(address) },
        1_000n
      ));

      expect(mintResult).toBeDefined();

      const [spends, mints] = spendsAndMints(mintResult.public.partitionedTranscript);

      expect(spends).toMatchObject({
        [address]: {
          addressTag: 'contract',
          tokenTag: 'unshielded',
          amount: 1_000n
        }
      });
      expect(mints).toMatchObject({
        [domainSep]: 1_000n
      });
    }));

    it.effect('should return unshielded spends for a given user address', () => Effect.gen(function* () {
      const mintResult = yield* runtime.runFork(contract.circuit(
        Contract.ImpureCircuitId<UnshieldedContract>('mintUnshieldedToUserTest'),
        {
          address: ContractAddress.ContractAddress(deployment.address),
          contractState: asContractState(deployment.initialState),
          privateState: undefined
        },
        DomainSeparator.asBytes(domainSep),
        { bytes: CoinPublicKey.asBytes(CoinPublicKey.Hex(VALID_COIN_PUBLIC_KEY)) },
        1_000n
      ));

      expect(mintResult).toBeDefined();

      const [spends, mints] = spendsAndMints(mintResult.public.partitionedTranscript);

      expect(spends).toMatchObject({
        [VALID_COIN_PUBLIC_KEY]: {
          addressTag: 'user',
          tokenTag: 'unshielded',
          amount: 1_000n
        }
      });
      expect(mints).toMatchObject({
        [domainSep]: 1_000n
      });
    }));

    it.effect('should return unshielded spends for the deployed contract when minting', () => Effect.gen(function* () {
      const mintResult = yield* runtime.runFork(contract.circuit(
        Contract.ImpureCircuitId<UnshieldedContract>('mintUnshieldedToSelfTest'),
        {
          address: ContractAddress.ContractAddress(deployment.address),
          contractState: asContractState(deployment.initialState),
          privateState: undefined
        },
        DomainSeparator.asBytes(domainSep),
        1_000n
      ));

      expect(mintResult).toBeDefined();

      const [spends, mints] = spendsAndMints(mintResult.public.partitionedTranscript);

      expect(spends).toMatchObject({
        [deployment.address]: {
          addressTag: 'contract',
          tokenTag: 'unshielded',
          amount: 1_000n
        }
      });
      expect(mints).toMatchObject({
        [domainSep]: 1_000n
      });
    }));
  });

  describe('sending', () => {
    it.effect('should return unshielded outputs and spends', () => Effect.gen(function* () {
      const color = encodeRawTokenType(rawTokenType(
        DomainSeparator.asBytes(domainSep),
        Arbitrary.getSampleContractAddress()
      ));
      const spendResult = yield* runtime.runFork(contract.circuit(
        Contract.ImpureCircuitId<UnshieldedContract>('sendUnshieldedToSelfTest'),
        {
          address: ContractAddress.ContractAddress(deployment.address),
          contractState: asContractState(deployment.initialState),
          privateState: undefined
        },
        color,
        1_000n
      ));

      expect(spendResult).toBeDefined();

      const [_, outputs] = inputsAndOutputs(spendResult.public.partitionedTranscript);
      const [spends, mints] = spendsAndMints(spendResult.public.partitionedTranscript);
      const tokenType = decodeRawTokenType(color);

      expect(spends).toMatchObject({
        [deployment.address]: {
          addressTag: 'contract',
          tokenTag: 'unshielded',
          amount: 1_000n
        }
      });
      expect(outputs).toMatchObject({
        [tokenType]: {
          tokenTag: 'unshielded',
          amount: 1_000n
        }
      });
      expect(mints).toMatchObject({});
    }));
  });

  describe('receiving', () => {
    it.effect('should return unshielded inputs', () => Effect.gen(function* () {
      const address = Arbitrary.getSampleContractAddress();
      const color = encodeRawTokenType(rawTokenType(DomainSeparator.asBytes(domainSep), address));
      const spendResult = yield* runtime.runFork(contract.circuit(
        Contract.ImpureCircuitId<UnshieldedContract>('receiveUnshieldedTest'),
        {
          address: ContractAddress.ContractAddress(deployment.address),
          contractState: asContractState(deployment.initialState),
          privateState: undefined
        },
        color,
        1_000n
      ));

      expect(spendResult).toBeDefined();

      const [inputs] = inputsAndOutputs(spendResult.public.partitionedTranscript);
      const [_, mints] = spendsAndMints(spendResult.public.partitionedTranscript);
      const tokenType = decodeRawTokenType(color);

      expect(inputs).toMatchObject({
        [tokenType]: {
          tokenTag: 'unshielded',
          amount: 1_000n
        }
      });
      expect(mints).toMatchObject({});
    }));
  });
});
