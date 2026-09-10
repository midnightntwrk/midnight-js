#!/usr/bin/env node
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
// Drives the fork-crossing scenario.
//
// It owns the chain and the dApp owns the session: this script stands up the fork
// stack, installs the dApp persona from packed tarballs, then hands control to
// that process and enacts the fork at the moment it asks. The dApp is a separate
// process because it holds contracts from both ledger eras at once, which needs
// two Compact runtimes and therefore an isolated install.
//
// A plain script rather than a vitest file for the same reason: the scenario is
// about an installed consumer, and nothing about it belongs in the workspace's
// own module graph.

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import {
  createLogger,
  defaultContainersConfiguration,
  ForkTestEnvironment,
  setContainersConfiguration
} from '@midnight-ntwrk/testkit-js';

import { buildRetainedTwins } from './build-retained-twins.mjs';
import { buildPersona, stageTarballs } from './linker-smoke.mjs';
import { readManifest, REPOSITORY_ROOT, resolveContractSelection } from './personas.mjs';

const PERSONA = 'fork-crossing';
const argv = process.argv.slice(2);
const LINKER = argv.find((argument) => !argument.startsWith('--')) ?? 'pnp';

/**
 * The contracts this run covers, defaulting to the whole matrix.
 *
 * Sharded one contract per CI job: the legs are strictly sequential and the
 * proving in them is what the run costs, so splitting the matrix is what shortens
 * it. A shard also builds only its OWN retained twin, which is why the 146 MB of
 * `fee-mint` prover keys stop being everyone's bill.
 *
 *   node consumer-e2e/fork-matrix-smoke.mjs pnp --contracts=simple
 */
const CONTRACTS_FLAG = '--contracts=';
const requestedContracts = argv
  .filter((argument) => argument.startsWith(CONTRACTS_FLAG))
  .flatMap((argument) => argument.slice(CONTRACTS_FLAG.length).split(','));
const SELECTION = resolveContractSelection(requestedContracts.length === 0 ? undefined : requestedContracts);
/** The genesis mint seed the dev preset funds; the same one the local environment uses. */
const WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

/**
 * The node's address on the compose project network, which is how the toolkit container reaches it.
 *
 * Plain `ws`: the node serves no TLS and there is no terminator in front of it on that network.
 */
// nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket
const NODE_INTERNAL_WS_URL = 'ws://node:9944';

const logger = createLogger(path.join(REPOSITORY_ROOT, 'consumer-e2e', 'fork-matrix.log'));

// The compose files live in `testkit-js/`, and the default configuration resolves
// them against `process.cwd()` -- which for this script is the repository root.
// The e2e suite does the same thing from its vitest setup.
const COMPOSE_DIR = path.join(REPOSITORY_ROOT, 'testkit-js');
setContainersConfiguration({
  ...defaultContainersConfiguration,
  standalone: { ...defaultContainersConfiguration.standalone, path: COMPOSE_DIR },
  proofServer: { ...defaultContainersConfiguration.proofServer, path: COMPOSE_DIR }
});

/**
 * Runs the dApp, enacting the fork when it asks.
 *
 * The handshake is two lines: the dApp prints `FORK_AWAIT` when its pre-fork
 * legs are done, and this script answers `FORK_ENACTED` once the chain has
 * finalized past the boundary. That is what keeps the fork *inside* one session.
 */
const runScenario = (cwd, linker, environment, contractDir, enactFork) =>
  new Promise((resolve, reject) => {
    const config = {
      environment,
      proofServerV8: environment.preForkProofServer,
      proofServerV9: environment.postForkProofServer,
      walletSeed: WALLET_SEED,
      retainedZkConfigPath: contractDir,
      // The ZK artifacts each matrix contract proves against. Handed over as
      // paths rather than derived in the dApp: the persona's layout is this
      // script's doing, and a second copy of that knowledge would go stale on
      // the first change to it.
      matrixZkConfigPaths: Object.fromEntries(
        SELECTION.current.map((key) => [key, path.join(cwd, 'contracts', key)])
      ),
      // Which contracts this shard is answerable for. The dApp narrows both its
      // matrices to these, so a shard cannot report on a leg it never ran.
      contracts: SELECTION,
      // The retained twins, under the same keys their current-era namesakes use,
      // so the dApp can pair the two eras of one contract without a second table.
      retainedMatrixZkConfigPaths: Object.fromEntries(
        SELECTION.retained.map((key) => [key, path.join(cwd, 'contracts', `retained-${key}`)])
      ),
      logPath: path.join(cwd, 'dapp.log')
    };

    const [command, argv] = linker.runCommand(['entry.mjs']);
    const child = spawn(command, argv, {
      cwd,
      env: { ...process.env, FORK_CONFIG: JSON.stringify(config) },
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let buffered = '';
    let result;
    let contractAddress;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffered += chunk;
      let newline = buffered.indexOf('\n');
      while (newline >= 0) {
        const line = buffered.slice(0, newline);
        buffered = buffered.slice(newline + 1);
        process.stdout.write(`[dapp] ${line}\n`);

        if (line.trim() === 'FORK_AWAIT') {
          enactFork(contractAddress)
            .then(() => child.stdin.write('FORK_ENACTED\n'))
            .catch(reject);
        } else if (line.startsWith('FORK_CONTRACT ')) {
          contractAddress = line.slice('FORK_CONTRACT '.length).trim();
        } else if (line.startsWith('FORK_RESULT ')) {
          result = line.slice('FORK_RESULT '.length);
        }
        newline = buffered.indexOf('\n');
      }
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (result === undefined) {
        // `buffered` holds whatever arrived without a closing newline. A report
        // that reached the driver only in part is a different failure from one
        // that was never emitted, and only this says which happened.
        const partial = buffered === '' ? '' : `; ${buffered.length} bytes arrived unterminated: ${buffered.slice(0, 200)}`;
        reject(new Error(`the dApp exited (code=${code}, signal=${signal}) without reporting a result${partial}`));
        return;
      }
      resolve({ code, result: JSON.parse(result) });
    });
  });

/**
 * An error with its cause chain, which is the only form worth printing here.
 *
 * A `execFileSync` failure says `Command failed with exit code 1` and puts the
 * command on `cause`; a seam failure says a provider refused and puts the
 * provider's own error there. Printing `error.message` alone loses the half that
 * names what went wrong.
 *
 * Deliberately a second copy of the dApp's own helper rather than a shared
 * import: `fork-matrix-entry.mjs` is an ENTRY POINT that runs a fork scenario on
 * import, and it executes inside the installed persona, which cannot reach this
 * repository's modules at all.
 */
const describeError = (error, depth = 0) => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const head = `${error.name}: ${error.message}\n${error.stack ?? ''}`.trim();
  if (error.cause === undefined || depth >= 4) {
    return head;
  }
  return `${head}\nCaused by: ${describeError(error.cause, depth + 1)}`;
};

/**
 * How long the teardown gets before the run gives up on it.
 *
 * Generous, because a stack that is slow to come down is not itself a failure --
 * `down()` carries its own timeout and this is the backstop for the case where
 * that one does not fire.
 */
const SHUTDOWN_DEADLINE_MS = 180_000;

/**
 * Runs the teardown under a deadline, and never rejects.
 *
 * THE POINT IS THE DEADLINE, not the tidiness. A teardown that never settles
 * leaves `main` pending, and a pending `main` under a top-level `await` ends the
 * process with a bare `Detected unsettled top-level await` and exit 13 -- no
 * error, no stack, no indication of what actually failed. That is what a run
 * whose persona install failed reported: the install's own error never reached
 * the log at all.
 */
const shutdownWithin = async (environment) => {
  const timedOut = await Promise.race([
    environment
      .shutdown()
      .then(() => false)
      .catch((error) => {
        process.stderr.write(`::warning::the fork stack did not shut down cleanly: ${describeError(error)}\n`);
        return false;
      }),
    // `ref: false`, which is what makes the loser of this race harmless: an
    // unreferenced timer does not hold the event loop open, so when the teardown
    // wins there is nothing left to cancel and nothing keeping the process
    // alive. A referenced deadline would trade a hung shutdown for a process
    // that will not exit -- the same defect, reached the other way round.
    delay(SHUTDOWN_DEADLINE_MS, true, { ref: false })
  ]);

  if (timedOut) {
    process.stderr.write(
      `::warning::the fork stack did not shut down within ${SHUTDOWN_DEADLINE_MS}ms; ` +
        'abandoning it so the run can report what it found\n'
    );
  }
};

/**
 * Where the run had got to, for the failure report.
 *
 * A stage name rather than a line number: the reader of a failed CI job needs to
 * know whether the stack, the twins, the persona install or the scenario itself
 * is what went wrong, and those four have entirely different remedies.
 */
let stage = 'starting up';

const main = async () => {
  const environment = new ForkTestEnvironment(logger);
  let outcome;
  try {
    stage = 'standing up the fork stack';
    process.stdout.write('Standing up the fork stack...\n');
    const preFork = await environment.start();

    // Before the install, because the persona copies these directories into
    // itself: a twin built afterwards would not be in the tree that gets linked.
    stage = 'building the retained-era contract twins';
    process.stdout.write(
      `Building the retained-era contract twins (compactc 0.31.1): ${SELECTION.retained.join(', ') || '(none)'}...\n`
    );
    const built = buildRetainedTwins(SELECTION.retained);
    process.stdout.write(
      built.length === 0 ? 'Retained twins already built.\n' : `Built retained twins: ${built.join(', ')}\n`
    );

    stage = 'installing the dApp persona';
    process.stdout.write('Installing the dApp persona from packed tarballs...\n');
    const manifest = readManifest();
    stageTarballs(manifest);
    const { cwd, linker } = buildPersona(PERSONA, LINKER, manifest, 'fork-matrix-entry', [
      ...SELECTION.current,
      ...SELECTION.retained.map((key) => `retained-${key}`)
    ]);
    linker.install(cwd);

    stage = 'running the fork-crossing scenario';
    outcome = await runScenario(
      cwd,
      linker,
      {
        ...preFork,
        preForkProofServer: environment.getPreForkProofServer(),
        postForkProofServer: environment.getPostForkProofServer()
      },
      path.join(cwd, 'contracts', 'retained'),
      async (contractAddress) => {
        process.stdout.write('The dApp is mid-session; enacting the fork...\n');
        const enactment = await environment.enactFork();
        process.stdout.write(`Fork applied at #${enactment.appliedAtBlockHeight}\n`);

        // The decisive comparison. The indexer serves "the latest contract action
        // at or before the block", so its answer reflects what was submitted, not
        // necessarily what the ledger now holds. Asking the NODE separates a
        // ledger that did not migrate from an indexer that serves stale bytes.
        if (contractAddress !== undefined) {
          const outcome = await environment
            .runToolkit([
              'contract-state',
              '--contract-address',
              contractAddress,
              '--src-url',
              NODE_INTERNAL_WS_URL
            ])
            .catch((error) => `toolkit failed: ${error instanceof Error ? error.message : String(error)}`);
          const tag = /midnight:[a-z-]+\[v\d+\]:/.exec(outcome);
          process.stdout.write(`NODE contract-state envelope: ${tag?.[0] ?? '(no tag found)'}\n`);
          process.stdout.write(`NODE contract-state output (trimmed):\n${outcome.slice(0, 1500)}\n`);
        }
      }
    );
  } catch (error) {
    // REPORTED BEFORE THE TEARDOWN IS ATTEMPTED. The teardown runs in the
    // `finally` below, and a teardown that hangs or fails must not be able to
    // take the diagnosis down with it -- which is exactly what happened to the
    // persona install's own error.
    process.stderr.write(`::error::the fork-crossing run failed while ${stage}\n`);
    process.stderr.write(`${describeError(error)}\n`);
    throw error;
  } finally {
    await shutdownWithin(environment);
  }

  process.stdout.write(`${JSON.stringify(outcome.result, null, 2)}\n`);
  if (outcome.code !== 0) {
    process.stderr.write('::error::the fork-crossing scenario did not complete\n');
    process.exit(1);
  }
  process.stdout.write('Fork-crossing scenario passed.\n');
};

// NOT a bare `await main()`. A rejection there is reported by the runtime as an
// unhandled rejection, and a `main` left PENDING -- by a teardown that never
// settles -- ends the process with `Detected unsettled top-level await` and exit
// 13, which names neither the stage nor the failure. Both now end here, with the
// cause already printed above and an exit code the lane can read.
try {
  await main();
} catch {
  // Already described by `main`'s own handler; re-printing it here would give a
  // reader two copies of one failure and no second fact.
  process.exit(1);
}
