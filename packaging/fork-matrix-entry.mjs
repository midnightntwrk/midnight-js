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
// The fork-crossing scenario, run from inside an installed dApp.
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
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { loadLedger8Engine, loadLedgerEra, networkHeadVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

const config = JSON.parse(process.env.FORK_CONFIG ?? '{}');

/**
 * The contracts this process is answerable for, as the driver narrowed them.
 *
 * Absent when the scenario is run whole, which is what a local invocation and
 * `workflow_dispatch` still do. `covers` treats that as "everything" rather than
 * "nothing": a shard that quietly ran no legs would report green for work it
 * never did, and the empty selection is already refused upstream in
 * `resolveContractSelection`.
 */
const SELECTED = config.contracts ?? {};
const covers = (selected, key) => selected === undefined || selected.includes(key);
const CIRCUIT_ID = 'increment';
const NETWORK_ID = 'undeployed';

/** A ceiling on one leg, so a wedged prover or a lost subscription costs one row rather than the run. */
const LEG_TIMEOUT = 8 * 60_000;

/**
 * The wait for the driver's `FORK_ENACTED`, which is not a leg the dApp controls:
 * `enactFork`'s own deadlines sum to twelve minutes, so a ceiling below that would
 * fail a governance upgrade that was still in progress.
 */
const FORK_WAIT_TIMEOUT = 20 * 60_000;

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
  process.stdout.write(`FORK_RESULT ${JSON.stringify({ observed, failures })}\n`, () => process.exit(code));
};

// Without these the process can die between legs -- an unhandled rejection from a
// torn-down wallet subscription, say -- and the driver sees only a bare exit code
// with no account of how far the scenario got.
for (const event of ['uncaughtException', 'unhandledRejection']) {
  process.on(event, (error) => {
    failures.push(`${event}: ${describeError(error)}`);
    report(1);
  });
}

/**
 * An error, its stack, and every `cause` beneath it.
 *
 * The chain is the point. `Ledger8SeamFailedError` says only that a seam
 * rejected and puts the provider's own failure -- class name intact, message
 * redacted -- on `cause`, so a report that prints `error.message` alone says a
 * transaction was refused and never says by what. That is what happened on the
 * first run of the retained matrix.
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

/** A deadline breach, marked so `leg` can tell it apart from an ordinary failure. */
class LegTimeoutError extends Error {
  constructor(name, ms) {
    super(`${name} did not finish within ${ms}ms`);
    this.name = 'LegTimeoutError';
  }
}

/**
 * Fails `run` at a deadline instead of waiting on it forever.
 *
 * The run drives thirteen contracts through one process, and several of them
 * prove against artifacts in the hundreds of megabytes. A prover that never
 * answers, or a wallet subscription that stops delivering, would otherwise take
 * the remaining contracts down with it and the report would say nothing about
 * any of them.
 *
 * `Promise.race` cannot cancel the loser, and every leg draws on ONE wallet, so
 * the abandoned operation may still balance and submit after its leg was written
 * off -- spending coins a later leg has already selected, which would be reported
 * under that later contract's name. `leg` therefore ends the run on a breach
 * rather than stepping over it; this function only raises it.
 */
const withDeadline = (name, ms, run) =>
  Promise.race([
    run(),
    // `ref: false`, so the deadline of a leg that already finished cannot be the
    // thing keeping the process alive after the report is written.
    delay(ms, undefined, { ref: false }).then(() => {
      throw new LegTimeoutError(name, ms);
    })
  ]);

const leg = async (name, run, ms = LEG_TIMEOUT) => {
  // `report` exits from a write callback, so the process is still alive for a
  // tick or two after a fatal leg. Without this the next leg's body would start
  // -- and a half-run leg is exactly the kind of thing the report cannot explain.
  if (reported) {
    return undefined;
  }
  try {
    const result = await withDeadline(name, ms, run);
    observed[name] = result === undefined ? 'ok' : result;
    return result;
  } catch (error) {
    // The stack and the cause chain, not just the message: a WASM class-identity
    // failure says only "expected instance of X" and is undiagnosable without the
    // frame it came from, and a seam refusal names the provider only on `cause`.
    const message = describeError(error);
    observed[name] = `FAILED: ${message}`;
    failures.push(`${name}: ${message}`);
    if (error instanceof LegTimeoutError) {
      // The abandoned operation still holds the wallet, so anything measured
      // after this point could be its doing. Stopping here costs the remaining
      // legs; continuing would cost the attribution of every one of them.
      report(1);
    }
    return undefined;
  }
};

/**
 * Runs a leg and answers whether it passed.
 *
 * By whether it recorded a failure, NOT by its return value: `leg` returns
 * whatever the body did, and a body that asserts rather than reports -- like
 * `awaitFork` -- returns `undefined` on success. Reading that as a failure would
 * abort every healthy run.
 */
const legSucceeded = async (name, run, ms = LEG_TIMEOUT) => {
  const before = failures.length;
  await leg(name, run, ms);
  return failures.length === before;
};

/**
 * Records an outcome without judging it.
 *
 * For questions whose answer is not known in advance -- what a consumer sees if
 * they try a current-era contract on a chain that has not forked yet, say. A
 * refusal there is information, not a defect, so it must not colour the run's
 * exit code; `leg` is for the things the fork crossing asserts.
 */
const probe = async (name, run) => {
  if (reported) {
    return;
  }
  try {
    const result = await withDeadline(name, LEG_TIMEOUT, run);
    observed[name] = result === undefined ? 'ok' : result;
  } catch (error) {
    if (error instanceof LegTimeoutError) {
      // NOT `refused`: a hung prover is not an answer to the question, and
      // recording it as one would have a reader conclude the pre-fork chain
      // rejects current-era deploys. Fatal for the same reason it is in `leg`.
      observed[name] = `INCONCLUSIVE: ${describeError(error)}`;
      failures.push(`${name}: ${error.message}`);
      report(1);
      return;
    }
    // With the stack and the cause chain, for the same reason `leg` keeps them:
    // the answer to one of these probes was `expected instance of
    // LedgerParameters`, which names neither the copies involved nor the call
    // that minted the object. The message alone is not actionable.
    observed[name] = `refused: ${describeError(error)}`;
  }
};

/** Blocks until the driving test reports the fork enacted. */
const awaitFork = () =>
  new Promise((resolve, reject) => {
    const lines = createInterface({ input: process.stdin });
    let seen = false;
    process.stdout.write('FORK_AWAIT\n');
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
const environmentFor = (era) => ({
  ...config.environment,
  proofServer: era === 'v8' ? config.proofServerV8 : config.proofServerV9
});

/**
 * Providers for one contract on one side of the boundary.
 *
 * Per contract rather than per session, because each carries its own ZK
 * artifacts and its own private-state store: the run drives thirteen contracts
 * through one wallet, and a shared `zkConfigPath` would serve every one of them
 * the first contract's keys.
 */
const providersFor = (testkit, era, wallet, contractConfiguration) =>
  testkit.initializeMidnightProviders(wallet, environmentFor(era), contractConfiguration);

const buildProviders = async (era, testkit, logger) => {
  const wallet = await testkit.MidnightWalletProvider.build(logger, environmentFor(era), config.walletSeed);
  await wallet.start();
  return {
    wallet,
    providers: providersFor(testkit, era, wallet, {
      zkConfigPath: config.retainedZkConfigPath,
      privateStateStoreName: `fork-${era}`,
      // The retained toolchain emits no `compiler/contract-manifest.json` --
      // `compactc` 0.31.1 predates it -- and integrity verification reads exactly
      // that file. `require` is therefore unsatisfiable for ANY pre-fork artifact,
      // however intact it is, so this drops to `warn` rather than pretending the
      // artifacts are unverifiable for some fixable reason.
      zkConfigIntegrity: { verify: 'warn' }
    })
  };
};

const DOMAIN_SEPARATOR = new Uint8Array(32).fill(7);
const MINT_AMOUNT = 1_000_000n;
const FEE_AMOUNT = 1_000_000n;
const TOKEN_TYPE = new Uint8Array(32).fill(3);

/** Ten minutes back, so a `blockTimeGte` assertion holds however long the legs before it took. */
const tenMinutesAgo = () => BigInt(Math.floor(Date.now() / 1000)) - 600n;

/**
 * The retained-era twins, and what is asked of each on either side of the fork.
 *
 * This is the fork crossing's actual question, finally asked of something other than a
 * counter: the contract is deployed on a ledger-8 chain, called there, and then
 * called AGAIN after the boundary through the same call site, which is the
 * keep-state path. Each twin is `testkit-js-e2e`'s own `.compact` source
 * recompiled with `compactc` 0.31.1 — the same source its current-era namesake
 * in `MATRIX` is built from, so a difference between the two eras is a
 * difference in the framework and not in the contract.
 *
 * `events` has no twin: `emit` is not a language-0.23 form. See
 * `packaging/build-retained-twins.mjs`.
 *
 * The post-fork call varies its domain separator or nonce where the circuit
 * mints, so a keep-state call cannot pass by re-minting the identical coin the
 * pre-fork call already made.
 *
 * `state`, where present, names one ledger field and what it should read on each
 * side of the boundary. It is what separates "the address is still callable" from
 * "the state written before the fork is still there" -- see
 * {@link checkLedgerState}. Two twins carry it, deliberately at opposite ends of
 * circuit weight: `simple` across a `noop`, `shielded-fallible` across the
 * partitioned checkpointed mint-and-send.
 *
 * `unshielded` and `shielded` drive ONE of their circuits here against the
 * several their current-era namesakes drive in `MATRIX`: a retained twin exists
 * to answer the crossing question, and the per-circuit surface is covered on the
 * current era. An era difference confined to the circuits left out would not show.
 */
const RETAINED_MATRIX = [
  {
    key: 'simple',
    preFork: [{ circuitId: 'noop' }],
    postFork: { circuitId: 'noop' },
    // Deploy leaves 0, each `noop` increments.
    state: {
      label: 'round',
      read: (ledgerState) => BigInt(ledgerState.round),
      preFork: 1n,
      postFork: 2n
    }
  },
  {
    key: 'unshielded',
    preFork: [{ circuitId: 'mintUnshieldedToSelfTest', args: () => [DOMAIN_SEPARATOR, MINT_AMOUNT] }],
    postFork: { circuitId: 'mintUnshieldedToSelfTest', args: () => [new Uint8Array(32).fill(8), MINT_AMOUNT] }
  },
  {
    key: 'shielded',
    preFork: [{ circuitId: 'mintShieldedTokens', args: () => [DOMAIN_SEPARATOR, MINT_AMOUNT] }],
    postFork: { circuitId: 'mintShieldedTokens', args: () => [new Uint8Array(32).fill(8), MINT_AMOUNT] }
  },
  {
    key: 'shielded-fallible',
    preFork: [
      {
        circuitId: 'heavyCheckpointMintAndSend',
        args: (context) => [
          DOMAIN_SEPARATOR,
          MINT_AMOUNT,
          new Uint8Array(32).fill(99),
          { bytes: context.coinPublicKey },
          MINT_AMOUNT
        ]
      }
    ],
    postFork: {
      circuitId: 'heavyCheckpointMintAndSend',
      args: (context) => [
        DOMAIN_SEPARATOR,
        MINT_AMOUNT,
        new Uint8Array(32).fill(98),
        { bytes: context.coinPublicKey },
        MINT_AMOUNT
      ]
    },
    // The second state-continuity assertion, and the one that carries weight:
    // `simple` proves state survives across a `noop`, this proves it survives
    // across the heaviest circuit in the set -- the partitioned, checkpointed
    // mint-and-send that finding 1 was about.
    //
    // `counters` is keyed by `persistentHash([mintNonce, domainSep])` and the
    // nonce differs either side of the boundary (99 before, 98 after), so a
    // surviving pre-fork write leaves TWO entries and a silently reset state
    // leaves one. Asserted by size rather than by key, so the hash does not have
    // to be recomputed here -- the count is what distinguishes the two outcomes.
    state: {
      label: 'counters.size',
      read: (ledgerState) => BigInt(ledgerState.counters.size()),
      preFork: 1n,
      postFork: 2n
    }
  },
  {
    key: 'fee-mint',
    preFork: [
      {
        circuitId: 'mintWithUnshieldedFee',
        args: (context) => [
          DOMAIN_SEPARATOR,
          MINT_AMOUNT,
          new Uint8Array(32).fill(123),
          { bytes: context.coinPublicKey },
          FEE_AMOUNT
        ]
      }
    ],
    postFork: {
      circuitId: 'mintWithUnshieldedFee',
      args: (context) => [
        DOMAIN_SEPARATOR,
        MINT_AMOUNT,
        new Uint8Array(32).fill(122),
        { bytes: context.coinPublicKey },
        FEE_AMOUNT
      ]
    }
  },
  {
    key: 'block-time',
    preFork: [{ circuitId: 'testBlockTimeGte', args: () => [tenMinutesAgo()] }],
    postFork: { circuitId: 'testBlockTimeGte', args: () => [tenMinutesAgo()] }
  }
];

/** What each retained twin's deploy and calls produced, carried from the pre-fork legs to the post-fork ones. */
const retainedDeployments = new Map();

const retainedZkConfigPath = (key) => {
  const zkConfigPath = config.retainedMatrixZkConfigPaths?.[key];
  if (zkConfigPath === undefined) {
    throw new Error(`the driver passed no retained ZK artifact path for '${key}'`);
  }
  return zkConfigPath;
};

/**
 * Providers for one retained twin on one side of the boundary.
 *
 * `verify: 'warn'` for the same reason the counter's are: `compactc` 0.31.1
 * emits no `compiler/contract-manifest.json`, so integrity verification has
 * nothing to read for ANY pre-fork artifact.
 */
const retainedProvidersFor = (era, wallet, key) =>
  providersFor(testkit, era, wallet, {
    zkConfigPath: retainedZkConfigPath(key),
    privateStateStoreName: `fork-retained-${key}-${era}`,
    zkConfigIntegrity: { verify: 'warn' }
  });

/** Every verifier key the twin ships, so the deployed contract can answer for any of its circuits. */
const verifierKeysFor = (zkConfigPath) => {
  const keyDir = path.join(zkConfigPath, 'keys');
  const suffix = '.verifier';
  return new Map(
    readdirSync(keyDir)
      .filter((file) => file.endsWith(suffix))
      .map((file) => [file.slice(0, -suffix.length), new Uint8Array(readFileSync(path.join(keyDir, file)))])
  );
};

/**
 * Deploys one retained twin on the pre-fork chain, through protocol's era facade.
 *
 * The same route the counter takes, and for the same reason: `deployContract`'s
 * retained arm refuses unconditionally before any head is read, and the working
 * pipeline is in `contracts/src/internal` where a consumer cannot reach it. This
 * stands in for the pre-fork dApp that would already have deployed the contract.
 */
const deployRetained = async (key, providers, wallet) => {
  const zkConfigPath = retainedZkConfigPath(key);
  const { Contract } = await import(`@midnight-ntwrk/fork-retained-${key}`);
  const [engine, era] = await Promise.all([loadLedger8Engine(), loadLedgerEra('v8')]);

  const constructed = engine.executeConstructor({
    contract: new Contract({}),
    args: [],
    privateState: {},
    coinPk: wallet.getCoinPublicKey()
  });

  const composed = era.composeDeployTx({
    contractState: constructed.contractState.serialize(),
    verifierKeys: verifierKeysFor(zkConfigPath),
    networkId: NETWORK_ID,
    ttl: new Date(Date.now() + 60 * 60_000)
  });

  const proven = await providers.proofProvider.proveTx({ version: 'v8', txBytes: composed.transaction });
  const balanced = await providers.walletProvider.balanceTx(proven);
  const txId = await providers.midnightProvider.submitTx(balanced);
  const state = await waitForContract(providers.publicDataProvider, composed.contractAddress, 5 * 60_000);

  return {
    txId,
    contractAddress: composed.contractAddress,
    indexedAs: state.version,
    envelope: envelopeTag(state.raw)
  };
};

/**
 * Calls one circuit on a retained twin.
 *
 * `compiledContract` takes the raw instance -- the retained era has no
 * `CompiledContract` container -- and a nullary circuit's options carry no
 * `args` member at all.
 */
const callRetained = async (key, providers, contractAddress, call, context) => {
  const { Contract } = await import(`@midnight-ntwrk/fork-retained-${key}`);
  const submitted = await submitCallTx(providers, {
    compiledContract: new Contract({}),
    contractAddress,
    circuitId: call.circuitId,
    ...(call.args === undefined ? {} : { args: call.args(context) })
  });
  // The retained arm resolves `{ circuitId, nextPrivateState, txData }`; both
  // arms of `txData` extend `FinalizedTxRecord`, so status and version are there.
  //
  // `status` is recorded, not asserted. Both arms of `submitCallTx` throw before
  // resolving if the chain reported anything but `SucceedEntirely`
  // (`internal/transaction.ts`, `internal/ledger8-entry.ts`), so a resolved call
  // has already cleared that check and a rejected one arrives in `leg`'s catch.
  return { circuitId: call.circuitId, status: submitted.txData.status, version: submitted.txData.version, txId: submitted.txData.txId };
};

/**
 * Reads one field out of a retained twin's ledger, with the twin's OWN codegen.
 *
 * These are the only measurements in the run that read state written before the
 * boundary. Every other post-fork leg establishes that the address is still
 * callable, which a framework that silently reset the contract's state -- or
 * resolved the address to a fresh one -- would pass just as happily.
 *
 * The field is supplied by the matrix entry rather than fixed here: `simple`
 * has `round: Counter` and `shielded-fallible` has `counters: Map`, and the two
 * cover different things -- state across a trivial circuit, and state across the
 * heaviest one in the set. Contracts declaring no ledger block at all
 * (`unshielded`, `shielded`, `block-time`) cannot be read this way: what
 * survives for them is the contract's BALANCE, which `decodeContractState`
 * deliberately omits and the retained arm of `submitCallTx` does not return
 * either, since it answers `{ circuitId, nextPrivateState, txData }` with no
 * circuit result on it.
 */
const readRetainedLedger = async (key, providers, contractAddress, read) => {
  const [{ ledger }, runtime, { utils }] = await Promise.all([
    import(`@midnight-ntwrk/fork-retained-${key}`),
    import(`@midnight-ntwrk/fork-retained-${key}/runtime`),
    import('@midnight-ntwrk/midnight-js')
  ]);

  // RAW, not `queryContractState`: that path decodes with the head's era and
  // refuses a v8 envelope by design -- the shape `readLedger8Snapshot` uses in
  // `contracts` for the same reason.
  const state = await providers.publicDataProvider.queryRawContractState(contractAddress);
  if (state === null) {
    throw new Error(`the indexer served no contract state for '${key}' at ${contractAddress}`);
  }

  // The era comes off the envelope's OWN tag. Not assumed, and deliberately not
  // `state.version`, which `RawContractState` documents as derived from
  // `protocolVersion` alone and explicitly NOT a statement about the bytes.
  //
  // The two disagree exactly here. A retained contract keeps its pre-fork
  // envelope on a v9 chain until something writes to it, and the post-fork leg
  // CALLS the contract before this read -- which is that write. So one read
  // answers `v8` below the boundary and `v9` above it, and pinning either era
  // fails on the other half. Pinning v8 is what made this leg report
  // `StateDecodeFailedError` for a tag mismatch.
  const era = await loadLedgerEra(utils.contractStateEnvelopeVersion(state.raw));

  // ADR-0007: the era boundary is crossed with plain data only. `extractState`
  // answers with an `EncodedStateValue`, and the twin's OWN runtime turns that
  // back into a handle. Handing over a handle minted anywhere else -- the
  // provider's module included -- is what `ledger()` refuses with
  // `expected instance of ChargedState`.
  const encoded = era.extractState(state.raw);
  return read(ledger(runtime.StateValue.decode(encoded)));
};

/**
 * Checks one of a twin's ledger fields against what the calls so far should have
 * left in it.
 *
 * A mismatch is recorded rather than thrown: the call itself succeeded, and "the
 * call worked but the state did not carry" is a different and far more
 * interesting row than a failed call. Twins declaring no `state` are skipped.
 */
const checkLedgerState = async (label, entry, phase, providers, contractAddress) => {
  const expected = entry.state?.[phase];
  if (expected === undefined) {
    return undefined;
  }
  const actual = await readRetainedLedger(entry.key, providers, contractAddress, entry.state.read);
  if (actual !== expected) {
    failures.push(`${label}: ledger ${entry.state.label} is ${actual}, expected ${expected}`);
  }
  return { [entry.state.label]: actual.toString() };
};

const walletContext = async (wallet) => ({
  coinPublicKey: new Uint8Array(Buffer.from(wallet.getCoinPublicKey(), 'hex')),
  unshieldedAddress: new Uint8Array(Buffer.from((await wallet.wallet.unshielded.getAddress()).hexString, 'hex'))
});

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
  const { Contract } = await import('@midnight-ntwrk/fork-retained-baseline');
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
  process.stdout.write(`FORK_CONTRACT ${composed.contractAddress}\n`);
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
  const { Contract } = await import('@midnight-ntwrk/fork-retained-baseline');
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
  // The RETAINED arm resolves a `Ledger8FinalizedCallTxData` -- `{ circuitId,
  // nextPrivateState, txData }` -- so the id is on the finalized record it carries.
  // Neither `submitted.txId` nor `submitted.public.txId` exists here: `.public` is the
  // CURRENT era's `FinalizedCallTxData` shape, and reaching for it on this arm throws a
  // TypeError inside the reporting rather than reporting what the call did.
  return { txId: submitted.txData.txId };
});

// (a) continued: the rest of the retained-era contracts, deployed and called on
// the pre-fork chain. Same source as the current-era matrix below, built with
// `compactc` 0.31.1, so the pair differ only in the toolchain that emitted them.
for (const entry of RETAINED_MATRIX.filter((candidate) => covers(SELECTED.retained, candidate.key))) {
  await leg(`pre-fork retained ${entry.key}`, async () => {
    const providers = retainedProvidersFor('v8', session.wallet, entry.key);
    const deployed = await deployRetained(entry.key, providers, session.wallet);
    retainedDeployments.set(entry.key, deployed);

    const context = await walletContext(session.wallet);
    const calls = [];
    for (const call of entry.preFork) {
      calls.push(await callRetained(entry.key, providers, deployed.contractAddress, call, context));
    }
    const ledgerState = await checkLedgerState(
      `pre-fork retained ${entry.key}`,
      entry,
      'preFork',
      providers,
      deployed.contractAddress
    );
    return { ...deployed, calls, ...(ledgerState ?? {}) };
  });
}

// (a) continued, as a probe rather than an assertion: what a consumer sees if
// they point a current-era contract at a chain that has not forked yet. Nothing
// in the spec says which side refuses it, or with what -- and "the deploy just
// worked" would be the largest finding of the run.
await probe('pre-fork deploy of a current-era contract', async () => {
  const zkConfigPath = config.matrixZkConfigPaths?.simple;
  if (zkConfigPath === undefined) {
    throw new Error("the driver passed no ZK artifact path for 'simple'");
  }
  const { Contract } = await import('@midnight-ntwrk/fork-current-simple');
  const compiledContract = CompiledContract.withCompiledFileAssets(
    CompiledContract.withVacantWitnesses(CompiledContract.make('Simple', Contract)),
    zkConfigPath
  );
  const deployed = await deployContract(
    providersFor(testkit, 'v8', session.wallet, {
      zkConfigPath,
      privateStateStoreName: 'fork-prefork-current'
    }),
    { compiledContract }
  );
  return {
    accepted: true,
    contractAddress: deployed.deployTxData.public.contractAddress,
    txId: deployed.deployTxData.public.txId
  };
});

// ── (b) the fork moment ───────────────────────────────────────────────────────

// These two gate everything below them, so they are the one place `leg`'s
// record-and-continue is wrong. Without the gate a chain that never forked, or a
// session still pointed at the v8 proof server, produces ~15 individually
// plausible contract failures for one root cause -- and the retained keep-state
// rows read FAILED for calls that were never attempted after the boundary.
const forked = await legSucceeded('fork enacted', () => awaitFork(), FORK_WAIT_TIMEOUT);

const crossed =
  forked &&
  (await legSucceeded('post-fork head era', async () => {
    const era = await waitForHead(session.providers.publicDataProvider, 'v9', 5 * 60_000);
    // Stop first, so the two wallets never hold the same seed at once. If the
    // rebuild then throws, `session` is left holding a stopped wallet -- which
    // is why the gate below makes that fatal rather than letting fifteen legs
    // fail against it one at a time.
    await session.wallet.stop().catch(() => undefined);
    session = await buildProviders('v9', testkit, logger);
    return era;
  }));

if (!crossed) {
  failures.push('the run never reached a post-fork head, so nothing below the boundary was measured');
  report(1);
}

// Diagnostic, not an acceptance criterion: does the migration re-version the
// contract-state envelope, and if not, does it do so later? The framework refuses
// a pre-fork envelope under a post-fork head, so keep-state depends on this.
await leg('envelope tag across the boundary', () =>
  sampleEnvelope(session.providers.publicDataProvider, deployment.contractAddress, 6, 10_000)
);

// ── (c) post-fork: the SAME call site, now on keep-state ──────────────────────

await leg('post-fork keep-state call through the same call site', async () => {
  const { Contract } = await import('@midnight-ntwrk/fork-retained-baseline');
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
  // The RETAINED arm resolves a `Ledger8FinalizedCallTxData` -- `{ circuitId,
  // nextPrivateState, txData }` -- so the id is on the finalized record it carries.
  // Neither `submitted.txId` nor `submitted.public.txId` exists here: `.public` is the
  // CURRENT era's `FinalizedCallTxData` shape, and reaching for it on this arm throws a
  // TypeError inside the reporting rather than reporting what the call did.
  return { txId: submitted.txData.txId };
});

// (c) continued: the same keep-state call for every other retained twin. These
// are the legs the fork crossing could not previously pose — a pre-fork contract that is not a
// counter, called after the boundary through the call site that deployed it.
for (const entry of RETAINED_MATRIX.filter((candidate) => covers(SELECTED.retained, candidate.key))) {
  await leg(`post-fork keep-state ${entry.key}`, async () => {
    const deployed = retainedDeployments.get(entry.key);
    if (deployed === undefined) {
      // Named rather than left to a TypeError: this leg is UNTESTED, not failed,
      // and the two read very differently in a report.
      throw new Error(`its pre-fork deploy did not complete, so there is nothing here to call`);
    }
    const providers = retainedProvidersFor('v9', session.wallet, entry.key);
    const context = await walletContext(session.wallet);
    const outcome = await callRetained(entry.key, providers, deployed.contractAddress, entry.postFork, context);
    // The state written BEFORE the boundary, read back after it. Without this
    // the leg proves only that the address still answers.
    const ledgerState = await checkLedgerState(
      `post-fork keep-state ${entry.key}`,
      entry,
      'postFork',
      providers,
      deployed.contractAddress
    );
    const state = await providers.publicDataProvider.queryRawContractState(deployed.contractAddress);
    return {
      contractAddress: deployed.contractAddress,
      call: outcome,
      ...(ledgerState ?? {}),
      // The envelope after the call, so a keep-state write that re-versions the
      // state is distinguishable from one that leaves it in the retained shape.
      envelopeAfterCall: state === null ? 'absent' : envelopeTag(state.raw)
    };
  });
}

// ── (d) reads its own pre-fork history ────────────────────────────────────────

await leg('reads its own pre-fork history', async () => {
  const state = await session.providers.publicDataProvider.queryRawContractState(deployment.contractAddress);
  if (state === null) {
    throw new Error('the contract deployed before the fork is no longer readable after it');
  }
  return { version: state.version, protocolVersion: state.protocolVersion };
});

// ── (e) the rest of the contract surface, on a chain that carries v8 history ──
//
// Not the fork crossing's retained story, and deliberately not dressed up as one: these are
// the CURRENT-era builds, deployed fresh after the boundary. Six of the seven
// were also deployed below it as retained twins in (a); `events` is the one that
// has no retained form at all. What this section answers is the separate
// question the fork crossing leaves open -- whether a dApp doing ordinary work (tokens,
// minting, events, block time) is affected by the chain having a pre-fork past.
// Every leg runs in the same process and against the same wallet that just
// crossed the fork.

/**
 * The contracts and the circuits driven against each.
 *
 * Circuit ids and argument shapes are taken from the e2e suite's own tests
 * rather than re-derived from the `.compact` sources, so a leg that fails here
 * fails for a reason the fork introduced and not because this file guessed an
 * encoding. `capture` names where a circuit's return value is kept for a later
 * call in the same contract's run.
 */
const MATRIX = [
  { key: 'simple', tag: 'Simple', calls: [{ circuitId: 'noop' }] },
  {
    key: 'unshielded',
    tag: 'Unshielded',
    calls: [
      { circuitId: 'mintUnshieldedToSelfTest', args: () => [DOMAIN_SEPARATOR, MINT_AMOUNT], capture: 'color' },
      // `unshielded.balance.it.test.ts:136` asserts this equals what was minted.
      { circuitId: 'getUnshieldedBalanceTest', args: (context) => [context.color], expect: MINT_AMOUNT },
      {
        circuitId: 'mintUnshieldedToUserTest',
        args: (context) => [new Uint8Array(32).fill(2), { bytes: context.unshieldedAddress }, MINT_AMOUNT]
      }
    ]
  },
  {
    key: 'shielded',
    tag: 'Shielded',
    calls: [
      { circuitId: 'mintShieldedTokens', args: () => [DOMAIN_SEPARATOR, MINT_AMOUNT] },
      {
        circuitId: 'mintAndSendShielded',
        args: (context) => [
          DOMAIN_SEPARATOR,
          MINT_AMOUNT,
          new Uint8Array(32).fill(42),
          { bytes: context.coinPublicKey },
          MINT_AMOUNT
        ]
      }
    ]
  },
  {
    key: 'shielded-fallible',
    tag: 'ShieldedFallible',
    calls: [
      {
        // #876's regression: the user-bound shielded output has to land in the
        // fallible offer. The e2e test stops at the transcript; this one submits,
        // which is the stronger reading -- a misrouted output is refused by the
        // balancer or by the chain rather than merely looking wrong.
        circuitId: 'heavyCheckpointMintAndSend',
        args: (context) => [
          DOMAIN_SEPARATOR,
          MINT_AMOUNT,
          new Uint8Array(32).fill(99),
          { bytes: context.coinPublicKey },
          MINT_AMOUNT
        ]
      }
    ]
  },
  {
    key: 'fee-mint',
    tag: 'FeeMint',
    calls: [
      {
        // #731 / #877: a shielded mint and an unshielded fee receive in one
        // circuit. Submitted here for the same reason as above.
        circuitId: 'mintWithUnshieldedFee',
        args: (context) => [
          DOMAIN_SEPARATOR,
          MINT_AMOUNT,
          new Uint8Array(32).fill(123),
          { bytes: context.coinPublicKey },
          FEE_AMOUNT
        ]
      }
    ]
  },
  {
    key: 'events',
    tag: 'Events',
    calls: [
      // Both exercised by the suite: `contracts.events.provider.it.test.ts:78`
      // and `contracts.events.unshielded.it.test.ts:75`. The sibling
      // `emitUnshieldedMint` has the same shape but no test anywhere in the
      // repo, so it would have been this file guessing rather than borrowing.
      { circuitId: 'emitLifecycle' },
      { circuitId: 'emitUnshieldedReceive', args: () => [TOKEN_TYPE, MINT_AMOUNT] }
    ]
  },
  {
    key: 'block-time',
    tag: 'BlockTime',
    // Ten minutes back, so the assertion holds however long the legs above took.
    calls: [{ circuitId: 'testBlockTimeGte', args: () => [BigInt(Math.floor(Date.now() / 1000)) - 600n] }]
  }
];

/**
 * Builds the `CompiledContract` container for one wrapped contract package.
 *
 * Every matrix contract declares no witnesses, so `withVacantWitnesses` is right
 * for all of them -- the one that does (`counter`) is not in the matrix. The
 * assets path is set for completeness; the ZK artifacts are actually served by
 * the provider's own base path.
 */
const compiledContractFor = async (entry, zkConfigPath) => {
  const module = await import(`@midnight-ntwrk/fork-current-${entry.key}`);
  const contract = module.Contract ?? module.default?.Contract;
  if (typeof contract !== 'function') {
    throw new Error(`@midnight-ntwrk/fork-current-${entry.key} exports no Contract`);
  }
  return CompiledContract.withCompiledFileAssets(
    CompiledContract.withVacantWitnesses(CompiledContract.make(entry.tag, contract)),
    zkConfigPath
  );
};

const runMatrixContract = async (entry) => {
  const zkConfigPath = config.matrixZkConfigPaths?.[entry.key];
  if (zkConfigPath === undefined) {
    throw new Error(`the driver passed no ZK artifact path for '${entry.key}'`);
  }
  const compiledContract = await compiledContractFor(entry, zkConfigPath);
  const providers = providersFor(testkit, 'v9', session.wallet, {
    zkConfigPath,
    privateStateStoreName: `fork-matrix-${entry.key}`
  });

  const deployed = await deployContract(providers, { compiledContract });
  const contractAddress = deployed.deployTxData.public.contractAddress;
  await waitForContract(providers.publicDataProvider, contractAddress, 5 * 60_000);

  const context = {
    coinPublicKey: new Uint8Array(Buffer.from(session.wallet.getCoinPublicKey(), 'hex')),
    unshieldedAddress: new Uint8Array(
      Buffer.from((await session.wallet.wallet.unshielded.getAddress()).hexString, 'hex')
    )
  };

  const calls = [];
  for (const call of entry.calls) {
    // Sequential, and each one recorded before the next runs: a later call may
    // depend on an earlier one's return value, and stopping at the first failure
    // would hide which of a contract's circuits still work.
    try {
      const submitted = await submitCallTx(providers, {
        compiledContract,
        contractAddress,
        circuitId: call.circuitId,
        ...(call.args === undefined ? {} : { args: call.args(context) })
      });
      if (call.capture !== undefined) {
        context[call.capture] = submitted.private.result;
      }
      // The circuit's own return value, where the e2e test this was taken from
      // asserts one. Submitting successfully is not the same as computing the
      // right answer: `getUnshieldedBalanceTest` returning 0n means the mint
      // credited nothing, and every status in sight would still be green.
      if (call.expect !== undefined) {
        const actual = submitted.private.result;
        if (actual !== call.expect) {
          failures.push(`post-fork ${entry.key}/${call.circuitId}: returned ${actual}, expected ${call.expect}`);
        }
      }
      // `status` is recorded, not asserted: `submitCallTx` throws before
      // resolving on anything but `SucceedEntirely` (`internal/transaction.ts`),
      // so a rejected call lands in the catch below rather than here.
      calls.push({ circuitId: call.circuitId, status: submitted.public.status, txId: submitted.public.txId });
    } catch (error) {
      const message = describeError(error);
      calls.push({ circuitId: call.circuitId, status: `FAILED: ${message}` });
      failures.push(`post-fork ${entry.key}/${call.circuitId}: ${message}`);
    }
  }

  return { contractAddress, deployTxId: deployed.deployTxData.public.txId, calls };
};

for (const entry of MATRIX.filter((candidate) => covers(SELECTED.current, candidate.key))) {
  // One leg per contract, so the report names the contract that failed. A leg
  // that throws does not stop the ones after it -- `leg` records and continues.
  await leg(`post-fork ${entry.key}`, () => runMatrixContract(entry));
}

await session.wallet?.stop().catch(() => undefined);
report(failures.length === 0 ? 0 : 1);
