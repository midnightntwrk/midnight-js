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
// @ts-check
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
import { createInterface } from 'node:readline';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

// WHERE EACH NAME COMES FROM IS PART OF WHAT THIS FILE TESTS. A consumer holds
// the published surface and nothing else, so reaching past it here would prove
// the framework works through a door its users do not have.
//
// The entry points come off `contracts`, their own package. `networkHeadVersion`
// and `CompiledContract` are published too, but on the BARREL -- `protocol`'s
// root is not a consumer-facing import, and taking them off it made this file
// look like it needed one. See `packages/midnight-js/src/index.ts` and
// `src/protocol.ts` for the published set.
import { deployContract, findDeployedContract, StaleHeadError, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { networkHeadVersion, protocol } from '@midnight-ntwrk/midnight-js';
// THE ONE IMPORT HERE THAT IS NOT CONSUMER-FACING, and it is a gap in
// `contracts`, not a shortcut taken here. `readRetainedLedger` has to decode a
// RETAINED-era contract state served by the indexer, and `contracts` publishes
// no way to: `getStates`/`getPublicStates` decode with the current era and
// refuse anything else, and the `Ledger8` namespace carries types and errors but
// no decoder. The only public alternative is `nextContractStateEncoded` off a
// call result -- the state the call computed LOCALLY, not the state the chain
// stored, which is the whole of what the continuity assertions are about.
// Tracked as the `getPublicStates` retained-arm gap; when that lands, this
// import goes and `readRetainedLedger` moves onto it.
import { loadLedgerEra } from '@midnight-ntwrk/midnight-js-protocol';

const { CompiledContract } = protocol;

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
 *
 * `ms` is a BACKSTOP, not the probe's budget. A probe that runs a loop of its own
 * has to bound each iteration itself and pass a deadline derived from that -- the
 * default here is fatal when it fires, so a probe relying on it to stop would be
 * a probe that ends the run.
 */
const probe = async (name, run, ms = LEG_TIMEOUT) => {
  if (reported) {
    return;
  }
  try {
    const result = await withDeadline(name, ms, run);
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
 * `consumer-e2e/build-retained-twins.mjs`.
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
/**
 * The step `private-counter`'s witness reads out of private state, chosen PER RUN.
 *
 * It used to be the literal 7, in the initial state and in all four expected
 * figures. That left one gap open: nothing separated "the witness read `step`
 * back out of the store" from "the store answers with a constant that happens to
 * be 7". A default, a replay double, or a layer that rebuilt private state from
 * the contract's own initial value would all satisfy 7/14/21/28.
 *
 * A value this process mints and nothing else can predict closes it: the figures
 * become reachable only by reading back what THIS run wrote.
 *
 * NOT a coin toss inside a release gate, which is the thing this file refuses
 * elsewhere. The INPUT varies and the expected figures are derived from it, so
 * the outcome stays deterministic -- and the value is reported on every
 * `privateState` row, so a failure names the run's own number rather than hiding
 * it.
 *
 * Bounded well inside `Uint<16>`, which the witness returns: the ledger reaches
 * `4 * step` over the run, so the ceiling that matters is 16383.
 */
const PRIVATE_COUNTER_STEP = BigInt(7 + (Date.now() % 97));

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
      postFork: 2n,
      secondCall: 3n
    }
  },
  {
    key: 'unshielded',
    // WHY THIS TWIN ASSERTS THROUGH A CIRCUIT AND NOT THROUGH `state`.
    //
    // What survives for `unshielded` is the contract's BALANCE: it declares no
    // ledger block, so `readRetainedLedger` cannot reach it. The circuit that
    // reads it back is `getUnshieldedBalanceTest`, and this twin drives it
    // across the boundary.
    //
    // That read used to be REFUSED here, and the refusal was the framework's:
    // the retained arm handed the runtime a `ChargedState`, which carries no
    // balance, so every retained circuit executed against an empty one. A read
    // of a HELD colour therefore built a transcript claiming zero, and the node
    // refused it for disagreeing with the balance it really held (#1345). An
    // UNHELD colour agreed by accident, which is why a probe that swapped the
    // colour looked green and settled nothing.
    //
    // The read below is now the assertion, and the send after it is independent
    // evidence of the same survival through a different mechanism.
    preFork: [
      {
        circuitId: 'mintUnshieldedToSelfTest',
        args: () => [DOMAIN_SEPARATOR, MINT_AMOUNT],
        // The minted colour, which is what the post-fork send has to name. Kept
        // across the boundary by `retainedCaptures`, since a context rebuilt per
        // leg cannot carry one.
        capture: 'preForkColor'
      }
    ],
    postFork: [
      // THE SURVIVING-BALANCE ASSERTION, and the regression guard for #1345.
      // FIRST, before the send below moves half of it: what this has to read is
      // the balance the fork carried over untouched.
      {
        circuitId: 'getUnshieldedBalanceTest',
        args: (context) => [context.preForkColor],
        expect: MINT_AMOUNT
      },
      // The same survival through a write, kept because it rests on nothing the
      // read rests on: a send out of the contract can only move a colour it
      // still holds, and unlike a read it has a guaranteed segment.
      //
      // TO THE USER, not to `kernel.self()`, and the difference is measured
      // rather than assumed. `unshielded.mint-and-send.it.test.ts` pins a
      // self-send at `spent.length === 0` AND `created.length === 0`: it moves
      // nothing, so it cannot be evidence that anything was there to move.
      // `unshielded.transfer.it.test.ts` pins the user-send at
      // `created.length === 1` -- a real output leaves the contract. Only the
      // second can carry an assertion. The handoff prompt proposed the first.
      //
      // HALF the balance, so the negative control below can ask for more than
      // the contract holds without that being true for trivial reasons.
      {
        circuitId: 'sendUnshieldedToUserTest',
        args: (context) => [context.preForkColor, MINT_AMOUNT / 2n, { bytes: context.unshieldedAddress }]
      },
      // A mint as well, and not for the assertion: the send moves a colour to
      // the contract itself, so it may net to nothing in the stored state, and
      // this leg is also what migrates the envelope for the second-call leg
      // below. A write that definitely writes keeps that guarantee explicit.
      { circuitId: 'mintUnshieldedToSelfTest', args: () => [new Uint8Array(32).fill(8), MINT_AMOUNT] }
    ],
    // Named rather than defaulted to `postFork`, which is a LIST here: the
    // second-call leg drives one call, and a third domain separator keeps this
    // from colliding with either mint above.
    secondCall: { circuitId: 'mintUnshieldedToSelfTest', args: () => [new Uint8Array(32).fill(6), MINT_AMOUNT] }
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
    // A THIRD nonce for the second post-fork call, and the reason is the same one that made
    // `counters` the right field to read: the key is `persistentHash([mintNonce, domainSep])`, so
    // reusing the post-fork nonce would overwrite that call's own entry and leave the size at 2
    // whether the second call wrote or did nothing at all. A distinct nonce makes the size the
    // thing that answers.
    secondCall: {
      circuitId: 'heavyCheckpointMintAndSend',
      args: (context) => [
        DOMAIN_SEPARATOR,
        MINT_AMOUNT,
        new Uint8Array(32).fill(97),
        { bytes: context.coinPublicKey },
        MINT_AMOUNT
      ]
    },
    state: {
      label: 'counters.size',
      read: (ledgerState) => BigInt(ledgerState.counters.size()),
      preFork: 1n,
      postFork: 2n,
      secondCall: 3n
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
    },
    // The same shape as `shielded-fallible`: `counters` keyed by
    // `persistentHash([mintNonce, domainSep])`, and the nonce already differs
    // across the boundary (123 before, 122 after), so a surviving pre-fork write
    // leaves two entries where a reset leaves one.
    secondCall: {
      circuitId: 'mintWithUnshieldedFee',
      args: (context) => [
        DOMAIN_SEPARATOR,
        MINT_AMOUNT,
        new Uint8Array(32).fill(121),
        { bytes: context.coinPublicKey },
        FEE_AMOUNT
      ]
    },
    state: {
      label: 'counters.size',
      read: (ledgerState) => BigInt(ledgerState.counters.size()),
      preFork: 1n,
      postFork: 2n,
      secondCall: 3n
    }
  },
  {
    key: 'block-time',
    preFork: [{ circuitId: 'testBlockTimeGte', args: () => [tenMinutesAgo()] }],
    postFork: { circuitId: 'testBlockTimeGte', args: () => [tenMinutesAgo()] }
  },
  {
    // THE ONLY TWIN THAT CARRIES PRIVATE STATE, and the only one whose
    // assertions are about the dApp's own storage rather than the chain's.
    //
    // No other contract in this matrix declares a witness, so nothing in the run
    // could show private state surviving the boundary: the round trip would be
    // `{}` in, `{}` out. Continuity was asserted only at
    // unit tier, against a frozen LevelDB store
    // (`testkit-js/.../cross-window.ut.test.ts`) -- real, but offline, and with
    // no chain and no fork in it.
    //
    // WHAT MAKES THE POST-FORK CALL EVIDENCE. `localIncrement` reads `step` out
    // of private state and discloses it to the ledger, so `round` is a
    // statement about what the witness could still read. `step` is written ONCE,
    // before the boundary. A post-fork call that reached a fresh or reset
    // private state cannot reach `2 * step`: it would read no `step` at all and
    // fail, or read a different one and leave a different number. The ledger
    // figures below are therefore the private-state assertion, checked against
    // the chain rather than against this process's own memory -- and
    // `privateState` below checks the store itself, which is the other half.
    key: 'private-counter',
    // `calls` is what the witness writes back on every execution, so it counts
    // executions the dApp's storage actually recorded. `step` is what it reads.
    // Neither survives a store that was silently re-created.
    privateState: {
      id: 'fork-private-counter',
      initial: { step: PRIVATE_COUNTER_STEP, calls: 0n },
      // Deploy runs no circuit -- the constructor reads no witness -- so the
      // count only moves on calls.
      preFork: { step: PRIVATE_COUNTER_STEP, calls: 1n },
      postFork: { step: PRIVATE_COUNTER_STEP, calls: 2n },
      secondCall: { step: PRIVATE_COUNTER_STEP, calls: 3n },
      // The call driven through the handle `findDeployedContract` returned, which
      // is a different object from the one every leg above used. A witness that
      // ran against a re-attached handle and still read `step` is the store
      // answering a caller that arrived with nothing but an address and an id.
      afterFind: { step: PRIVATE_COUNTER_STEP, calls: 4n }
    },
    witnesses: () => ({
      localIncrement: (context) => [
        { ...context.privateState, calls: context.privateState.calls + 1n },
        context.privateState.step
      ]
    }),
    preFork: [{ circuitId: 'increment' }],
    postFork: { circuitId: 'increment' },
    secondCall: { circuitId: 'increment' },
    // Driven through the re-attached handle rather than through `callRetained`,
    // which is the whole point of declaring it: see leg (c3).
    afterFind: { circuitId: 'increment' },
    state: {
      label: 'round',
      read: (ledgerState) => BigInt(ledgerState.round),
      preFork: PRIVATE_COUNTER_STEP,
      postFork: 2n * PRIVATE_COUNTER_STEP,
      secondCall: 3n * PRIVATE_COUNTER_STEP,
      afterFind: 4n * PRIVATE_COUNTER_STEP
    }
  }
];

/**
 * The phases every declared `state` and `privateState` block must name.
 *
 * WHY THIS IS CHECKED AT ALL. Both `checkLedgerState` and `checkPrivateState`
 * answer `undefined` for a phase they were not given an expectation for, and the
 * call sites spread that into the row as `...(x ?? {})`. A misspelled phase key
 * therefore asserts NOTHING and leaves no trace: the leg still reports `ok` and
 * the run is green. That is the one failure this whole file exists to make
 * impossible, so a typo has to be a startup error rather than a silent pass.
 *
 * `afterFind` is deliberately NOT here. It is opt-in -- only a twin willing to
 * pay for a fourth call declares it -- whereas these three are driven for every
 * twin, so a block that omits one of them is a mistake rather than a choice.
 */
const ASSERTED_PHASES = ['preFork', 'postFork', 'secondCall'];

for (const entry of RETAINED_MATRIX) {
  for (const block of ['state', 'privateState']) {
    if (entry[block] === undefined) {
      continue;
    }
    for (const phase of ASSERTED_PHASES) {
      if (entry[block][phase] === undefined) {
        throw new Error(`retained twin '${entry.key}' declares '${block}' but names no '${phase}' expectation`);
      }
    }
    // Declared but never driven: an `afterFind` expectation with no `afterFind`
    // call would be checked against whatever the previous leg left, and pass.
    if (entry[block].afterFind !== undefined && entry.afterFind === undefined) {
      throw new Error(`retained twin '${entry.key}' expects '${block}.afterFind' but drives no afterFind call`);
    }
  }
}

/** One twin's declaration, by key. Throws because every caller needs the entry and none can proceed without it. */
const retainedEntry = (key) => {
  const entry = RETAINED_MATRIX.find((candidate) => candidate.key === key);
  if (entry === undefined) {
    throw new Error(`'${key}' is not a retained twin`);
  }
  return entry;
};

/**
 * The witness object one twin's contract instance is constructed with.
 *
 * `{}` for the twins that declare none, which is what every twin but
 * `private-counter` does -- their codegen has an empty `Witnesses` type, so an
 * empty object is the complete implementation rather than a stub.
 */
const retainedWitnesses = (key) => retainedEntry(key).witnesses?.() ?? {};

/** What each retained twin's deploy and calls produced, carried from the pre-fork legs to the post-fork ones. */
const retainedDeployments = new Map();

/**
 * What each retained twin's circuits RETURNED, by twin key, for the legs that
 * come after.
 *
 * Separate from the per-leg context and from `retainedDeployments` because it
 * is the one thing that has to cross the fork: a context is rebuilt on every
 * leg -- it has to be, since the wallet is replaced at the `post-fork head era`
 * gate -- so a value produced before the boundary has nowhere else to live.
 * `unshielded` is the only twin that needs it today: the colour it minted
 * pre-fork is what the post-fork send must name, and a colour cannot be
 * recomputed from anything this file holds.
 */
const retainedCaptures = new Map();

/**
 * The retained twins whose post-fork call list ran to the END.
 *
 * `callRetained` THROWS on a failed `expect`, which stops the remaining calls in
 * the list -- deliberately, so the next one does not run against state the
 * assertion just denied. For `unshielded` that list ends with the mint that
 * migrates the envelope, so a wrong balance figure also leaves the second-call
 * leg below reading `envelopeBefore: 'retained'` and presenting it as evidence
 * that the first call did not migrate. One real failure, two findings, and the
 * second one points somewhere else entirely.
 *
 * So the second-call leg asks this before it interprets anything.
 */
const retainedPostForkCompleted = new Set();

/**
 * The wallet's current keys, plus whatever this twin captured on an earlier leg.
 *
 * A function rather than three call sites building the object, and that is the
 * whole point: when the post-fork leg built its context from `walletContext`
 * alone, `sendUnshieldedToUserTest` was handed `undefined` for the colour and
 * died inside the twin's own codegen on `reading 'buffer'`. Every retained leg
 * now reaches its context the same way, so a twin that adds a `capture` cannot
 * be read correctly on one leg and not on the next.
 *
 * Captures FIRST: the wallet's keys are re-read on every call and must win over
 * anything a circuit happened to return under the same name.
 */
const retainedContext = async (key) => ({
  ...retainedCaptures.get(key),
  ...(await walletContext(session.wallet))
});

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
 *
 * THE STORE NAME CARRIES NO ERA, and that is the point rather than a tidy-up.
 * It used to be `fork-retained-${key}-${era}`, which gave the run two private
 * state stores per twin and silently made three things unmeasurable:
 *
 * - private state written before the boundary, read after it -- the whole
 *   subject of the `private-counter` twin, which lands under this name itself;
 * - the signing key the retained deploy persists, which a post-fork
 *   `findDeployedContract` reports back, and which lands under
 *   `${privateStateStoreName}-signing-keys`;
 * - anything else a consumer would keep across the fork.
 *
 * Both names are DERIVED from this one, which is why an era in it split both.
 *
 * A real dApp has ONE store and does not re-key it when the chain forks, so the
 * era-suffixed name modelled something no consumer does. The legs that needed
 * it would have failed for a harness reason and read as framework defects.
 */
const retainedProvidersFor = (era, wallet, key) =>
  providersFor(testkit, era, wallet, {
    zkConfigPath: retainedZkConfigPath(key),
    privateStateStoreName: `fork-retained-${key}`,
    zkConfigIntegrity: { verify: 'warn' }
  });

/**
 * Deploys one retained twin on the pre-fork chain, through the public entry point.
 *
 * `deployContract`'s retained arm, which is the surface a consumer has. This
 * used to hand-roll the deploy against protocol's era facade, because the arm
 * refused unconditionally: that route measured `protocol` and left a regression
 * in the public arm invisible to every twin in the matrix.
 *
 * Options read exactly like `callRetained`'s: `compiledContract` takes the RAW
 * instance -- the retained era has no `CompiledContract` container -- and every
 * twin's constructor is nullary, so `args` is the empty tuple. Written out
 * rather than omitted, for the reason `callRetained` records: an absent `args`
 * and `args: []` are the same thing to both entry points, and only the second
 * form typechecks from a helper this generic.
 *
 * The private-state pair is named only by a twin that declares one. For the
 * others it stays absent, and that is not an omission: their constructors read
 * no witness, and the retained runtime passes an absent private state straight
 * through to `currentPrivateState` rather than refusing it -- measured against
 * the real 0.16 runtime, where `undefined` is what comes back and `{}` is only
 * what a replay double answers.
 *
 * THE TWO OPTIONS OBJECTS ARE WRITTEN OUT IN FULL rather than built by spreading
 * `privateStateId` in conditionally. `Ledger8DeployContractOptions` is a union
 * whose private-state arm REQUIRES the id while the other arm forbids it, so a
 * conditionally spread member -- which the checker sees as optional -- matches
 * neither. Unlike `args` there is no neutral value to pass: an explicit
 * `privateStateId: undefined` is refused by the entry point itself, and
 * deliberately, as a caller who believes they named an id. A branch per arm is
 * the only form that both typechecks and says what it means.
 *
 * The arm resolves a verifier key per entry point the artifact declares, so the
 * `keys/*.verifier` sweep this used to do by hand is gone. Same set either way:
 * every twin circuit is an `export circuit`, so each one lands in
 * `impureCircuits` AND ships a key on disk.
 */
const deployRetained = async (key, providers) => {
  const { Contract } = await import(`@midnight-ntwrk/fork-retained-${key}`);
  const compiledContract = new Contract(retainedWitnesses(key));
  const privateState = retainedEntry(key).privateState;
  const deployed =
    privateState === undefined
      ? await deployContract(providers, { compiledContract, args: [] })
      : await deployContract(providers, {
          compiledContract,
          args: [],
          privateStateId: privateState.id,
          initialPrivateState: privateState.initial
        });
  const state = await waitForContract(providers.publicDataProvider, deployed.contractAddress, 5 * 60_000);

  // `deployTxData` is a `VersionedFinalizedTxData`, which carries `txId` at the
  // top level on BOTH arms -- not under `.public`, which is where the CURRENT
  // era's `DeployedContract` puts it. The two results differ exactly here.
  return {
    txId: deployed.deployTxData.txId,
    contractAddress: deployed.contractAddress,
    indexedAs: state.version,
    envelope: envelopeTag(state.raw),
    // The key the arm persisted for this address, CARRIED IN PROCESS ONLY so the
    // post-fork `findDeployedContract` leg has something to compare against that
    // was observed rather than assumed. `reportableDeployment` is what keeps it
    // off the report -- see there for why that is not optional.
    signingKey: deployed.signingKey
  };
};

/**
 * A deploy record stripped to what may be written to the report.
 *
 * `report` JSON-stringifies `observed` to stdout, and the driver echoes every
 * dApp line into its own, so ANYTHING a leg returns lands in a CI log -- a public
 * one, for this repository. `signingKey` is annotated
 * `**Privacy-sensitive.** Signing-key material` where the framework declares it,
 * and leg (c3)'s `signingKeySurvived` carries the entire assertion without the
 * material.
 *
 * Written as an ALLOW-LIST rather than by deleting the one member known to be
 * sensitive today, so a field added to the deploy record later has to be opted
 * IN to the log rather than remembered and opted out.
 */
const reportableDeployment = (deployed) => ({
  txId: deployed.txId,
  contractAddress: deployed.contractAddress,
  indexedAs: deployed.indexedAs,
  envelope: deployed.envelope
});

/**
 * Calls one circuit on a retained twin.
 *
 * `compiledContract` takes the raw instance -- the retained era has no
 * `CompiledContract` container.
 *
 * `args` is always PRESENT, and `[]` for a nullary circuit rather than absent.
 * Behaviourally identical -- both entry points normalise an absent `args` with
 * `'args' in options ? options.args : []` (`deploy-contract.ts`,
 * `internal/ledger8-entry.ts`, `unproven-call-tx.ts`) -- and it is what lets
 * this call site be TYPECHECKED. The options types make `args` conditional on
 * the circuit's own parameter list, and a conditionally SPREAD member reaches
 * the checker as optional, which no arm of that conditional accepts. This
 * helper is deliberately generic over every twin and circuit, so it cannot
 * satisfy the conditional by being specific; passing the empty tuple does it
 * instead. `args: undefined` would NOT: `'args' in options` is then true and
 * the normalisation hands `undefined` straight through.
 */
const callRetained = async (key, providers, contractAddress, call, context) => {
  const { Contract } = await import(`@midnight-ntwrk/fork-retained-${key}`);
  const compiledContract = new Contract(retainedWitnesses(key));
  const args = call.args === undefined ? [] : call.args(context);
  const privateState = retainedEntry(key).privateState;
  // Two literals, for SYMMETRY with `deployRetained` rather than for its reason.
  // `Ledger8CallTxOptions`' base arm merely omits `privateStateId` -- no
  // `?: never` -- and the retained entry reads the value, so an explicit
  // `undefined` here would typecheck and would mean "no id named". The branch is
  // kept anyway: a call site that looks like the deploy above is one a reader can
  // check once instead of twice.
  const submitted =
    privateState === undefined
      ? await submitCallTx(providers, { compiledContract, contractAddress, circuitId: call.circuitId, args })
      : await submitCallTx(providers, {
          compiledContract,
          contractAddress,
          circuitId: call.circuitId,
          args,
          privateStateId: privateState.id
        });

  // Read through the SAME shape the current-era arm answers with -- `public` for
  // the finalized record, `private` for the circuit's own return value. The
  // retained arm used to answer a thin `{ circuitId, nextPrivateState, txData }`
  // and `result` was unreachable from here.
  //
  // `status` is recorded, not asserted. Both arms of `submitCallTx` throw before
  // resolving if the chain reported anything but `SucceedEntirely`
  // (`internal/transaction.ts`, `internal/ledger8-entry.ts`), so a resolved call
  // has already cleared that check and a rejected one arrives in `leg`'s catch.

  // The RAW return value, not the `String(...)` the report carries below: a
  // later leg passes this back into a circuit as an argument, and the twin's
  // codegen wants the value, not a rendering of it.
  if (call.capture !== undefined) {
    retainedCaptures.set(key, { ...retainedCaptures.get(key), [call.capture]: submitted.private.result });
  }

  // THROWS rather than pushing onto `failures`, unlike the current-era arm's
  // check. A retained call's return value is asserted at most once per leg and
  // the legs that follow build on it, so a wrong figure has to stop the leg
  // rather than let the next call run against state the assertion just said was
  // not there. `leg` turns it into the row and the failure.
  // `!== undefined` rather than `'expect' in call`, matching the current-era
  // arm at the bottom of this file: a circuit whose correct answer IS `undefined`
  // cannot be asserted this way. No twin needs that today.
  if (call.expect !== undefined && submitted.private.result !== call.expect) {
    throw new Error(
      `retained ${key}/${call.circuitId} returned ${String(submitted.private.result)}, expected ${String(call.expect)}`
    );
  }

  return {
    circuitId: call.circuitId,
    status: submitted.public.status,
    version: submitted.public.version,
    txId: submitted.public.txId,
    ...(submitted.private.result === undefined ? {} : { result: String(submitted.private.result) })
  };
};

/**
 * Reads one field out of a retained twin's ledger, with the twin's OWN codegen.
 *
 * These are the only measurements in the run that read state written before the
 * boundary. Every other post-fork leg establishes that the address is still
 * callable, which a framework that silently reset the contract's state -- or
 * resolved the address to a fresh one -- would pass just as happily.
 *
 * The field is supplied by the matrix entry rather than fixed here. THREE twins
 * declare one, deliberately at different weights: `simple` has `round: Counter`
 * across a `noop`, and `shielded-fallible` and `fee-mint` have `counters: Map`
 * across the partitioned checkpointed mints -- state across a trivial circuit,
 * and state across the heaviest ones in the set.
 *
 * Each of the three is read at THREE phases: `preFork`, `postFork`, and
 * `secondCall`. The third is what establishes that a migrated contract is
 * callable more than once, and it is asserted the same way the first two are --
 * by the field having moved again, not by the call having been admitted.
 *
 * The other three twins (`unshielded`, `shielded`, `block-time`) declare no
 * ledger block, so `checkLedgerState` returns `undefined` for them and asserts
 * nothing about surviving state at any phase. What survives for them is the
 * contract's BALANCE, which this mechanism does not reach:
 *
 * - `unshielded` asserts it through a CIRCUIT instead -- `getUnshieldedBalanceTest`
 *   across the boundary, in that twin's own entry. So its surviving state is
 *   covered, just not by this function.
 * - `shielded` and `block-time` have no circuit that reads earlier state back:
 *   `mintShieldedTokens` returns a new coin and `testBlockTimeGte` answers about
 *   the block, not the contract.
 *
 * So TWO remain uncovered, not three: `unshielded` is covered by the circuit
 * read above. Closing the other two needs a circuit that does not exist in the
 * source yet, so it is a fixture change rather than a harness one.
 *
 * THE ONE FUNCTION HERE THAT REACHES PAST THE CONSUMER SURFACE, through
 * `loadLedgerEra`. That is a gap in `contracts`, not a shortcut: see the import
 * block at the top of this file for what was tried instead and why the public
 * alternative would weaken every assertion built on this.
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

  // ADR-0010: the era-agnostic facade is crossed with plain data only. `extractState`
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

/**
 * Checks a twin's PRIVATE state -- the dApp's own storage -- against what the
 * calls so far should have left in it.
 *
 * Read straight off `providers.privateStateProvider` under the id the twin
 * named, rather than off the call result. The result DOES carry the state --
 * `nextPrivateState`, on the `private` half -- but that is the value this process
 * computed and handed down, so asserting on it would measure the harness's own
 * memory. Going to the provider is what makes this an assertion about
 * PERSISTENCE, and it is what a restarted consumer has to do anyway.
 *
 * WHY THIS IS NOT REDUNDANT WITH THE LEDGER ASSERTION. The ledger figure says
 * the witness could still READ the pre-fork state; this says the store still
 * HOLDS it, with its types intact. A store that answered with a plausible
 * default would satisfy neither, but a store whose `bigint`s came back as
 * numbers or strings would satisfy the first and fail here -- and that is the
 * failure mode a private-state layer actually has.
 *
 * Recorded rather than thrown, for the reason `checkLedgerState` is: a call that
 * worked while its state did not carry is the more interesting row.
 */
const checkPrivateState = async (label, entry, phase, providers, contractAddress) => {
  const expected = entry.privateState?.[phase];
  if (expected === undefined) {
    return undefined;
  }
  // NAMED HERE, not relied on from the call that ran before this one. The
  // provider scopes a private-state `get` by the address last set and THROWS
  // before any has been -- so a leg whose call failed would reach this and
  // report `Contract address not set` instead of what the store holds, which is
  // the opposite of what this function is for. Setting it explicitly also makes
  // the scope visible rather than inherited. (Signing keys are the exception and
  // need none of this: they are keyed by an address ARGUMENT.)
  providers.privateStateProvider.setContractAddress(contractAddress);
  const actual = await providers.privateStateProvider.get(entry.privateState.id);
  if (actual === null || actual === undefined) {
    failures.push(`${label}: nothing is stored at private state id '${entry.privateState.id}'`);
    return { privateState: 'absent' };
  }
  // Member by member, with `===`: `calls` coming back as the NUMBER 2 rather than
  // the bigint 2n is a storage layer that stopped preserving types, and `===`
  // against 2n is what catches it -- `typeof` appears in the message so the row
  // says which of the two it was. A whole-object compare would report "not equal"
  // without saying which half moved.
  for (const [member, want] of Object.entries(expected)) {
    const got = actual[member];
    if (got !== want) {
      failures.push(
        `${label}: private state '${member}' is ${String(got)} (${typeof got}), expected ${String(want)} (${typeof want})`
      );
    }
  }
  return { privateState: Object.fromEntries(Object.entries(expected).map(([member]) => [member, String(actual[member])])) };
};

const walletContext = async (wallet) => ({
  coinPublicKey: new Uint8Array(Buffer.from(wallet.getCoinPublicKey(), 'hex')),
  unshieldedAddress: new Uint8Array(Buffer.from((await wallet.wallet.unshielded.getAddress()).hexString, 'hex'))
});

/**
 * How many calls the in-flight probe will drive before giving up on meeting the boundary.
 *
 * MEASURED, not guessed. The first run of this probe reported
 * `stoppedBecause: 'the attempt cap was reached before the fork landed'` at a cap
 * of 12 -- twelve calls at roughly 18s each cover about 3m36s, and `enactFork()`
 * closes the window in about 3m41s, so the probe fell silent moments before the
 * one event it exists to observe. The cap is here to stop a runaway loop, not to
 * end the probe early; at 20 the loop is bounded by the fork landing rather than
 * by itself.
 *
 * 20 x 18s is 6m, which is `IN_FLIGHT_DEADLINE` exactly -- the two bound the same
 * loop from either side rather than one sitting behind the other. Whichever is
 * reached first, `stoppedBecause` names it.
 */
const IN_FLIGHT_MAX_ATTEMPTS = 20;
/** Its own ceiling, so a fork that never lands cannot leave the loop running until `probe`'s deadline. */
const IN_FLIGHT_DEADLINE = 6 * 60_000;

/**
 * The ceiling on ONE attempt, and the thing that keeps this probe from ending the run.
 *
 * `IN_FLIGHT_DEADLINE` is tested at the top of the loop, so it cannot interrupt a
 * call already in flight -- and a retained `submitCallTx` waits on
 * `watchForTxData`, which polls for finalization with NO timeout of its own. A
 * transaction the chain drops rather than explicitly rejects therefore never
 * returns. That is not a hypothetical: it is the boundary case this probe exists
 * to provoke, so the probe must survive its own subject.
 *
 * Without this, such a call hangs until `probe`'s outer deadline, which is FATAL
 * (`report(1)`) and sits before the `fork enacted` gate -- costing every post-fork
 * leg in the shard to record one row. Five times the ~18s a healthy call measured,
 * so a slow prover is still admitted and only a hung one is cut off.
 */
const IN_FLIGHT_CALL_TIMEOUT = 90_000;

/**
 * The backstop handed to `probe`, derived from the loop's own budget rather than
 * left at `LEG_TIMEOUT`.
 *
 * The loop now returns within `IN_FLIGHT_DEADLINE` plus at most one
 * `IN_FLIGHT_CALL_TIMEOUT`, so this should never fire. It is here to be a
 * generous margin over that sum instead of a number that happens to sit near it.
 */
const IN_FLIGHT_PROBE_TIMEOUT = IN_FLIGHT_DEADLINE + IN_FLIGHT_CALL_TIMEOUT + 60_000;

/**
 * Drives retained-era calls into the fork window, and reports what each one met.
 *
 * A PROBE, NOT A LEG, and the distinction is the whole design. The framework
 * documents what happens to a transaction built against the pre-fork ledger that
 * is still in flight when the fork applies: the chain rejects it, and
 * `handleSubmitRejection` re-reads the head, sees the era move forward, and
 * raises `StaleHeadError` with the two-step remediation rather than a decode
 * failure. Until now nothing observed that on a live chain -- it is covered by
 * unit tests against mocks, and `consumer-e2e/README.md` recorded the deploy
 * branch as unreachable from any entry point at all.
 *
 * IT CANNOT BE ASSERTED, because hitting it is a race this harness does not
 * control. `enactFork()` measured about 3m41s and one call is proving plus
 * balancing plus submission, so a call has to be in exactly the wrong part of
 * that window. Writing it as a leg would put a coin toss inside a blocking gate,
 * which is the one thing a release gate must not contain. So it records which of
 * three things happened and colours nothing:
 *
 * - `admitted` -- the call landed before the boundary. The ordinary outcome, and
 *   not a failure of anything.
 * - `stale-head` -- THE ONE THIS EXISTS FOR. The call was built against the
 *   pre-fork head and rejected after the fork applied, and the framework named
 *   it. `kind`, `startEra` and `freshEra` come straight off the error, so the
 *   row says which remediation a consumer would be pointed at.
 * - anything else -- recorded verbatim. The wallet is itself mid-crossing in
 *   this window (its sub-wallets settle at different moments, which is why
 *   `syncWallet` gates on `Settled`), so a refusal from that direction is
 *   expected here and is NOT evidence about stale-head handling. Reading one as
 *   the other is the mistake this row exists to prevent.
 *
 * The calls go to the baseline contract, whose `round` nothing asserts -- every
 * leg on it checks transaction ids and envelope tags. Driving them at a twin
 * that HAS a ledger assertion would make an unpredictable number of increments
 * part of an expected figure.
 */
const driveCallsAcrossTheBoundary = async (forkOutcome) => {
  // The probe reads `deployment` out of the enclosing scope, and the leg that
  // assigns it records-and-continues. Without this, a failed baseline deploy
  // makes every iteration a `TypeError` on `.contractAddress`, filling the cap in
  // milliseconds and reporting it as if the chain had refused twenty calls.
  if (deployment === undefined) {
    return {
      attempts: [],
      metTheBoundary: false,
      stoppedBecause: 'the pre-fork baseline deploy did not complete, so there was nothing to call'
    };
  }
  const { Contract } = await import('@midnight-ntwrk/fork-retained-baseline');
  const deadline = Date.now() + IN_FLIGHT_DEADLINE;
  const attempts = [];

  while (forkOutcome() === undefined && Date.now() < deadline && attempts.length < IN_FLIGHT_MAX_ATTEMPTS) {
    const startedAt = Date.now();
    try {
      // Bounded, because the call this probe is TRYING to provoke is one the
      // chain may drop rather than reject, and `watchForTxData` waits on a
      // dropped transaction forever. See `IN_FLIGHT_CALL_TIMEOUT`.
      const submitted = await withDeadline('in-flight call', IN_FLIGHT_CALL_TIMEOUT, () =>
        submitCallTx(session.providers, {
          compiledContract: new Contract({}),
          contractAddress: deployment.contractAddress,
          circuitId: CIRCUIT_ID,
          args: []
        })
      );
      attempts.push({ outcome: 'admitted', txId: submitted.public.txId, tookMs: Date.now() - startedAt });
    } catch (error) {
      if (error instanceof StaleHeadError) {
        attempts.push({
          outcome: 'stale-head',
          kind: error.kind,
          startEra: error.startEra,
          freshEra: error.freshEra,
          tookMs: Date.now() - startedAt
        });
        // Stop here. The question was whether the framework names this, and it
        // has; driving more calls into a chain that has already moved on would
        // only collect refusals that say nothing further.
        break;
      }
      if (error instanceof LegTimeoutError) {
        // Its own outcome rather than `other`: a call that never came back is a
        // different observation from one the chain answered, and it is the shape
        // a dropped in-flight transaction takes.
        attempts.push({ outcome: 'never-returned', tookMs: Date.now() - startedAt });
        continue;
      }
      attempts.push({ outcome: 'other', error: describeError(error).split('\n')[0], tookMs: Date.now() - startedAt });
    }
  }

  const metTheBoundary = attempts.some((attempt) => attempt.outcome === 'stale-head');
  // THE ONE THING THIS PROBE COLOURS, and it is not the race.
  //
  // Losing the race is the expected outcome and must never fail the run -- that
  // is the whole reason this is a probe. But a run where the chain answered NONE
  // of the calls is not evidence about the boundary at all: it is a proof server
  // down, a wallet that never settled, or a `StaleHeadError` that stopped being
  // raised and now arrives as an unrecognised refusal. Each of those produces a
  // row indistinguishable from a healthy miss, and this probe is the run's ONLY
  // live coverage of `StaleHeadError`, so a silent one would be the regression
  // reaching a release unobserved.
  //
  // `admitted` is the floor deliberately: the probe is healthy the moment the
  // chain accepted one call, whether or not it later met the fork.
  const answered = attempts.filter(
    (attempt) => attempt.outcome === 'admitted' || attempt.outcome === 'stale-head'
  ).length;
  //
  // Not when the FORK failed, though. Every call is expected to be refused on a
  // chain that never crossed, and the gate below this probe already reports that
  // -- colouring it here too would add a second row for one root cause, which is
  // the exact noise the gate exists to prevent.
  if (attempts.length > 0 && answered === 0 && forkOutcome() !== 'failed') {
    failures.push(
      `a retained call in flight as the fork applies: the chain answered none of ${attempts.length} calls, ` +
        `so this run observed nothing about the boundary -- first refusal: ${attempts[0].error ?? attempts[0].outcome}`
    );
  }

  return {
    attempts,
    // Stated rather than left to be counted off the list, because "no call met
    // the boundary" is the expected outcome and has to be legible as such.
    metTheBoundary,
    answered,
    // FIVE branches, and the first two were missing. The `break` above leaves the
    // fork unsettled and the cap unreached, so it used to fall through to "the
    // deadline passed" and print that beside `metTheBoundary: true` -- on exactly
    // the run the probe exists to record. And `forkOutcome` distinguishes a fork
    // that FAILED from one that landed, which a single boolean could not.
    stoppedBecause: metTheBoundary
      ? 'a call met the boundary and was refused'
      : forkOutcome() === 'failed'
        ? 'the fork failed before any call met the boundary'
        : forkOutcome() === 'enacted'
          ? 'the fork was enacted'
          : attempts.length >= IN_FLIGHT_MAX_ATTEMPTS
            ? 'the attempt cap was reached before the fork landed'
            : 'the probe deadline passed before the fork landed'
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

// The contract every leg below the boundary is measured against, deployed
// through `deployContract`'s retained arm -- the entry point a consumer has, and
// the one the rest of the file then calls, finds and reads. It stands in for the
// pre-fork dApp that would already have deployed on the previous framework
// major, and it is now also the run's only coverage of that arm: the arm is
// reachable ONLY against a pre-fork head, and refuses a post-fork one with
// `Ledger8DeployOnV9Error`, so nothing after the boundary can exercise it.
//
// This leg used to compose the deploy by hand against protocol's era facade,
// because the arm refused before reading any head. That made the deploy a
// measurement of `protocol` rather than of `contracts`.
await leg('pre-fork retained deploy', async () => {
  const { Contract } = await import('@midnight-ntwrk/fork-retained-baseline');
  // Raw instance, empty `args`, no private-state pair -- `deployRetained` carries
  // why each of the three is written the way it is.
  const deployed = await deployContract(session.providers, { compiledContract: new Contract({}), args: [] });

  deployment = { contractAddress: deployed.contractAddress };
  // Announced so the driver can ask the NODE about the same contract. The
  // indexer's answer alone cannot separate "the ledger did not migrate" from
  // "the indexer serves the bytes of the last pre-fork action".
  process.stdout.write(`FORK_CONTRACT ${deployed.contractAddress}\n`);
  const state = await waitForContract(session.providers.publicDataProvider, deployed.contractAddress, 5 * 60_000);
  return {
    txId: deployed.deployTxData.txId,
    contractAddress: deployed.contractAddress,
    indexedAs: state.version,
    envelope: envelopeTag(state.raw)
  };
});

// (a) continued: a CALL through the unified entry, which is the reachable half.
await leg('pre-fork retained call', async () => {
  const { Contract } = await import('@midnight-ntwrk/fork-retained-baseline');
  const submitted = await submitCallTx(session.providers, {
    // `compiledContract`, not `contract`: the retained era has no CompiledContract
    // container, so the instance is passed raw. `increment` is nullary, so `args`
    // is the EMPTY tuple -- not absent, and not arguments the circuit does not
    // take. This call site once had the name wrong and the arguments wrong, and
    // neither was caught because nothing typechecked this file.
    // `consumer-e2e/tsconfig.json` is what now does: either mistake fails the
    // `typecheck:consumer-e2e` lane in seconds instead of a Hard fork shard in
    // thirteen minutes.
    compiledContract: new Contract({}),
    contractAddress: deployment.contractAddress,
    circuitId: CIRCUIT_ID,
    args: []
  });
  // The RETAINED arm resolves a `Ledger8FinalizedCallTxData` -- `{ circuitId,
  // public, private }` -- which now carries the finalized record on `public`
  // exactly as the current era does, so the id is read the same way on both arms.
  // `submitted.txId` is NOT it: neither arm puts the id at the top level.
  return { txId: submitted.public.txId };
});

// (a) continued: the rest of the retained-era contracts, deployed and called on
// the pre-fork chain. Same source as the current-era matrix below, built with
// `compactc` 0.31.1, so the pair differ only in the toolchain that emitted them.
for (const entry of RETAINED_MATRIX.filter((candidate) => covers(SELECTED.retained, candidate.key))) {
  await leg(`pre-fork retained ${entry.key}`, async () => {
    const providers = retainedProvidersFor('v8', session.wallet, entry.key);
    const deployed = await deployRetained(entry.key, providers);
    retainedDeployments.set(entry.key, deployed);

    const context = await retainedContext(entry.key);
    const calls = [];
    for (const call of entry.preFork) {
      calls.push(
        await callRetained(entry.key, providers, deployed.contractAddress, call, context)
      );
    }
    const label = `pre-fork retained ${entry.key}`;
    const ledgerState = await checkLedgerState(label, entry, 'preFork', providers, deployed.contractAddress);
    const privateState = await checkPrivateState(label, entry, 'preFork', providers, deployed.contractAddress);
    return { ...reportableDeployment(deployed), calls, ...(ledgerState ?? {}), ...(privateState ?? {}) };
  });
}

// (a) continued: the negative control for every private-state assertion in this
// file, in the same spirit as (c1b) is for the surviving-balance one.
//
// WITHOUT IT `checkPrivateState` IS DECORATIVE. It reads one id and compares what
// comes back, so it passes if the provider answers the id it was given -- and it
// passes just as happily if the provider answers ANY id with whatever state it
// last touched. That is not a contrived failure: `get` is scoped by the address
// named on the provider, and a layer that stopped distinguishing ids underneath
// that scope would keep every assertion in this file green while private state
// had silently become per-contract rather than per-id.
//
// So: ask the same provider, at the same address, for an id nothing ever wrote.
// The answer has to be nothing.
for (const entry of RETAINED_MATRIX.filter(
  (candidate) => covers(SELECTED.retained, candidate.key) && candidate.privateState !== undefined
)) {
  const name = `pre-fork private state is scoped by id, ${entry.key}`;
  await leg(name, async () => {
    const deployed = retainedDeployments.get(entry.key);
    if (deployed === undefined) {
      return 'skipped: its pre-fork deploy did not complete';
    }
    const providers = retainedProvidersFor('v8', session.wallet, entry.key);
    providers.privateStateProvider.setContractAddress(deployed.contractAddress);
    const unwritten = `${entry.privateState.id}-never-written`;
    const answer = await providers.privateStateProvider.get(unwritten);
    if (answer !== null && answer !== undefined) {
      // Member NAMES, not the state: a private state is the one thing in this run
      // that must not reach the report, and naming its shape is enough to say
      // which state leaked.
      failures.push(
        `${name}: the store answered '${unwritten}', which nothing ever wrote, with a state carrying ` +
          `${Object.keys(answer).join(', ')}`
      );
    }
    return { unknownIdAnswers: answer === null || answer === undefined ? 'nothing' : 'a state' };
  });
}

// (a) continued, as a probe rather than an assertion: what a consumer sees if
// they point a current-era contract at a chain that has not forked yet. Nothing
// in the spec says which side refuses it, or with what -- and "the deploy just
// worked" would be the largest finding of the run.
await probe('pre-fork deploy of a current-era contract', async () => {
  const zkConfigPath = config.matrixZkConfigPaths?.simple;
  if (zkConfigPath === undefined) {
    // SKIPPED, not refused. This question needs `simple`'s artifacts and the
    // matrix is sharded one contract per job, so every shard but `simple`'s does
    // not install them. Recording `refused` there answered a question about the
    // fork with a message about a missing file -- noise wearing a measurement's
    // clothes.
    return 'skipped: this shard does not install the current-era `simple` artifacts';
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

// ONE `awaitFork()`, shared by the probe below and the gate under it. Calling it
// twice would write `FORK_AWAIT` twice and ask the driver to enact a second
// governance upgrade on a chain that has already forked.
//
// `FORK_AWAIT` goes out the moment this runs, and the driver starts `enactFork()`
// on receiving it -- so the enactment window opens HERE and closes when the
// promise resolves. That window is the only place an in-flight transaction can
// meet the boundary, and it is what the probe drives calls into.
const forkEnacted = awaitFork();
// WHICH of the two, not merely THAT one of them happened. Both arms stop the
// probe -- it must not keep driving calls at a fork that failed -- but a boolean
// made the two indistinguishable afterwards, so a failed fork reported
// `stoppedBecause: 'the fork was enacted'` next to the gate below saying it had
// not been. Attached immediately, because an unobserved rejection here would be
// an unhandled one.
let forkOutcome;
forkEnacted.then(
  () => {
    forkOutcome = 'enacted';
  },
  () => {
    forkOutcome = 'failed';
  }
);

await probe(
  'a retained call in flight as the fork applies',
  () => driveCallsAcrossTheBoundary(() => forkOutcome),
  IN_FLIGHT_PROBE_TIMEOUT
);

// These two gate everything below them, so they are the one place `leg`'s
// record-and-continue is wrong. Without the gate a chain that never forked, or a
// session still pointed at the v8 proof server, produces ~15 individually
// plausible contract failures for one root cause -- and the retained keep-state
// rows read FAILED for calls that were never attempted after the boundary.
//
// Usually already settled by the time this runs, because the probe above returns
// when the fork lands. The deadline here covers every way the probe can return
// FIRST instead: its attempt cap, its own deadline, a call that met the boundary
// and broke the loop, and a baseline deploy that never completed.
const forked = await legSucceeded('fork enacted', () => forkEnacted, FORK_WAIT_TIMEOUT);

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
    // Written exactly as the pre-fork call above, which is the point of the leg:
    // the SAME call site, unchanged, on the other side of the boundary.
    compiledContract: new Contract({}),
    contractAddress: deployment.contractAddress,
    circuitId: CIRCUIT_ID,
    args: []
  });
  // The RETAINED arm resolves a `Ledger8FinalizedCallTxData` -- `{ circuitId,
  // public, private }` -- which now carries the finalized record on `public`
  // exactly as the current era does, so the id is read the same way on both arms.
  // `submitted.txId` is NOT it: neither arm puts the id at the top level.
  return { txId: submitted.public.txId };
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
    // Re-read rather than reused: the wallet was rebuilt at the `post-fork head
    // era` gate, and a key read off the stopped one would be stale. Through
    // `retainedContext`, so the colour minted before the boundary is in scope
    // here -- naming it is the whole of the surviving-balance assertion.
    const context = await retainedContext(entry.key);
    // A LIST, so a contract can mint on one call and assert on the next. Written
    // as one-or-many rather than always-many to leave the five single-call
    // entries untouched.
    const outcome = [];
    for (const call of [entry.postFork].flat()) {
      outcome.push(
        await callRetained(entry.key, providers, deployed.contractAddress, call, context)
      );
    }
    // Only once every call in the list has run. What the second-call leg needs
    // from this one is the LAST call, not the first.
    retainedPostForkCompleted.add(entry.key);
    // The state written BEFORE the boundary, read back after it. Without this
    // the leg proves only that the address still answers.
    const label = `post-fork keep-state ${entry.key}`;
    const ledgerState = await checkLedgerState(label, entry, 'postFork', providers, deployed.contractAddress);
    // The dApp's OWN storage across the boundary, which only `private-counter`
    // has. For that twin the ledger figure above is already evidence the witness
    // read pre-fork private state -- `round` reaches 14 only if it did -- and
    // this is the store saying the same thing directly, types included.
    const privateState = await checkPrivateState(label, entry, 'postFork', providers, deployed.contractAddress);
    const state = await providers.publicDataProvider.queryRawContractState(deployed.contractAddress);
    return {
      contractAddress: deployed.contractAddress,
      calls: outcome,
      ...(ledgerState ?? {}),
      ...(privateState ?? {}),
      // The envelope after the call, so a keep-state write that re-versions the
      // state is distinguishable from one that leaves it in the retained shape.
      envelopeAfterCall: state === null ? 'absent' : envelopeTag(state.raw)
    };
  });
}

// ── (c1b) the negative control for the surviving-balance assertion ────────────
//
// WITHOUT THIS LEG THE ASSERTION ABOVE IS DECORATIVE. "The send succeeded,
// therefore the balance survived" holds only if the send is refused when the
// balance is NOT there. Nothing in this repo pinned that: every existing
// unshielded send test moves an amount the contract demonstrably holds, so the
// refusing branch has never been observed.
//
// So this asks for MORE than the contract can hold and requires a refusal. The
// two legs together are the assertion: one shows the send passes on the colour
// that survived, this shows it does not pass on an amount that did not. If this
// leg reports the send ADMITTED, the row above is worthless and says so.
const NEGATIVE_CONTROL = 'unshielded refuses a send larger than the balance that survived';
if (covers(SELECTED.retained, 'unshielded')) {
  await leg(NEGATIVE_CONTROL, async () => {
    const deployed = retainedDeployments.get('unshielded');
    if (deployed === undefined) {
      return 'skipped: its pre-fork deploy did not complete';
    }
    const captured = retainedCaptures.get('unshielded');
    // NOT skipped, and deliberately: a missing capture means the pre-fork mint
    // returned nothing this leg could name, which is the same thing as the
    // assertion above having run against `undefined`. Reporting that as a skip
    // would hide it behind a row that reads as "not applicable".
    if (captured?.preForkColor === undefined) {
      throw new Error(
        'the pre-fork mint captured no colour, so the surviving-balance send above named `undefined` ' +
          'and asserted nothing'
      );
    }
    const providers = retainedProvidersFor('v9', session.wallet, 'unshielded');
    const context = await retainedContext('unshielded');

    try {
      // `'unshielded'` is the TWIN KEY, and it is the first argument because
      // `callRetained` resolves `@midnight-ntwrk/fork-retained-${key}` from it.
      // This call site used to pass `NEGATIVE_CONTROL` ahead of it, which made
      // the import specifier a whole English sentence -- unreachable, but never
      // reached, because the leg died on the undeclared capture map four lines
      // above and the arity was never exercised.
      // NEVER give this call an `expect`. `callRetained` throws on a failed one,
      // and an assertion failure is not the refusal this leg is looking for --
      // the catch below would report it under a name that says the ledger did
      // its job.
      await callRetained('unshielded', providers, deployed.contractAddress, {
        circuitId: 'sendUnshieldedToUserTest',
        // FOUR TIMES what the contract can be holding: one `MINT_AMOUNT` was
        // minted to this colour pre-fork and half of it has just been sent away,
        // so a ledger that checks the balance at all cannot serve this.
        args: (ctx) => [ctx.preForkColor, MINT_AMOUNT * 2n, { bytes: ctx.unshieldedAddress }]
      }, context);
    } catch (error) {
      const described = describeError(error);
      // Only a SEAM refusal is the pass. An unresolvable import, a provider
      // misconfiguration, an indexer 5xx, a `LegTimeoutError` or any harness
      // `TypeError` would otherwise be recorded as the ledger checking the
      // balance -- which would make the surviving-balance row above decorative
      // in exactly the way this leg's own header warns against.
      //
      // `balanceTx` and `submitTx` both count, and `proveTx` does not: a
      // balance the contract cannot serve is refused either when the
      // transaction is balanced or when the node re-runs it, but never by the
      // prover. `Ledger8SeamFailedError` renders `<seam> rejected`, and
      // `describeError` walks the cause chain, so the shape is readable here.
      //
      // The framework's OWN guards -- `executeCircuit` refusing a balance, the
      // pipeline refusing an envelope -- run inside this `try` too, and they are
      // not seam refusals, so they land in the branch below rather than being
      // read as the ledger doing its job. That is deliberate: a framework that
      // refused to build the transaction at all would prove nothing about what
      // the ledger checks.
      if (!/(?:balanceTx|submitTx) rejected/.test(described)) {
        throw new Error(
          'the oversized send failed, but not with a seam refusal, so this leg proves nothing about the ' +
            `ledger checking the balance:\n${described}`,
          { cause: error }
        );
      }
      // `submitTx` is the NODE. It re-ran the transcript against the balance the
      // contract really holds and disagreed, which is exactly the finding this
      // leg is after, and nothing else reaches that seam.
      //
      // Recorded rather than swallowed so the run carries which failure shape
      // answered -- a node rejection and a balancing refusal are different
      // findings and this row is where they would first show apart.
      if (/submitTx rejected/.test(described)) {
        return { refusedAs: described.split('\n')[0], refusedBy: 'the node' };
      }

      // `balanceTx` is the WALLET, and on its own it is AMBIGUOUS. A send the
      // contract cannot serve leaves an unmatched delta, which balancing
      // reports as `Wallet.InsufficientFunds` -- the answer this leg wants. A
      // wallet that has run out of its own funds or dust reports the same
      // thing, and by here this run has already paid for a deploy, a mint, a
      // send and several proofs. The rendered message cannot tell the two
      // apart, so the leg asks the wallet instead of guessing: one send the
      // contract CAN serve, same circuit, same providers, same colour. If the
      // wallet balances and submits that, it was healthy, and the refusal above
      // was about the amount.
      //
      // A QUARTER of the mint: half is still with the contract after the
      // post-fork send, so this is serviceable, and it leaves the contract
      // holding something either way.
      try {
        await callRetained('unshielded', providers, deployed.contractAddress, {
          circuitId: 'sendUnshieldedToUserTest',
          args: (ctx) => [ctx.preForkColor, MINT_AMOUNT / 4n, { bytes: ctx.unshieldedAddress }]
        }, context);
      } catch (controlError) {
        throw new Error(
          'the oversized send was refused at `balanceTx`, but so was a send the contract can serve, so the ' +
            'refusal is the wallet running short rather than the ledger checking the contract balance, and ' +
            'this leg proves nothing',
          { cause: controlError }
        );
      }

      return {
        refusedAs: described.split('\n')[0],
        refusedBy: 'the wallet, with a serviceable send through the same circuit accepted afterwards'
      };
    }
    // Reached only when the call was ADMITTED, which is the failure this leg
    // exists to catch -- thrown rather than returned so it colours the run.
    throw new Error(
      'a send of four times the surviving balance was ADMITTED, so `sendUnshieldedToUserTest` does ' +
        'not check the balance and the surviving-balance assertion on the post-fork leg proves nothing'
    );
  });
}

// ── (c2) a migrated contract, called a SECOND time ────────────────────────────
//
// A LEG, not a probe, and it was a probe until the framework committed to an
// answer. The keep-state leg above establishes that the FIRST post-fork call
// succeeds and migrates the state envelope from the retained schema to the
// current one; this establishes that the contract is still callable after that,
// which is what makes keep-state a supported path rather than a single shot.
//
// WHY THE SECOND CALL WORKS AT ALL, since the two facts look contradictory.
// Migration rewrites the ENVELOPE but keeps the RETAINED verifier keys:
// `reexpressOperationsForCurrentEra` copies `entryPoint.verifierKey` unchanged
// into a ledger-v9 `ContractState`. Measured on the committed goldens rather
// than assumed -- a real migrated 8-to-9 state carries byte-identical
// `midnight:verifier-key[v6]:` keys, and the current-era decoder reads them. So
// the contract holds current-era state over retained keys, and the retained
// artifacts a consumer already has are still the right ones for it.
//
// `readLedger8Snapshot` therefore picks its decoder off the envelope instead of
// pinning the retained era, and the KEY check decides whether the caller's
// artifacts fit. Pinning the decoder is what made a pre-fork contract callable
// exactly once, and this leg is what would catch that regressing.
for (const entry of RETAINED_MATRIX.filter((candidate) => covers(SELECTED.retained, candidate.key))) {
  const name = `a migrated ${entry.key}, called a second time`;
  await leg(name, async () => {
    const deployed = retainedDeployments.get(entry.key);
    if (deployed === undefined) {
      return 'skipped: its pre-fork deploy did not complete';
    }
    // SKIPPED rather than run, because this leg reads the envelope the post-fork
    // leg was supposed to migrate. Run after an aborted call list, it reports
    // `envelopeBefore: 'retained'` as a finding of its own -- a second, unrelated
    // -looking signal produced by the first failure. @see retainedPostForkCompleted
    if (!retainedPostForkCompleted.has(entry.key)) {
      return 'skipped: its post-fork call list did not run to the end, so the envelope it reads was never migrated';
    }
    const providers = retainedProvidersFor('v9', session.wallet, entry.key);

    // Recorded before the attempt, so the outcome can be read against what the
    // chain actually held rather than against an assumption about it. This is
    // the leg's own evidence that the first call migrated the envelope: it
    // should already read current-era here.
    const before = await providers.publicDataProvider.queryRawContractState(deployed.contractAddress);
    const envelopeBefore = before === null ? 'absent' : envelopeTag(before.raw);

    // `secondCall` where the twin declares one, and the post-fork call's own
    // circuit otherwise. A twin needs its own third call only when reusing the
    // post-fork arguments would write to the same place twice and leave the
    // ledger unable to tell a second write from none -- see `shielded-fallible`.
    // Flattened, because `postFork` is one-or-many and `unshielded`'s is a list.
    // This leg drives ONE call, so a twin whose post-fork leg needs several must
    // name its own `secondCall` rather than have the first of the list picked
    // for it by accident.
    const [call] = [entry.secondCall ?? entry.postFork].flat();
    // Re-read rather than reused: the wallet was rebuilt at the `post-fork head
    // era` gate, and a key read off the stopped one would be stale. Through
    // `retainedContext` like every other retained leg -- no twin's `secondCall`
    // names a capture today, and this is what keeps the next one that does from
    // being the third leg to find out the hard way.
    const context = await retainedContext(entry.key);

    // NOT caught. A refusal here is a defect now, not a finding, so it must
    // colour the run's exit code -- which is the whole difference between this
    // and the probe it replaced.
    const outcome = await callRetained(entry.key, providers, deployed.contractAddress, call, context);

    const after = await providers.publicDataProvider.queryRawContractState(deployed.contractAddress);
    return {
      envelopeBefore,
      envelopeAfter: after === null ? 'absent' : envelopeTag(after.raw),
      ...outcome,
      // Where the twin can prove it, that the call was ADMITTED is not enough:
      // the ledger field has to have moved again. Four of the seven can, and for
      // the other three this leg asserts admission only.
      ...((await checkLedgerState(name, entry, 'secondCall', providers, deployed.contractAddress)) ?? {}),
      ...((await checkPrivateState(name, entry, 'secondCall', providers, deployed.contractAddress)) ?? {})
    };
  });
}

// ── (c3) the contract is FOUND again after the fork, not just called ──────────
//
// A dApp that restarts after the boundary does not hold the handle its deploy
// returned. It holds an address and a store, and it re-attaches --
// `findDeployedContract` is the entry point for that, and until this leg the
// fork crossing never called it. Every post-fork leg above reuses a handle this
// process minted before the fork, which is the one thing a restarted dApp
// cannot do.
//
// WHAT IT ASSERTS BEYOND "the address answers". The retained arm resolves a
// verifier key for every one of the artifact's IMPURE circuits -- the set
// `callTx` is built from -- and refuses the attach if one does not match the
// chain, so a successful find is the chain and the pre-fork artifact still
// agreeing, after migration re-versioned the state
// envelope. And `signingKey` comes back from the private-state store rather than
// from the chain: the arm reports the key already stored and samples none, so
// this is also the assertion that the maintenance key the deploy persisted
// before the fork survived it. That key is not on chain and not derivable from
// anything that is, so losing it silently would leave a contract nobody can ever
// insert, remove or replace a verifier key on.
for (const entry of RETAINED_MATRIX.filter((candidate) => covers(SELECTED.retained, candidate.key))) {
  const name = `a migrated ${entry.key}, found again after the fork`;
  await leg(name, async () => {
    const deployed = retainedDeployments.get(entry.key);
    if (deployed === undefined) {
      return 'skipped: its pre-fork deploy did not complete';
    }
    const providers = retainedProvidersFor('v9', session.wallet, entry.key);
    const { Contract } = await import(`@midnight-ntwrk/fork-retained-${entry.key}`);
    const compiledContract = new Contract(retainedWitnesses(entry.key));
    const privateState = entry.privateState;
    // Two literals again. Here `Ledger8FindDeployedContractOptions` is a single
    // interface with an OPTIONAL `privateStateId` rather than a union, so the
    // type would accept a conditional spread -- but the arm refuses an explicit
    // `privateStateId: undefined` at run time, for the same reason the deploy arm
    // does, so the branch is what keeps the two from diverging.
    //
    // NO `signingKey` member on either: supplying one REPLACES what is stored,
    // which would make the assertion below vacuous -- it would report back the
    // key this leg just handed it.
    const found =
      privateState === undefined
        ? await findDeployedContract(providers, { compiledContract, contractAddress: deployed.contractAddress })
        : await findDeployedContract(providers, {
            compiledContract,
            contractAddress: deployed.contractAddress,
            privateStateId: privateState.id
          });

    // NOT `found.contractAddress === deployed.contractAddress`. The retained arm
    // returns `contractAddress: options.contractAddress` verbatim
    // (`find-deployed-contract.ts`), so comparing them compares the argument with
    // itself and can never fail. What a restarted dApp actually needs is a handle
    // it can CALL, so the usable assertion is that `callTx` came back carrying the
    // circuits the artifact declares -- it is built from `impureCircuits`, after
    // the attach has checked a verifier key for each one.
    const callable = Object.keys(found.callTx ?? {});
    const declared = Object.keys(compiledContract.impureCircuits);
    const missing = declared.filter((circuitId) => !callable.includes(circuitId));
    if (missing.length > 0) {
      failures.push(`${name}: the re-attached handle exposes no call site for ${missing.join(', ')}`);
    }
    // The key the DEPLOY reported, before the boundary, against the key the
    // attach reports after it. Compared only when the deploy actually reported
    // one -- an absent key on both sides is a different finding from a key that
    // changed, and saying "they match" about two undefineds would hide it.
    if (deployed.signingKey === undefined) {
      failures.push(`${name}: the pre-fork deploy reported no signing key, so there is nothing to have survived`);
    } else if (found.signingKey !== deployed.signingKey) {
      failures.push(
        `${name}: the stored signing key did not survive the fork -- the attach reports ` +
          `${found.signingKey === undefined ? 'none' : 'a different key'}`
      );
    }
    // THE HANDLE IS USED, not just inspected, where the twin declares an
    // `afterFind` call. Re-checking `secondCall` here instead -- which is what
    // this leg did -- re-read values the second-call leg had asserted moments
    // earlier in the same process, so it could only ever cascade: a failure there
    // left `calls` behind and reported it against THIS leg's name. Driving a call
    // through `found.callTx` asks the one question the row is for: whether a
    // handle built from nothing but an address and a store id can transact.
    //
    // Opt-in per twin, because it costs a fourth call. `private-counter` is the
    // twin worth paying it for -- its witness has to read pre-fork private state
    // through a provider this leg constructed after the boundary.
    const afterFind = entry.afterFind;
    const called = afterFind === undefined ? undefined : await found.callTx[afterFind.circuitId]();
    return {
      contractAddress: found.contractAddress,
      callable,
      signingKeySurvived: deployed.signingKey !== undefined && found.signingKey === deployed.signingKey,
      ...(called === undefined ? {} : { afterFindCall: { circuitId: called.circuitId, txId: called.public.txId } }),
      ...((await checkLedgerState(name, entry, 'afterFind', providers, deployed.contractAddress)) ?? {}),
      ...((await checkPrivateState(name, entry, 'afterFind', providers, deployed.contractAddress)) ?? {})
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
  // Annotated, because the specifier is a template literal: a dynamic import
  // resolves to `any` however the package is declared, and `make` would then
  // infer `PS` as `unknown` and match no `deployContract` arm -- taking the
  // whole leg's options object out of the check with it. `ForkCurrentContractCtor`
  // carries what every wrapper in this matrix actually is; the `typeof` guard
  // below is what makes the annotation honest at run time rather than asserted.
  /** @type {ForkCurrentContractCtor} */
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
        // Always present, `[]` for a nullary circuit -- `callRetained` carries
        // why, and it holds identically on this arm: `unproven-call-tx.ts`
        // normalises an absent `args` to the empty tuple, and a conditionally
        // SPREAD member reaches the checker as optional, which the options type
        // does not admit.
        args: call.args === undefined ? [] : call.args(context)
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
