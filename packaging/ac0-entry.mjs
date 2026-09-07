// This file is part of midnight-js.
// Copyright (C) 2025-2026 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// The AC0 scenario, run from inside an installed dApp.
//
// One process, one build, holding a contract from each ledger era and
// transacting across the fork. It is a separate process from the test that
// drives it because the two eras' contract modules demand different Compact
// runtimes, which only an isolated install satisfies.
//
// The driving test owns the chain: this process announces when the pre-fork legs
// are done and waits to be told the fork was enacted, so the boundary falls
// between two legs of ONE session rather than between two runs.

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { loadLedger8Engine, loadLedgerEra, networkHeadVersion } from '@midnight-ntwrk/midnight-js-protocol';

const config = JSON.parse(process.env.AC0_CONFIG ?? '{}');
const CIRCUIT_ID = 'increment';
const NETWORK_ID = 'undeployed';

const observed = {};
const failures = [];

const leg = async (name, run) => {
  try {
    const result = await run();
    observed[name] = result === undefined ? 'ok' : result;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    observed[name] = `FAILED: ${message}`;
    failures.push(`${name}: ${message}`);
    return undefined;
  }
};

/** Blocks until the driving test reports the fork enacted. */
const awaitFork = () =>
  new Promise((resolve, reject) => {
    const lines = createInterface({ input: process.stdin });
    let seen = false;
    process.stdout.write('AC0_AWAIT_FORK\n');
    lines.on('line', (line) => {
      if (line.trim() === 'FORK_ENACTED') {
        seen = true;
        lines.close();
      }
    });
    lines.on('close', () => (seen ? resolve() : reject(new Error('stdin closed before the fork was reported'))));
  });

/** Polls the head until it reports `era`, so indexer lag is not read as a failure. */
const waitForHead = async (publicDataProvider, era, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const seen = await networkHeadVersion(publicDataProvider);
    if (seen === era) {
      return seen;
    }
    if (Date.now() >= deadline) {
      throw new Error(`the head never reported '${era}'; it is still '${seen}'`);
    }
    await delay(2_000);
  }
};

/**
 * The provider set for one era.
 *
 * The proof server is the one field that moves: no published image proves both
 * eras, so the harness points at each in turn. Spec OQ16 says the shipped story
 * is a single fork-prepared endpoint, so this split is a property of the test
 * environment and not of the dApp.
 */
const buildProviders = async (era, testkit, logger) => {
  const environment = {
    ...config.environment,
    proofServer: era === 'v8' ? config.proofServerV8 : config.proofServerV9
  };
  const wallet = await testkit.MidnightWalletProvider.build(logger, environment, config.walletSeed);
  await wallet.start();
  return {
    wallet,
    providers: testkit.initializeMidnightProviders(wallet, environment, {
      zkConfigPath: config.retainedZkConfigPath,
      privateStateStoreName: `ac0-${era}`
    })
  };
};

const testkit = await import('@midnight-ntwrk/testkit-js');
const logger = testkit.createLogger(config.logPath);

let session = await buildProviders('v8', testkit, logger);
let deployment;

// ── (a) pre-fork: operates on a ledger-8 head ─────────────────────────────────

await leg('pre-fork head era', () => networkHeadVersion(session.providers.publicDataProvider));

// The retained contract reaches the chain through protocol's era facade, not
// through `deployContract`: that entry point's retained arm refuses
// unconditionally before any head is read (`Ledger8DeployOnV9Error`, which the
// source calls dormant), and the working pipeline lives in `contracts/src/internal`
// where a consumer cannot reach it. This stands in for the pre-fork dApp that
// would already have deployed the contract on the previous framework major. It is
// NOT a claim that a consumer can deploy a retained contract today.
await leg('pre-fork retained deploy', async () => {
  const { Contract } = await import('@midnight-ntwrk/ac0-contract-retained');
  const [engine, era] = await Promise.all([loadLedger8Engine(), loadLedgerEra('v8')]);

  const constructed = engine.executeConstructor({
    contract: new Contract({}),
    args: [],
    privateState: {},
    coinPk: Buffer.from(session.wallet.getCoinPublicKey()).toString('hex')
  });

  const verifierKeys = new Map([
    [CIRCUIT_ID, new Uint8Array(readFileSync(path.join(config.retainedZkConfigPath, 'keys', `${CIRCUIT_ID}.verifier`)))]
  ]);

  const composed = era.composeDeployTx({
    contractState: constructed.contractState.serialize(),
    verifierKeys,
    networkId: NETWORK_ID,
    ttl: new Date(Date.now() + 60 * 60_000)
  });

  const { proofProvider, walletProvider, midnightProvider } = session.providers;
  const proven = await proofProvider.proveTx({ version: 'v8', txBytes: composed.transaction });
  const balanced = await walletProvider.balanceTx(proven);
  const txId = await midnightProvider.submitTx(balanced);

  deployment = { contractAddress: composed.contractAddress, privateState: constructed.privateState };
  return { txId, contractAddress: composed.contractAddress };
});

// (a) continued: a CALL through the unified entry, which is the reachable half.
await leg('pre-fork retained call', async () => {
  const { Contract } = await import('@midnight-ntwrk/ac0-contract-retained');
  const submitted = await submitCallTx(session.providers, {
    contract: new Contract({}),
    contractAddress: deployment.contractAddress,
    circuitId: CIRCUIT_ID,
    args: [],
    privateState: deployment.privateState
  });
  return { txId: submitted.txId };
});

// ── (b) the fork moment ───────────────────────────────────────────────────────

await leg('fork enacted', () => awaitFork());

await leg('post-fork head era', async () => {
  const era = await waitForHead(session.providers.publicDataProvider, 'v9', 5 * 60_000);
  await session.wallet.stop().catch(() => undefined);
  session = await buildProviders('v9', testkit, logger);
  return era;
});

// ── (c) post-fork: the SAME call site, now on keep-state ──────────────────────

await leg('post-fork keep-state call through the same call site', async () => {
  const { Contract } = await import('@midnight-ntwrk/ac0-contract-retained');
  const submitted = await submitCallTx(session.providers, {
    contract: new Contract({}),
    contractAddress: deployment.contractAddress,
    circuitId: CIRCUIT_ID,
    args: [],
    privateState: deployment.privateState
  });
  return { txId: submitted.txId };
});

// ── (d) reads its own pre-fork history ────────────────────────────────────────

await leg('reads its own pre-fork history', async () => {
  const state = await session.providers.publicDataProvider.queryRawContractState(deployment.contractAddress);
  if (state === null) {
    throw new Error('the contract deployed before the fork is no longer readable after it');
  }
  return { version: state.version, protocolVersion: state.protocolVersion };
});

await session.wallet?.stop().catch(() => undefined);
// One line, deliberately: the driver reads this off stdout line by line, and a
// pretty-printed object would arrive as many lines it cannot reassemble.
process.stdout.write(`AC0_RESULT ${JSON.stringify({ observed, failures })}\n`);
process.exit(failures.length === 0 ? 0 : 1);
