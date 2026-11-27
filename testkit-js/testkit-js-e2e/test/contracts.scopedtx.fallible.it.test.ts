/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  deployContract,
  getPublicStates,
  submitCallTx,
  TxFailedError,
  withContractScopedTransaction
} from '@midnightntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnightntwrk/midnight-js-http-client-proof-provider';
import { nodeZkConfigRegistry } from '@midnightntwrk/midnight-js-node-zk-config-provider';
import { type ContractAddress, LedgerParameters, Transaction } from '@midnightntwrk/midnight-js-protocol/v9';
import { ContractState, sampleSigningKey } from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import { FailFallible, SucceedEntirely } from '@midnightntwrk/midnight-js-types';
import {
  createLogger,
  type EnvironmentConfiguration,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnightntwrk/testkit-js';
import { randomBytes } from 'crypto';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { CompiledScopeShapes, CompiledScopeShapesContract } from '../src/contract';
import { type ScopeShapesContract, type ScopeShapesContractProviders } from '../src/types/scope-shapes-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `scoped_tx_fallible_${new Date().toISOString()}.log`)
);

const COMPILED_ROOT = path.resolve(__dirname, '../dist/contract/compiled');

/** Which halves each contract call of a transaction has a transcript in. */
const halvesOf = (transaction: { intents?: Map<number, { actions: unknown[] }> }): [boolean, boolean][] =>
  [...(transaction.intents?.values() ?? [])].flatMap((intent) =>
    intent.actions
      .filter(
        (action): action is { guaranteedTranscript?: unknown; fallibleTranscript?: unknown } =>
          typeof action === 'object' && action !== null && 'fallibleTranscript' in action
      )
      .map((call): [boolean, boolean] => [
        call.guaranteedTranscript !== undefined,
        call.fallibleTranscript !== undefined
      ])
  );

describe('Scoped transactions placed in the fallible section', () => {
  const FORCED_RUNS = 3;
  const NONE = new Uint8Array(32);

  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let providers: ScopeShapesContractProviders;
  let otherProviders: ScopeShapesContractProviders;
  let contractAddress: ContractAddress;

  const sealOnce = (after: Uint8Array, id: Uint8Array) => ({
    compiledContract: CompiledScopeShapesContract,
    contractAddress,
    circuitId: 'sealOnce' as const,
    args: [after, id] as [Uint8Array, Uint8Array]
  });

  /** Whether the contract on chain holds `id` among its seals. */
  const isSealed = async (id: Uint8Array): Promise<boolean> => {
    const read = await providers.publicDataProvider.queryContractState(contractAddress);
    if (read == null) throw new Error('the contract has no state on chain');
    return CompiledScopeShapes.ledger(read.contractState.deserialize({ v9: ContractState }).data).seals.member(id);
  };

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    const suffix = Date.now().toString();
    const proofProvider = httpClientProofProvider({
      url: environmentConfiguration.proofServer,
      zkConfigProvider: await nodeZkConfigRegistry(COMPILED_ROOT)
    });
    const providersOf = (name: string): ScopeShapesContractProviders => ({
      ...initializeMidnightProviders(wallet, environmentConfiguration, {
        privateStateStoreName: `${name}-${suffix}`,
        zkConfigPath: path.join(COMPILED_ROOT, 'scope-shapes')
      }),
      proofProvider
    });
    providers = providersOf('scope-shapes-fallible-private-state');
    otherProviders = providersOf('scope-shapes-other-party-private-state');
    const deployOptions = {
      compiledContract: CompiledScopeShapesContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };
    const deployed = await deployContract(providers, deployOptions);
    await expectSuccessfulDeployTx(providers, deployed.deployTxData, deployOptions);
    contractAddress = deployed.deployTxData.public.contractAddress;
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('should land two dependent calls whole in the fallible section of one transaction [@slow]', async () => {
    const first = new Uint8Array(randomBytes(32));
    const second = new Uint8Array(randomBytes(32));

    // The second call succeeds only on the state the first left: it seals `second` after `first`.
    const callTxData = await withContractScopedTransaction<ScopeShapesContract>(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, sealOnce(NONE, first), txCtx);
        await submitCallTx(providers, sealOnce(first, second), txCtx);
      },
      { inFallibleSection: true }
    );

    expect(callTxData.public.status).toBe(SucceedEntirely);
    // The transaction that landed holds both calls in the fallible half of one intent and no guaranteed transcript.
    const landed = callTxData.public.tx.deserialize({ v9: Transaction });
    expect(halvesOf(landed)).toEqual([
      [false, true],
      [false, true]
    ]);
    const built = callTxData.private.unprovenTx.deserialize({ v9: Transaction });
    expect([...built.intents!.keys()]).toHaveLength(1);
    expect(built.guaranteedOffer).toBeUndefined();
    expect(await isSealed(first)).toBe(true);
    expect(await isSealed(second)).toBe(true);
  }, 300_000);

  test.each(Array.from({ length: FORCED_RUNS }, (_, run) => run + 1))(
    "should fail whole, one fee paid and nothing of either call kept, when another party's transaction lands between the calls running and the scope submitting, run %i of 3 [@slow]",
    async () => {
      const first = new Uint8Array(randomBytes(32));
      const second = new Uint8Array(randomBytes(32));

      const error = await withContractScopedTransaction<ScopeShapesContract>(
        providers,
        async (txCtx) => {
          await submitCallTx(providers, sealOnce(NONE, first), txCtx);
          await submitCallTx(providers, sealOnce(first, second), txCtx);
          // Another party seals `second` before the scope submits, so the scope's second call fails on chain.
          const other = await submitCallTx(otherProviders, sealOnce(NONE, second));
          expect(other.public.status).toBe(SucceedEntirely);
        },
        { inFallibleSection: true }
      ).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TxFailedError);
      const { record } = error as TxFailedError;
      expect(record.status).toBe(FailFallible);
      // The transaction landed in a block, so its fee was paid; the ledger's fee for it is not zero.
      if (record.era !== 'v9') throw new Error('the failed transaction is not a ledger 9 transaction');
      const { ledgerParameters } = await getPublicStates(providers.publicDataProvider, contractAddress);
      const params = ledgerParameters.deserialize({ v9: LedgerParameters });
      expect(record.tx.deserialize({ v9: Transaction }).fees(params)).toBeGreaterThan(0n);
      expect(halvesOf(record.tx.deserialize({ v9: Transaction }))).toEqual([
        [false, true],
        [false, true]
      ]);
      // Nothing of either call is kept: the first call's seal is not on chain; only the other party's seal is.
      expect(await isSealed(first)).toBe(false);
      expect(await isSealed(second)).toBe(true);
      expect((error as TxFailedError).pendingPrivateStates).toEqual([]);
    },
    300_000
  );
});
