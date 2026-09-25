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

import { readFileSync } from 'node:fs';

import { deployContract, Ledger8, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type { ZkConfigIntegrityOptions } from '@midnight-ntwrk/midnight-js-utils';
import {
  type ContractConfiguration,
  createLogger,
  type EnvironmentConfiguration,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { SLOW_TEST_TIMEOUT, VERY_SLOW_TEST_TIMEOUT } from '../src/constants';
import { Contract as RetainedBlockTimeContract } from '../src/contract/compiled-retained/block-time/contract/index.js';
import { Contract as RetainedUnshieldedContract } from '../src/contract/compiled-retained/unshielded/contract/index.js';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `retained_call_${new Date().toISOString()}.log`)
);

/**
 * Retained-era contract calls against a live pre-fork chain, driven by the `v8era`
 * image set the `.v8era.` filename selects.
 *
 * Two twins: `unshielded` reads `CallContext.balance`, `block-time` reads
 * `CallContext.secondsSinceEpoch`. Which contracts earn a twin, what the
 * assertions have to be, and where the artifacts come from:
 *
 * @see docs/architecture/retained-era-coverage.md
 */

/** The runtime version a retained-era artifact set declares; the era is read off this. */
const RETAINED_RUNTIME_VERSION = '0.16.0';

/** The specifier the build step points a twin's emitted module at. */
const RETAINED_RUNTIME_SPECIFIER = 'compact-runtime-ledger8';

const retainedArtifactPath = (twin: string): string =>
  path.resolve(__dirname, '../src/contract/compiled-retained', twin);

class RetainedConfiguration implements ContractConfiguration {
  constructor(
    private readonly twin: string,
    private readonly suffix = Date.now().toString()
  ) {}

  get privateStateStoreName(): string {
    return `retained-${this.twin}-private-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return retainedArtifactPath(this.twin);
  }

  /** `compactc` 0.31.1 emits no manifest, so the default `require` mode has nothing to read. */
  get zkConfigIntegrity(): ZkConfigIntegrityOptions {
    return { verify: 'warn' };
  }
}

const currentTimeSeconds = (): bigint => BigInt(Math.floor(Date.now() / 1_000));

// `undefined` rather than the generated default of `any`, which would leave every
// circuit argument below unchecked. Neither twin declares a witness.
const unshieldedContract = new RetainedUnshieldedContract<undefined>({});
const blockTimeContract = new RetainedBlockTimeContract<undefined>({});

type RetainedProviders<C extends Ledger8.Contract> = Ledger8.ContractProviders<C, Ledger8.CircuitId<C>>;

describe('Retained-era contract calls on a pre-fork (ledger v8) network', () => {
  const MINT_DOMAIN_SEPARATOR = new Uint8Array(32).fill(1);
  const NEVER_MINTED_COLOUR = new Uint8Array(32).fill(2);
  const MINT_AMOUNT = 1_000_000n;
  const BLOCK_TIME_BUFFER_SECONDS = 60n;

  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let userAddressBytes: Uint8Array;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    userAddressBytes = new Uint8Array(Buffer.from((await wallet.wallet.unshielded.getAddress()).hexString, 'hex'));
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment?.shutdown();
  }, VERY_SLOW_TEST_TIMEOUT);

  describe('preconditions', () => {
    // Both ways of silently not exercising the retained pipeline -- a current-era
    // chain, or a current-era artifact set -- leave the rest of this file green.
    test('the network under test is a pre-fork one', async () => {
      // Arrange.
      const providers = initializeMidnightProviders(
        wallet,
        environmentConfiguration,
        new RetainedConfiguration('unshielded')
      );

      // Act.
      const protocolVersion = await providers.publicDataProvider.queryLatestProtocolVersion();

      // Assert.
      expect({ era: versionOfRecord({ protocolVersion }), protocolVersion }).toEqual({
        era: 'v8',
        protocolVersion
      });
    });

    test.each(['unshielded', 'block-time'])(
      'the %s twin is a retained-era artifact set wired to the retained runtime',
      (twin) => {
        // Arrange.
        const twinDir = retainedArtifactPath(twin);
        const contractInfo: unknown = JSON.parse(
          readFileSync(path.join(twinDir, 'compiler', 'contract-info.json'), 'utf8')
        );
        const emitted = readFileSync(path.join(twinDir, 'contract', 'index.js'), 'utf8');

        // Assert: `resolveArtifactEra` reads the era off this field.
        expect(contractInfo).toMatchObject({ 'runtime-version': RETAINED_RUNTIME_VERSION });
        expect(emitted).toContain(`from '${RETAINED_RUNTIME_SPECIFIER}'`);
        expect(emitted).not.toContain("from '@midnight-ntwrk/compact-runtime'");
      }
    );
  });

  describe('unshielded: CallContext.balance', () => {
    let contractAddress: ContractAddress;
    let mintedColour: Uint8Array;
    let providers: RetainedProviders<typeof unshieldedContract>;

    const contract = unshieldedContract;

    beforeAll(async () => {
      providers = initializeMidnightProviders(
        wallet,
        environmentConfiguration,
        new RetainedConfiguration('unshielded')
      );

      // The raw instance: the retained era has no `CompiledContract` container.
      const deployed = await deployContract(providers, { compiledContract: contract });
      contractAddress = deployed.contractAddress;
      logger.info(`Deployed retained unshielded twin at address: ${contractAddress}`);

      const minted = await submitCallTx(providers, {
        compiledContract: contract,
        contractAddress,
        circuitId: 'mintUnshieldedToSelfTest',
        args: [MINT_DOMAIN_SEPARATOR, MINT_AMOUNT]
      });
      expect(minted.public.status).toBe(SucceedEntirely);
      mintedColour = minted.private.result as Uint8Array;
    }, VERY_SLOW_TEST_TIMEOUT);

    test(
      'reads back the amount the contract holds',
      async () => {
        // Act.
        const txData = await submitCallTx(providers, {
          compiledContract: contract,
          contractAddress,
          circuitId: 'getUnshieldedBalanceTest',
          args: [mintedColour]
        });

        // Assert: a pipeline that hands the circuit an empty balance map claims a
        // read of `0`, the node disagrees, and this is rejected at submit.
        expect(txData.public.status).toBe(SucceedEntirely);
        expect(txData.private.result).toEqual(MINT_AMOUNT);
      },
      SLOW_TEST_TIMEOUT
    );

    test(
      'reads zero for a colour the contract never held',
      async () => {
        // Act.
        const txData = await submitCallTx(providers, {
          compiledContract: contract,
          contractAddress,
          circuitId: 'getUnshieldedBalanceTest',
          args: [NEVER_MINTED_COLOUR]
        });

        // Assert: a control for the rig, NOT a second reading of the balance -- an
        // unheld colour agrees with the node either way.
        expect(txData.public.status).toBe(SucceedEntirely);
        expect(txData.private.result).toEqual(0n);
      },
      SLOW_TEST_TIMEOUT
    );

    test(
      'refuses a send larger than the contract holds, at a provider seam',
      async () => {
        // Act: the recipient is the WALLET. A self-send of more than the contract
        // holds is accepted, so the self-directed form judges no balance.
        const rejection: unknown = await submitCallTx(providers, {
          compiledContract: unshieldedContract,
          contractAddress,
          circuitId: 'sendUnshieldedToUserTest',
          args: [mintedColour, MINT_AMOUNT + 1n, { bytes: userAddressBytes }]
        }).then(
          () => 'the oversized send was accepted',
          (reason: unknown) => reason
        );

        // Assert: a seam refusal, not any rejection -- an import fault or a timeout
        // must not certify that the ledger checks balances. `proveTx` cannot.
        expect(rejection).toBeInstanceOf(Ledger8.SeamFailedError);
        expect(
          rejection instanceof Ledger8.SeamFailedError
            ? { circuitId: rejection.circuitId, seam: rejection.seam }
            : rejection
        ).toEqual({
          circuitId: 'sendUnshieldedToUserTest',
          seam: expect.stringMatching(/^(?:balanceTx|submitTx)$/)
        });
      },
      SLOW_TEST_TIMEOUT
    );
  });

  describe('block-time: CallContext.secondsSinceEpoch', () => {
    let contractAddress: ContractAddress;
    let providers: RetainedProviders<typeof blockTimeContract>;

    const contract = blockTimeContract;

    beforeAll(async () => {
      providers = initializeMidnightProviders(
        wallet,
        environmentConfiguration,
        new RetainedConfiguration('block-time')
      );
      const deployed = await deployContract(providers, { compiledContract: contract });
      contractAddress = deployed.contractAddress;
      logger.info(`Deployed retained block-time twin at address: ${contractAddress}`);
    }, VERY_SLOW_TEST_TIMEOUT);

    test(
      'sees a block time later than a moment already past',
      async () => {
        // Arrange.
        const pastTime = currentTimeSeconds() - BLOCK_TIME_BUFFER_SECONDS;

        // Act.
        const txData = await submitCallTx(providers, {
          compiledContract: contract,
          contractAddress,
          circuitId: 'testBlockTimeGte',
          args: [pastTime]
        });

        // Assert: a pipeline leaving `secondsSinceEpoch` at its default fails this
        // locally, before any transaction exists.
        expect(txData.public.status).toBe(SucceedEntirely);
      },
      SLOW_TEST_TIMEOUT
    );

    test('refuses a block time later than a moment still in the future', async () => {
      // Arrange.
      const futureTime = currentTimeSeconds() + BLOCK_TIME_BUFFER_SECONDS;

      // Act / Assert: refused by the circuit's own assertion, so no transaction is
      // built. The pair shows the comparison bites in both directions.
      await expect(
        submitCallTx(providers, {
          compiledContract: contract,
          contractAddress,
          circuitId: 'testBlockTimeGt',
          args: [futureTime]
        })
      ).rejects.toThrow('Block time is <= time');
    });
  });
});
