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

let reported = false;

/**
 * Emits the result exactly once and then exits.
 *
 * The exit has to wait for the write to reach the OS. stdout is a pipe here, so
 * the stream write is asynchronous, and `process.exit` discards whatever is still
 * queued -- past one chunk (8 KiB, measured) the report arrives truncated and
 * without its newline, which the driver's line reader drops in silence. A report
 * carrying stack traces is well past that, so the failure path is exactly the one
 * that loses its account of itself.
 */
const report = (code) => {
  if (reported) {
    process.exit(code);
  }
  reported = true;
  // One line, deliberately: the driver reads this off stdout line by line, and a
  // pretty-printed object would arrive as many lines it cannot reassemble.
  process.stdout.write(`AC0_RESULT ${JSON.stringify({ observed, failures })}\n`, () => process.exit(code));
};

// Without these the process can die between legs -- an unhandled rejection from a
// torn-down wallet subscription, say -- and the driver sees only a bare exit code
// with no account of how far the scenario got.
for (const event of ['uncaughtException', 'unhandledRejection']) {
  process.on(event, (error) => {
    failures.push(`${event}: ${error instanceof Error ? error.message : String(error)}`);
    report(1);
  });
}

const leg = async (name, run) => {
  try {
    const result = await run();
    observed[name] = result === undefined ? 'ok' : result;
    return result;
  } catch (error) {
    // The stack, not just the message: a WASM class-identity failure says only
    // "expected instance of X" and is undiagnosable without the frame it came from.
    const message = error instanceof Error ? `${error.message}
${error.stack ?? ''}`.trim() : String(error);
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

/**
 * The envelope tag the served bytes actually carry, as raw text.
 *
 * Read directly off the leading bytes rather than through any era resolver: the
 * question here is what the chain served, not what a resolver makes of it. The
 * tag runs to the second ':' -- `midnight:contract-state[vN]:`.
 */
const envelopeTag = (raw) => {
  const text = Buffer.from(raw.subarray(0, 64)).toString('latin1');
  const end = text.indexOf(':', text.indexOf(':') + 1);
  return end < 0 ? `<no tag in ${text.slice(0, 24)}>` : text.slice(0, end + 1);
};

/**
 * Samples the envelope tag over a window of blocks.
 *
 * The point is the "is migration lazy?" question: if the tag is still the
 * pre-fork one many blocks after the boundary, lateness is not the explanation.
 */
const sampleEnvelope = async (publicDataProvider, contractAddress, samples, everyMs) => {
  const seen = [];
  for (let i = 0; i < samples; i += 1) {
    const state = await publicDataProvider.queryRawContractState(contractAddress).catch(() => null);
    const head = await publicDataProvider.queryLatestProtocolVersion().catch(() => null);
    seen.push(state === null ? `head=${head} state=absent` : `head=${head} tag=${envelopeTag(state.raw)}`);
    if (i + 1 < samples) {
      await delay(everyMs);
    }
  }
  return seen;
};

/**
 * Waits until the indexer serves state for a freshly deployed contract.
 *
 * Submitting a deploy is not the same as the contract existing to be called: the
 * transaction has to be included and indexed first. Without this the next leg
 * fails with `No contract deployed at contract address ...`, which reads like a
 * broken deploy rather than a race.
 */
const waitForContract = async (publicDataProvider, contractAddress, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const state = await publicDataProvider.queryRawContractState(contractAddress).catch(() => null);
    if (state !== null) {
      return state;
    }
    if (Date.now() >= deadline) {
      throw new Error(`the indexer never served state for ${contractAddress} after its deploy was submitted`);
    }
    await delay(2_000);
  }
};

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
      privateStateStoreName: `ac0-${era}`,
      // The retained toolchain emits no `compiler/contract-manifest.json` --
      // `compactc` 0.31.1 predates it -- and integrity verification reads exactly
      // that file. `require` is therefore unsatisfiable for ANY pre-fork artifact,
      // however intact it is, so this drops to `warn` rather than pretending the
      // artifacts are unverifiable for some fixable reason.
      zkConfigIntegrity: { verify: 'warn' }
    })
  };
};

const testkit = await import('@midnight-ntwrk/testkit-js');
const logger = testkit.createLogger(config.logPath);

// The dApp is its own process, so it configures its own network id -- the driver
// setting one says nothing here. Taken off the barrel rather than by adding a
// dependency on `network-id`, which is what a consumer would reach for too.
const { networkId } = await import('@midnight-ntwrk/midnight-js');
networkId.setNetworkId(config.environment.networkId);

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
    // Passed through exactly as the internal pipeline does. Re-encoding it here
    // produced `Not all bytes read, 32 bytes remaining` from the composer.
    coinPk: session.wallet.getCoinPublicKey()
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
  // Announced so the driver can ask the NODE about the same contract. The
  // indexer's answer alone cannot separate "the ledger did not migrate" from
  // "the indexer serves the bytes of the last pre-fork action".
  process.stdout.write(`AC0_CONTRACT ${composed.contractAddress}\n`);
  const state = await waitForContract(session.providers.publicDataProvider, composed.contractAddress, 5 * 60_000);
  return {
    txId,
    contractAddress: composed.contractAddress,
    indexedAs: state.version,
    envelope: envelopeTag(state.raw)
  };
});

// (a) continued: a CALL through the unified entry, which is the reachable half.
await leg('pre-fork retained call', async () => {
  const { Contract } = await import('@midnight-ntwrk/ac0-contract-retained');
  const submitted = await submitCallTx(session.providers, {
    // `compiledContract`, not `contract`: the retained era has no CompiledContract
    // container, so the instance is passed raw. And a nullary circuit's options
    // carry no `args` at all -- `Ledger8CallTxOptionsBase` collapses to the target
    // when the parameter list is empty. Both were wrong here and neither was
    // caught, because this file is .mjs and never sees `tsc`.
    compiledContract: new Contract({}),
    contractAddress: deployment.contractAddress,
    circuitId: CIRCUIT_ID
  });
  // `submitCallTx` resolves a FinalizedCallTxData, whose non-sensitive fields sit under
  // `.public` -- reading `submitted.txId` yields undefined, and a leg that never submitted
  // would then look exactly like one that did.
  return { txId: submitted.public.txId };
});

// ── (b) the fork moment ───────────────────────────────────────────────────────

await leg('fork enacted', () => awaitFork());

await leg('post-fork head era', async () => {
  const era = await waitForHead(session.providers.publicDataProvider, 'v9', 5 * 60_000);
  await session.wallet.stop().catch(() => undefined);
  session = await buildProviders('v9', testkit, logger);
  return era;
});

// Diagnostic, not an acceptance criterion: does the migration re-version the
// contract-state envelope, and if not, does it do so later? The framework refuses
// a pre-fork envelope under a post-fork head, so keep-state depends on this.
await leg('envelope tag across the boundary', () =>
  sampleEnvelope(session.providers.publicDataProvider, deployment.contractAddress, 6, 10_000)
);

// ── (c) post-fork: the SAME call site, now on keep-state ──────────────────────

await leg('post-fork keep-state call through the same call site', async () => {
  const { Contract } = await import('@midnight-ntwrk/ac0-contract-retained');
  const submitted = await submitCallTx(session.providers, {
    // `compiledContract`, not `contract`: the retained era has no CompiledContract
    // container, so the instance is passed raw. And a nullary circuit's options
    // carry no `args` at all -- `Ledger8CallTxOptionsBase` collapses to the target
    // when the parameter list is empty. Both were wrong here and neither was
    // caught, because this file is .mjs and never sees `tsc`.
    compiledContract: new Contract({}),
    contractAddress: deployment.contractAddress,
    circuitId: CIRCUIT_ID
  });
  // `submitCallTx` resolves a FinalizedCallTxData, whose non-sensitive fields sit under
  // `.public` -- reading `submitted.txId` yields undefined, and a leg that never submitted
  // would then look exactly like one that did.
  return { txId: submitted.public.txId };
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
report(failures.length === 0 ? 0 : 1);
