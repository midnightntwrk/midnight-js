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
// Drives the AC0 fork-crossing scenario (spec AC0/FR0).
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

import {
  createLogger,
  defaultContainersConfiguration,
  ForkTestEnvironment,
  setContainersConfiguration
} from '@midnight-ntwrk/testkit-js';

import { buildPersona, stageTarballs } from './linker-smoke.mjs';
import { readManifest, REPOSITORY_ROOT } from './personas.mjs';

const PERSONA = 'fork-crossing';
const LINKER = process.argv[2] ?? 'pnp';
/** The genesis mint seed the dev preset funds; the same one the local environment uses. */
const WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const logger = createLogger(path.join(REPOSITORY_ROOT, 'packaging', 'ac0.log'));

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
 * The handshake is two lines: the dApp prints `AC0_AWAIT_FORK` when its pre-fork
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
      logPath: path.join(cwd, 'dapp.log')
    };

    const [command, argv] = linker.runCommand(['entry.mjs']);
    const child = spawn(command, argv, {
      cwd,
      env: { ...process.env, AC0_CONFIG: JSON.stringify(config) },
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let buffered = '';
    let result;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffered += chunk;
      let newline = buffered.indexOf('\n');
      while (newline >= 0) {
        const line = buffered.slice(0, newline);
        buffered = buffered.slice(newline + 1);
        process.stdout.write(`[dapp] ${line}\n`);

        if (line.trim() === 'AC0_AWAIT_FORK') {
          enactFork()
            .then(() => child.stdin.write('FORK_ENACTED\n'))
            .catch(reject);
        } else if (line.startsWith('AC0_RESULT ')) {
          result = line.slice('AC0_RESULT '.length);
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

const main = async () => {
  const environment = new ForkTestEnvironment(logger);
  let outcome;
  try {
    process.stdout.write('Standing up the fork stack...\n');
    const preFork = await environment.start();

    process.stdout.write('Installing the dApp persona from packed tarballs...\n');
    const manifest = readManifest();
    stageTarballs(manifest);
    const { cwd, linker } = buildPersona(PERSONA, LINKER, manifest, 'ac0-entry');
    linker.install(cwd);

    outcome = await runScenario(
      cwd,
      linker,
      {
        ...preFork,
        preForkProofServer: environment.getPreForkProofServer(),
        postForkProofServer: environment.getPostForkProofServer()
      },
      path.join(cwd, 'contracts', 'retained'),
      async () => {
        process.stdout.write('The dApp is mid-session; enacting the fork...\n');
        const enactment = await environment.enactFork();
        process.stdout.write(`Fork applied at #${enactment.appliedAtBlockHeight}\n`);
      }
    );
  } finally {
    await environment.shutdown().catch(() => undefined);
  }

  process.stdout.write(`${JSON.stringify(outcome.result, null, 2)}\n`);
  if (outcome.code !== 0) {
    process.stderr.write('::error::the AC0 scenario did not complete\n');
    process.exit(1);
  }
  process.stdout.write('AC0 scenario passed.\n');
};

await main();
