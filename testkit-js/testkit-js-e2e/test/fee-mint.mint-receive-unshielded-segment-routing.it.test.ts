/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { createUnprovenCallTx, deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type ContractAddress, sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type ContractConfiguration,
  createLogger,
  type EnvironmentConfiguration,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { CompiledFeeMintContract } from '@/contract';
import { type FeeMintContractCircuit, type FeeMintContractProviders } from '@/types/fee-mint-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `fee_mint_routing_${new Date().toISOString()}.log`)
);

class FeeMintConfiguration implements ContractConfiguration {
  constructor(private suffix = Date.now().toString()) {}

  get privateStateStoreName(): string {
    return `fee-mint-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../dist/contract/compiled/fee-mint');
  }
}

// Regression test for #731 — `mintShieldedToken` + `receiveUnshielded` in the
// same circuit. The root cause (midnightntwrk/midnight-wallet#250, closed as a
// midnight-js bug) was the same segment-routing defect fixed by #876/#877: the
// minted shielded coin was pinned to `DEFAULT_SEGMENT_NUMBER = 0` (guaranteed
// offer), while the circuit's transcript — and the `receiveUnshielded` fee —
// lived entirely in the fallible segment. The wallet balancer then saw an
// unmatched guaranteed delta for a token color it holds no coins of and threw
// `Wallet.InsufficientFunds` (unshielded-only wallet), or the chain rejected
// the mismatched effects with error 186 (`EffectsCheckFailure`).
//
// This test reproduces the exact #731 combo and asserts, directly on the
// constructed `UnprovenTransaction`, that the minted shielded output is routed
// to the SAME (fallible) segment as the unshielded fee — the property #877
// restored. It inspects the unproven transaction rather than relying on the
// wallet balancer's error, so it does not depend on the wallet's shielded vs
// unshielded funding state (the #731 symptom differs by network, but the
// underlying misrouting does not).
describe('Fee-mint segment routing — regression #731', () => {
  const MINT_AMOUNT = 1_000_000n;
  const FEE_AMOUNT = 1_000_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(7);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: FeeMintContractProviders;
  let contractAddress: ContractAddress;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();

    providers = initializeMidnightProviders(wallet, environmentConfiguration, new FeeMintConfiguration());

    const deployTxOptions = {
      compiledContract: CompiledFeeMintContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };

    const deployedContract = await deployContract(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);
    contractAddress = deployedContract.deployTxData.public.contractAddress;

    logger.info(`Deployed FeeMint contract at address: ${contractAddress}`);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('minted shielded output is routed to the same fallible segment as the receiveUnshielded fee', async () => {
    const userKeyHex = wallet.getCoinPublicKey();
    const userKeyBytes = new Uint8Array(Buffer.from(userKeyHex, 'hex'));
    const mintNonce = new Uint8Array(32).fill(99);

    const {
      public: { partitionedTranscript },
      private: { unprovenTx }
    } = await createUnprovenCallTx(providers, {
      compiledContract: CompiledFeeMintContract,
      contractAddress,
      circuitId: 'mintWithUnshieldedFee' as FeeMintContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT, mintNonce, { bytes: userKeyBytes }, FEE_AMOUNT]
    });

    // Pre-condition: the heavy pre-checkpoint writes push the whole circuit
    // into the fallible segment, so there is no guaranteed transcript at all.
    // If this fails the contract is not producing the #731 pre-condition.
    expect(partitionedTranscript[0]).toBeUndefined();
    expect(partitionedTranscript[1]).toBeDefined();

    const fallibleEffects = partitionedTranscript[1]!.effects;

    // The #731 combo lives entirely in the fallible segment: the shielded mint
    // (`mintShieldedToken`) and the unshielded fee (`receiveUnshielded`, which
    // the ledger records as an expected unshielded input) are both here. This
    // distinguishes the test from #876 (mint + send, no unshielded leg).
    expect(fallibleEffects.shieldedMints.size).toBeGreaterThan(0);
    expect(fallibleEffects.unshieldedInputs.size).toBeGreaterThan(0);

    const fallibleClaimedCommitments = [
      ...fallibleEffects.claimedShieldedReceives,
      ...fallibleEffects.claimedShieldedSpends
    ];
    expect(fallibleClaimedCommitments.length).toBeGreaterThan(0);

    // The regression check. Pre-#877 the minted shielded output was pinned to
    // `DEFAULT_SEGMENT_NUMBER = 0`, so it landed in the guaranteed offer even
    // though every effect is fallible — leaving `guaranteedOffer` defined and
    // the offer mismatched against the fallible transcript. Post-#877's
    // `zswapStateToSegmentedOffer` routes the output into the fallible offer.
    expect(unprovenTx.guaranteedOffer).toBeUndefined();
    expect(unprovenTx.fallibleOffer).toBeDefined();

    // The user-bound minted output must appear in the fallible offer and match
    // a shielded commitment claimed by the fallible transcript.
    const fallibleOutputCommitments = Array.from(unprovenTx.fallibleOffer!.values()).flatMap((offer) =>
      offer.outputs.map((o) => o.commitment)
    );
    const matched = fallibleOutputCommitments.find((c) => fallibleClaimedCommitments.includes(c));
    expect(matched).toBeDefined();
  });
});
