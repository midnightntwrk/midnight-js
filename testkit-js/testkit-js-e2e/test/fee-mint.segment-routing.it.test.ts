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

// Regression tests for #731 — minting a shielded token together with a fee
// leg in the SAME circuit. The root cause was filed against the wallet SDK
// (midnightntwrk/midnight-wallet#250) but closed as a midnight-js bug: the
// same segment-routing defect fixed by #876/#877. Pre-#877 the minted shielded
// output was pinned to `DEFAULT_SEGMENT_NUMBER = 0` (guaranteed offer) while
// the circuit transcript and the fee leg lived entirely in the fallible
// segment, so the wallet balancer saw an unmatched delta for a token color it
// holds no coins of (`Wallet.InsufficientFunds`, or chain error 186).
//
// Both fee variants from the issue are covered: the original
// `receiveUnshielded` fee and the `receiveShielded` fee reported by @robbyja
// (which does not sidestep the bug). Each test inspects the constructed
// `UnprovenTransaction` directly rather than the wallet balancer's error, so
// it is independent of the wallet's shielded-vs-unshielded funding state.
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

  // Asserts the property #877 restored: the whole circuit is fallible, and the
  // minted shielded output is routed into the fallible offer (never the
  // guaranteed one) where it matches a shielded commitment claimed by the
  // fallible transcript. Returns the fallible effects so each test can assert
  // its own fee-leg specifics.
  const expectMintRoutedToFallibleSegment = (
    partitionedTranscript: Awaited<ReturnType<typeof createUnprovenCallTx>>['public']['partitionedTranscript'],
    unprovenTx: Awaited<ReturnType<typeof createUnprovenCallTx>>['private']['unprovenTx']
  ) => {
    // The heavy pre-checkpoint writes push the whole circuit into the fallible
    // segment, so there is no guaranteed transcript at all.
    expect(partitionedTranscript[0]).toBeUndefined();
    expect(partitionedTranscript[1]).toBeDefined();

    const fallibleEffects = partitionedTranscript[1]!.effects;
    expect(fallibleEffects.shieldedMints.size).toBeGreaterThan(0);

    const fallibleClaimedCommitments = [
      ...fallibleEffects.claimedShieldedReceives,
      ...fallibleEffects.claimedShieldedSpends
    ];
    expect(fallibleClaimedCommitments.length).toBeGreaterThan(0);

    // Pre-#877 the minted output was pinned to `DEFAULT_SEGMENT_NUMBER = 0`, so
    // it landed in the guaranteed offer even though every effect is fallible.
    // Post-#877 `zswapStateToSegmentedOffer` routes it into the fallible offer.
    expect(unprovenTx.guaranteedOffer).toBeUndefined();
    expect(unprovenTx.fallibleOffer).toBeDefined();

    const fallibleOutputCommitments = Array.from(unprovenTx.fallibleOffer!.values()).flatMap((offer) =>
      offer.outputs.map((o) => o.commitment)
    );
    const matched = fallibleOutputCommitments.find((c) => fallibleClaimedCommitments.includes(c));
    expect(matched).toBeDefined();

    return fallibleEffects;
  };

  test('mintShieldedToken + receiveUnshielded: minted output shares the fallible segment with the unshielded fee', async () => {
    const userKeyBytes = new Uint8Array(Buffer.from(wallet.getCoinPublicKey(), 'hex'));
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

    const fallibleEffects = expectMintRoutedToFallibleSegment(partitionedTranscript, unprovenTx);

    // The unshielded fee (`receiveUnshielded`) is recorded as an expected
    // unshielded input in the same fallible segment as the mint.
    expect(fallibleEffects.unshieldedInputs.size).toBeGreaterThan(0);
  });

  test('mintShieldedToken + receiveShielded: minted output shares the fallible segment with the shielded fee', async () => {
    const userKeyBytes = new Uint8Array(Buffer.from(wallet.getCoinPublicKey(), 'hex'));
    const mintNonce = new Uint8Array(32).fill(123);
    const feeCoin = {
      nonce: new Uint8Array(32).fill(1),
      color: new Uint8Array(32).fill(0),
      value: FEE_AMOUNT
    };

    const {
      public: { partitionedTranscript },
      private: { unprovenTx }
    } = await createUnprovenCallTx(providers, {
      compiledContract: CompiledFeeMintContract,
      contractAddress,
      circuitId: 'mintWithShieldedFee' as FeeMintContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT, mintNonce, { bytes: userKeyBytes }, feeCoin]
    });

    const fallibleEffects = expectMintRoutedToFallibleSegment(partitionedTranscript, unprovenTx);

    // Fully-shielded fee leg: no unshielded effects at all. The received fee
    // coin adds a shielded receive alongside the minted output, so more than
    // one shielded commitment is claimed in the fallible segment.
    expect(fallibleEffects.unshieldedInputs.size).toBe(0);
    const fallibleClaimedCommitments = [
      ...fallibleEffects.claimedShieldedReceives,
      ...fallibleEffects.claimedShieldedSpends
    ];
    expect(fallibleClaimedCommitments.length).toBeGreaterThan(1);
  });
});
