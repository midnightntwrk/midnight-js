/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import {
  type CallTxOptions,
  createUnprovenCallTx,
  deployContract,
  Ledger9ScopeOutsideTimeToDismissError,
  submitCallTx,
  withContractScopedTransaction
} from '@midnightntwrk/midnight-js-contracts';
import { Transaction } from '@midnightntwrk/midnight-js-protocol/v9';
import { type ContractAddress, ContractState, sampleSigningKey } from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import { type ProofProvider } from '@midnightntwrk/midnight-js-types';
import {
  type ContractConfiguration,
  createLogger,
  type EnvironmentConfiguration,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnightntwrk/testkit-js';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  CompiledShieldedFallible,
  CompiledShieldedFallibleContract
} from '../src/contract';
import {
  type ShieldedFallibleContract,
  type ShieldedFallibleContractCircuit,
  type ShieldedFallibleContractProviders
} from '../src/types/shielded-fallible-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `shielded_fallible_routing_${new Date().toISOString()}.log`)
);

class ShieldedFallibleConfiguration implements ContractConfiguration {
  constructor(private suffix = Date.now().toString()) {}

  get privateStateStoreName(): string {
    return `shielded-fallible-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../dist/contract/compiled/shielded-fallible');
  }
}

// Regression test for #876. Pre-#877, `midnight-js-contracts` pinned every
// shielded coin to `DEFAULT_SEGMENT_NUMBER = 0` in `zswapStateToOffer`, so a
// user-bound `ZswapOutput` emitted from a fallible-segment circuit was placed
// in the guaranteed `ZswapOffer` of the resulting `UnprovenTransaction`,
// regardless of the partitioned transcript. The post-#877 routing puts the
// output in the fallible offer when its commitment is in
// `partitionedTranscript[1].claimedShieldedReceives ∪ claimedShieldedSpends`.
//
// The test deploys a contract whose circuit reads chain state (via
// `Set.member`) before minting + sending a shielded coin to the wallet user.
// The state read forces the entire circuit into the fallible segment, so the
// matching `ZswapOutput` must land in the fallible offer of the constructed
// `UnprovenTransaction`. The assertion inspects the unproven transaction
// directly — it does not depend on the wallet balancer rejecting an
// inconsistent offer, which is the user-visible symptom but not the
// underlying bug.
describe('Shielded segment routing — regression #876', () => {
  const MINT_AMOUNT = 1_000_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(7);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: ShieldedFallibleContractProviders;
  let contractAddress: ContractAddress;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();

    providers = initializeMidnightProviders(wallet, environmentConfiguration, new ShieldedFallibleConfiguration());

    const deployTxOptions = {
      compiledContract: CompiledShieldedFallibleContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };

    const deployedContract = await deployContract(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);
    contractAddress = deployedContract.deployTxData.public.contractAddress;

    logger.info(`Deployed ShieldedFallible contract at address: ${contractAddress}`);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('user-bound shielded coin lands in the fallible offer when the circuit is fallible', async () => {
    const userKeyHex = wallet.getCoinPublicKey();
    const userKeyBytes = new Uint8Array(Buffer.from(userKeyHex, 'hex'));
    const mintNonce = new Uint8Array(32).fill(99);

    const { public: { partitionedTranscript }, private: { unprovenTx: unprovenTxHandle } } = await createUnprovenCallTx(providers, {
      compiledContract: CompiledShieldedFallibleContract,
      contractAddress,
      circuitId: 'heavyCheckpointMintAndSend' as ShieldedFallibleContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT, mintNonce, { bytes: userKeyBytes }, MINT_AMOUNT]
    });
    const unprovenTx = unprovenTxHandle.deserialize({ v9: Transaction });

    // Sanity: the runtime put every shielded effect in the fallible half of
    // the transcript and produced no guaranteed transcript at all. This is
    // the exact transcript shape from the original #876 report
    // (`guaranteed_transcript: None`, `fallible_transcript: Some(...)`).
    // If these fail the contract isn't producing the pre-condition for #876.
    expect(partitionedTranscript[0]).toBeUndefined();
    expect(partitionedTranscript[1]).toBeDefined();
    const fallibleClaimedCommitments = [
      ...partitionedTranscript[1]!.effects.claimedShieldedReceives,
      ...partitionedTranscript[1]!.effects.claimedShieldedSpends
    ];
    expect(fallibleClaimedCommitments.length).toBeGreaterThan(0);

    // The regression check. Pre-#877 `createUnprovenLedgerCallTx` always
    // routes shielded outputs into the guaranteed offer (hardcoded
    // `DEFAULT_SEGMENT_NUMBER = 0`), so `unprovenTx.fallibleOffer` is
    // `undefined` even though the transcript only contains fallible
    // effects — the wallet balancer then rejects the unmatched guaranteed
    // delta with `Wallet.InsufficientFunds`. Post-#877's
    // `zswapStateToSegmentedOffer` places the output in the fallible offer
    // by matching its commitment to `claimedShieldedReceives ∪
    // claimedShieldedSpends`.
    expect(unprovenTx.fallibleOffer).toBeDefined();
    // The user-bound output's commitment must appear in the fallible offer
    // and the same commitment must be in the fallible-transcript spends
    // (`sendShielded` emits `claimedShieldedSpends`). Contract-owned mint
    // outputs appear only as `claimedShieldedReceives` and are typically
    // consumed as same-segment transients, so we don't assert on receives.
    const fallibleOutputCommitments = Array.from(unprovenTx.fallibleOffer!.values())
      .flatMap((offer) => offer.outputs.map((o) => o.commitment));
    const matchedSpend = fallibleOutputCommitments.find((c) =>
      partitionedTranscript[1]!.effects.claimedShieldedSpends.includes(c)
    );
    expect(matchedSpend).toBeDefined();
    expect(unprovenTx.guaranteedOffer).toBeUndefined();
  });

  // A scope of two or more calls lands whole or not at all: a call the partitioner placed wholly in
  // the fallible half is moved whole into the guaranteed half before anything is proven.
  const SCOPE_CALLS_OVER_TIME_TO_DISMISS = 3;
  let nextNonce = 100;

  const heavyCall = (): CallTxOptions<ShieldedFallibleContract, 'heavyCheckpointMintAndSend'> => ({
    compiledContract: CompiledShieldedFallibleContract,
    contractAddress,
    circuitId: 'heavyCheckpointMintAndSend',
    args: [
      DOMAIN_SEPARATOR,
      MINT_AMOUNT,
      new Uint8Array(32).fill(nextNonce++),
      { bytes: new Uint8Array(Buffer.from(wallet.getCoinPublicKey(), 'hex')) },
      MINT_AMOUNT
    ]
  });

  const countersSize = async () => {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    return CompiledShieldedFallible.ledger(state!.contractState.deserialize({ v9: ContractState }).data).counters.size();
  };

  test('refuses a scope over the time to dismiss before any proof is made, and submits nothing [@slow]', async () => {
    const sizeBefore = await countersSize();
    let proofs = 0;
    const countingProofProvider: ProofProvider = {
      supportedEras: providers.proofProvider.supportedEras,
      proveTx: (unprovenTx, config) => {
        proofs += 1;
        return providers.proofProvider.proveTx(unprovenTx, config);
      }
    };
    const countingProviders: ShieldedFallibleContractProviders = { ...providers, proofProvider: countingProofProvider };

    await expect(
      withContractScopedTransaction<ShieldedFallibleContract>(countingProviders, async (txCtx) => {
        for (let call = 0; call < SCOPE_CALLS_OVER_TIME_TO_DISMISS; call += 1) {
          await submitCallTx(countingProviders, heavyCall(), txCtx);
        }
      })
    ).rejects.toBeInstanceOf(Ledger9ScopeOutsideTimeToDismissError);

    expect(proofs).toBe(0);
    expect(await countersSize()).toEqual(sizeBefore);
  });
});
