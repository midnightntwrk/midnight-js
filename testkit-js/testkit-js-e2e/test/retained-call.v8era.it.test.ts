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
import path from 'node:path';

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
const RETAINED_SPECIFIER = 'compact-runtime-ledger8';

/** The build step these two constants have to agree with. */
const REWRITE_SCRIPT = path.resolve(__dirname, '../scripts/rewrite-retained-runtime.mjs');

/** The twins this file drives; a typo is a compile error rather than a late ENOENT while proving. */
type RetainedTwin = 'unshielded' | 'block-time';

const RETAINED_TWINS: readonly RetainedTwin[] = ['unshielded', 'block-time'];

// One suffix per run, not per configuration: the two `unshielded` configurations
// below must name the same private state store.
const RUN_SUFFIX = Date.now().toString();

const retainedArtifactPath = (twin: RetainedTwin): string =>
  path.resolve(__dirname, '../src/contract/compiled-retained', twin);

class RetainedConfiguration implements ContractConfiguration {
  constructor(private readonly twin: RetainedTwin) {}

  get privateStateStoreName(): string {
    return `retained-${this.twin}-private-store-${RUN_SUFFIX}`;
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

// Neither twin declares a witness. `undefined` rather than the generated default
// of `any`, which would untype the private-state channel -- the provider set and
// the `private` half of every call result.
const unshieldedContract = new RetainedUnshieldedContract<undefined>({});
const blockTimeContract = new RetainedBlockTimeContract<undefined>({});

type RetainedProviders<C extends Ledger8.Contract> = Ledger8.ContractProviders<C, Ledger8.CircuitId<C>>;

describe('Retained-era contract calls on a pre-fork (ledger v8) network', () => {
  const MINT_DOMAIN_SEPARATOR = new Uint8Array(32).fill(1);
  const SECOND_MINT_DOMAIN_SEPARATOR = new Uint8Array(32).fill(3);
  const NEVER_MINTED_COLOUR = new Uint8Array(32).fill(2);
  const MINT_AMOUNT = 1_000_000n;
  // Different from MINT_AMOUNT on purpose: with one held colour, "the map has a
  // single entry and any held colour returns it" is indistinguishable from a
  // correct per-key lookup.
  const SECOND_MINT_AMOUNT = 250_000n;
  const SEND_AMOUNT = 100_000n;
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

    // The build step is a `.mjs` with no declarations, so these constants cannot be
    // imported from it. Pinned against its source instead: a runtime-version bump
    // that misses this file fails here, naming the drift, rather than in the twin
    // assertions below, where it would read as a broken artifact.
    test('the build step declares the runtime version and specifier this file asserts', () => {
      // Arrange / Act.
      const script = readFileSync(REWRITE_SCRIPT, 'utf8');

      // Assert.
      expect(script).toContain(`RETAINED_RUNTIME_VERSION = '${RETAINED_RUNTIME_VERSION}'`);
      expect(script).toContain(`RETAINED_SPECIFIER = '${RETAINED_SPECIFIER}'`);
    });

    test.each(RETAINED_TWINS)('the %s twin is a retained-era artifact set wired to the retained runtime', (twin) => {
      // Arrange: both emitted files, because the build step rewrites both and the
      // whole directory is excluded from lint.
      const twinDir = retainedArtifactPath(twin);
      const contractInfo: unknown = JSON.parse(
        readFileSync(path.join(twinDir, 'compiler', 'contract-info.json'), 'utf8')
      );
      const emitted = ['index.js', 'index.d.ts'].map((name) =>
        readFileSync(path.join(twinDir, 'contract', name), 'utf8')
      );

      // Assert: `resolveArtifactEra` reads the era off this field.
      expect(contractInfo).toMatchObject({ 'runtime-version': RETAINED_RUNTIME_VERSION });
      for (const source of emitted) {
        expect(source).toContain(`from '${RETAINED_SPECIFIER}'`);
        // The bare name, not `from '...'`: a differently quoted or subpath import
        // would resolve the current runtime just as wrongly.
        expect(source).not.toContain('@midnight-ntwrk/compact-runtime');
      }
    });
  });

  describe('unshielded: CallContext.balance', () => {
    let contractAddress: ContractAddress;
    let mintedColour: Uint8Array;
    let secondColour: Uint8Array;
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
      // Narrowed rather than cast: `providers` is typed over every circuit's return
      // type, so a shape change here would otherwise surface as an opaque mismatch
      // in the balance assertions rather than at the mint that caused it.
      const minted_colour = minted.private.result;
      if (!(minted_colour instanceof Uint8Array)) {
        throw new Error(`mintUnshieldedToSelfTest returned ${typeof minted_colour}, expected the colour as bytes`);
      }
      mintedColour = minted_colour;

      const secondMint = await submitCallTx(providers, {
        compiledContract: unshieldedContract,
        contractAddress,
        circuitId: 'mintUnshieldedToSelfTest',
        args: [SECOND_MINT_DOMAIN_SEPARATOR, SECOND_MINT_AMOUNT]
      });
      expect(secondMint.public.status).toBe(SucceedEntirely);
      const second_colour = secondMint.private.result;
      if (!(second_colour instanceof Uint8Array)) {
        throw new Error(`mintUnshieldedToSelfTest returned ${typeof second_colour}, expected the colour as bytes`);
      }
      secondColour = second_colour;
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
      'reads each held colour back at its own amount',
      async () => {
        // Act.
        const txData = await submitCallTx(providers, {
          compiledContract: unshieldedContract,
          contractAddress,
          circuitId: 'getUnshieldedBalanceTest',
          args: [secondColour]
        });

        // Assert: a second held colour at a different amount, so the per-key
        // lookup is load-bearing. With one colour, a map that ignored its key
        // would pass.
        expect(txData.public.status).toBe(SucceedEntirely);
        expect(txData.private.result).toEqual(SECOND_MINT_AMOUNT);
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

        // Assert: a control, NOT a second reading of the balance -- an unheld colour
        // agrees with the node whether or not the balance crossed. What it does kill
        // is a balance map whose keys collapse: that returns MINT_AMOUNT here.
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

        // Assert: the NODE refused it, at `submitTx`. Measured, and pinned exactly
        // rather than as an alternation, because the seam is what discriminates
        // here: the wallet funds the fee and balances this transaction happily, so
        // every wallet-local fault -- a failed ledger import, an unfunded wallet,
        // a balancer fault -- surfaces one seam earlier, at `balanceTx`, and no
        // longer satisfies this. The refusal moving seams is itself worth a red.
        //
        // The provider's own reason is not usable: it reaches `cause` as a generic
        // `SubmissionError: Transaction submission error`, with no balance text to
        // match on. The seam plus the successful send below is what separates "the
        // ledger compared the amount" from "retained sends fail".
        expect(rejection).toBeInstanceOf(Ledger8.SeamFailedError);
        expect(
          rejection instanceof Ledger8.SeamFailedError
            ? { circuitId: rejection.circuitId, seam: rejection.seam }
            : rejection
        ).toEqual({ circuitId: 'sendUnshieldedToUserTest', seam: 'submitTx' });
      },
      SLOW_TEST_TIMEOUT
    );

    // LAST, because it is the only test here that moves the balance. Everything
    // above reads what `beforeAll` minted.
    //
    // Without it the refusal above proves nothing: a pipeline where EVERY retained
    // send failed -- effects dropped, unshielded outputs misassembled -- would
    // refuse the oversized one too, for the wrong reason, and stay green.
    test(
      'sends part of the balance and reads the remainder back',
      async () => {
        // Arrange: read what the contract holds rather than assuming it, so this
        // does not depend on the order the tests above ran in.
        const before = await submitCallTx(providers, {
          compiledContract: unshieldedContract,
          contractAddress,
          circuitId: 'getUnshieldedBalanceTest',
          args: [mintedColour]
        });
        const held = before.private.result;
        if (typeof held !== 'bigint') {
          throw new Error(`getUnshieldedBalanceTest returned ${typeof held}, expected the balance as a bigint`);
        }
        expect(held).toBeGreaterThan(SEND_AMOUNT);

        // Act.
        const sent = await submitCallTx(providers, {
          compiledContract: unshieldedContract,
          contractAddress,
          circuitId: 'sendUnshieldedToUserTest',
          args: [mintedColour, SEND_AMOUNT, { bytes: userAddressBytes }]
        });

        // Assert: admitted, and the balance the next call reads back followed it.
        // The retained result carries no `unshielded` movement summary -- that is a
        // current-era member -- so the delta is what shows the send landed on the
        // chain rather than merely being accepted.
        expect(sent.public.status).toBe(SucceedEntirely);

        const after = await submitCallTx(providers, {
          compiledContract: unshieldedContract,
          contractAddress,
          circuitId: 'getUnshieldedBalanceTest',
          args: [mintedColour]
        });
        expect(after.public.status).toBe(SucceedEntirely);
        expect(after.private.result).toEqual(held - SEND_AMOUNT);
      },
      VERY_SLOW_TEST_TIMEOUT
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

        // Assert: a pipeline handing the circuit a zero block time fails this
        // locally, before any transaction exists. The retained runtime stamps a
        // wall clock of its own, so this holds unless something drops the field.
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
    }, SLOW_TEST_TIMEOUT);
  });
});
