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

/**
 * The FORK-CROSSING failure: an operation starts against one ledger era and the
 * network head has moved by the time its transaction is submitted.
 *
 * Two claims are under test here, and they are separable.
 *
 * The first is the decision itself — `handleSubmitRejection` — which is
 * exercised directly, because the two things it can get wrong are invisible
 * from an end-to-end run. It has to read the head AFRESH rather than reuse the
 * reading the operation started from, and it has to compare ERAS rather than
 * the raw protocol-version integers those eras are resolved from. A same-era
 * node minor bump (2_000_000 -> 2_001_000) is the case a naive integer
 * comparison reports as a fork and this one must not.
 *
 * The second is that the decision is wired into the retained-era pipelines at
 * the submit seam, and that a caller who follows the remediation actually gets
 * somewhere: the re-run after the head has flipped lands on the keep-state
 * pipeline with no change to the caller's code. That half reuses the committed
 * retained-era recording — see `./ledger8-replay.ts` and `./v8-native.test.ts`
 * for what the replay proves and what it stands in for.
 */

import { readFileSync } from 'node:fs';
import { inspect } from 'node:util';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import {
  type RawContractState,
  V8PayloadUnsupportedError,
  type VersionedFinalizedTransaction,
  type VersionedTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Ledger8SeamFailedError,
  StaleHeadError,
  SubmitRejectionUndiagnosedError,
  type SubmittedOperation} from '../errors';
import { runLedger8Deploy } from '../internal/ledger8-entry';
import { handleSubmitRejection } from '../internal/stale-head';
import type { Ledger8CallTxOptions, Ledger8ContractProviders } from '../ledger8-contract';
import { submitCallTx } from '../submit-call-tx';
import type { CoinReceiver016Contract, CoinReceiver016Module } from './ledger8-fixture-types';
import {
  type CoinReceiverRecording,
  createReplayEngine,
  hfFixturePath,
  loadCoinReceiverRecording,
  readHfHexFixture,
  RETAINED_ERA_TX_TAG,
  txTagPrefix
} from './ledger8-replay';
import { createMockFinalizedTxData, createMockProviders } from './test-mocks';

// Both redirects are `./v8-native.test.ts`'s -- see that file for why each is
// needed. The artifact's own runtime check needs an import-time stub, and the
// retained engine acquisition is replaced so this package never acquires the
// retained runtime. Everything else on the protocol barrel stays real.
vi.mock('@midnight-ntwrk/compact-runtime', () => import('./ledger8-runtime-stub'));

const engineSlot = vi.hoisted((): { engine?: unknown } => ({}));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof Protocol>();
  return {
    ...actual,
    loadLedger8Engine: (): Promise<unknown> => {
      if (engineSlot.engine === undefined) {
        return Promise.reject(new Error('no replay engine installed for this test'));
      }
      return Promise.resolve(engineSlot.engine);
    }
  };
});

const CIRCUIT_ID = 'receive_coin';
const NETWORK_ID = 'undeployed';
// The era timeline's own scheme, `node-major * 1_000_000 + node-minor * 1_000`.
const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
const POST_FORK_PROTOCOL_VERSION = 2_000_000;
// The SAME era as `POST_FORK_PROTOCOL_VERSION`, one node minor release later.
// The whole point of this constant: it is a different integer and the same era.
const POST_FORK_NODE_MINOR_BUMP = 2_001_000;

// THE STAND-IN KEY -- see `./v8-native.test.ts` for the full note.
const STAND_IN_VERIFIER_KEY = Uint8Array.from(
  readFileSync(hfFixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))
);

/** A head-version source whose readings can be scripted, and counted. */
const headSource = (...protocolVersions: readonly number[]): { queryLatestProtocolVersion: () => Promise<number> } => {
  const spy = vi.fn<() => Promise<number>>();
  for (const protocolVersion of protocolVersions) {
    spy.mockResolvedValueOnce(protocolVersion);
  }
  return { queryLatestProtocolVersion: spy };
};

/** What a provider seam was handed, captured for assertion. */
interface SeenPayloads {
  proveTx?: VersionedTx<unknown>;
  balanceTx?: VersionedTx<unknown>;
  submitTx?: VersionedFinalizedTransaction;
}

type RetainedProviders = Ledger8ContractProviders<CoinReceiver016Contract, typeof CIRCUIT_ID> & {
  readonly seen: SeenPayloads;
};

const rawState = (raw: Uint8Array, protocolVersion: number): RawContractState => ({
  version: protocolVersion === PRE_FORK_PROTOCOL_VERSION ? 'v8' : 'v9',
  protocolVersion,
  raw
});

/**
 * A submission provider that RECORDS what it was handed and then rejects.
 *
 * Recording before rejecting is what lets each test below assert that the
 * transaction really reached the seam -- that this is a submit-time failure
 * rather than a refusal raised before anything was composed.
 */
const recordThenReject = (seen: SeenPayloads, rejection: unknown) =>
  vi.fn().mockImplementation((tx: VersionedFinalizedTransaction) => {
    seen.submitTx = tx;
    return Promise.reject(rejection);
  });

// The contract address the direct exercises name, as a plain identifier.
// Identifiers are what a remediation may carry; decoded state and key bytes are
// not.
const OPERATION_CONTRACT_ADDRESS = '0200aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

const callOperation = (head: LedgerVersion = 'v8'): SubmittedOperation => ({
  head,
  kind: 'call',
  circuitId: CIRCUIT_ID,
  contractAddress: OPERATION_CONTRACT_ADDRESS
});

const deployOperation = (head: LedgerVersion = 'v8'): SubmittedOperation => ({
  head,
  kind: 'deploy',
  // A deploy has no circuit of its own and reports the constructor's own name.
  circuitId: 'initialState',
  contractAddress: OPERATION_CONTRACT_ADDRESS
});

describe('handleSubmitRejection (the fork-crossing decision, exercised directly)', () => {
  // A rejection in the shape the submit seam actually produces: the sanitizing
  // wrapper has already rebuilt the provider's failure onto `cause`, which is
  // what this handler receives and what it re-throws unchanged when the head
  // has not moved.
  const wrappedRejection = (): Ledger8SeamFailedError =>
    new Ledger8SeamFailedError('submitTx', CIRCUIT_ID, new Error('Error: node refused the transaction'));

  it('reads the head AFRESH and refuses with the two-step remediation, in order, when the era flipped', async () => {
    const pdp = headSource(POST_FORK_PROTOCOL_VERSION);
    const rejection = wrappedRejection();

    let caught: unknown;
    try {
      await handleSubmitRejection(pdp, callOperation(), rejection);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StaleHeadError);
    expect(hasErrorCode(caught, CONTRACTS_ERROR_CODES.STALE_HEAD)).toBe(true);
    expect((caught as StaleHeadError).startEra).toBe('v8');
    expect((caught as StaleHeadError).freshEra).toBe('v9');
    expect((caught as StaleHeadError).kind).toBe('call');
    // THE FRESH READ, asserted as a read and not merely as an outcome: the
    // whole decision is worthless if the handler compares the era the operation
    // started from against itself.
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);

    // BOTH remediation steps, and in order. The order is the remediation: a
    // caller who re-runs first can end up having submitted the same call twice.
    const message = (caught as Error).message;
    expect(message).toMatch(/did not.*finalize|not finalize/);
    expect(message).toMatch(/re-run/);
    expect(message.search(/did not.*finalize|not finalize/)).toBeLessThan(message.search(/re-run/));

    // The rejection is not lost behind the diagnosis.
    expect((caught as { readonly cause?: unknown }).cause).toBe(rejection);
  });

  it('NAMES the contract and the circuit, so the first remediation step can actually be followed', async () => {
    // "Verify the transaction did not finalize" is not an instruction a dApp
    // with several calls in flight and one error handler can act on unless the
    // error says which contract and which entry point. Both are identifiers,
    // which the privacy rule allows in a message.
    const pdp = headSource(POST_FORK_PROTOCOL_VERSION);

    let caught: unknown;
    try {
      await handleSubmitRejection(pdp, callOperation(), wrappedRejection());
    } catch (error) {
      caught = error;
    }

    expect((caught as StaleHeadError).contractAddress).toBe(OPERATION_CONTRACT_ADDRESS);
    expect((caught as StaleHeadError).circuitId).toBe(CIRCUIT_ID);
    // On the error AND in the text: a caller reading a log rather than catching
    // the class has to be able to follow the same instruction.
    expect((caught as Error).message).toContain(OPERATION_CONTRACT_ADDRESS);
    expect((caught as Error).message).toContain(CIRCUIT_ID);
  });

  it('names the composed address on a DEPLOY, which is the address a second attempt would not reuse', async () => {
    const pdp = headSource(POST_FORK_PROTOCOL_VERSION);

    let caught: unknown;
    try {
      await handleSubmitRejection(pdp, deployOperation(), wrappedRejection());
    } catch (error) {
      caught = error;
    }

    expect((caught as StaleHeadError).contractAddress).toBe(OPERATION_CONTRACT_ADDRESS);
    expect((caught as Error).message).toContain(OPERATION_CONTRACT_ADDRESS);
    // A deploy mints a fresh nonce, so "just deploy again" is how a caller ends
    // up with two contracts on chain. The text has to say so.
    expect((caught as Error).message).toMatch(/fresh nonce|different address/);
  });

  it('does NOT claim a fork when the head moved BACKWARDS, and says what to check instead', async () => {
    // An indexer rolled back to an earlier snapshot, or a provider repointed at
    // another network. An era only ever moves forward on a real chain, so a
    // backwards reading is not a fork crossing and a message saying the network
    // crossed the fork would be false. Inequality alone cannot tell the two
    // apart, which is why the guard compares direction.
    const pdp = headSource(PRE_FORK_PROTOCOL_VERSION);
    const rejection = wrappedRejection();

    let caught: unknown;
    try {
      await handleSubmitRejection(pdp, callOperation('v9'), rejection);
    } catch (error) {
      caught = error;
    }

    expect(caught).not.toBeInstanceOf(StaleHeadError);
    expect(caught).toBeInstanceOf(SubmitRejectionUndiagnosedError);
    expect((caught as SubmitRejectionUndiagnosedError).reason).toBe('head-moved-backwards');
    expect((caught as Error).message).not.toMatch(/crossed the ledger fork/);
    // Same restraint as the indexer-inconsistency refusal: never assert a fork
    // nothing observed establishes, and point at the read surface instead.
    expect((caught as Error).message).toContain('indexer');
    expect((caught as SubmitRejectionUndiagnosedError).errors).toEqual([rejection]);
  });

  it('gives a DEPLOY its own message, pointing at the runtime-deploy chapter rather than at a re-run', async () => {
    const callPdp = headSource(POST_FORK_PROTOCOL_VERSION);
    const deployPdp = headSource(POST_FORK_PROTOCOL_VERSION);

    let caughtCall: unknown;
    let caughtDeploy: unknown;
    try {
      await handleSubmitRejection(callPdp, callOperation(), wrappedRejection());
    } catch (error) {
      caughtCall = error;
    }
    try {
      await handleSubmitRejection(deployPdp, deployOperation(), wrappedRejection());
    } catch (error) {
      caughtDeploy = error;
    }

    expect(caughtDeploy).toBeInstanceOf(StaleHeadError);
    expect((caughtDeploy as StaleHeadError).kind).toBe('deploy');
    const deployMessage = (caughtDeploy as Error).message;
    // A deploy cannot be re-run at all once the head has crossed: the retained
    // era has no post-fork deployment. So the second step is a different step,
    // and the two messages must not be the same text.
    expect(deployMessage).toMatch(/did not.*finalize|not finalize/);
    expect(deployMessage).toContain('runtime-deploy chapter');
    expect(deployMessage).not.toMatch(/re-run/);
    expect(deployMessage).not.toBe((caughtCall as Error).message);
  });

  it('RE-THROWS the rejection unchanged when a fresh read reports the same era', async () => {
    const pdp = headSource(POST_FORK_PROTOCOL_VERSION);
    const rejection = wrappedRejection();

    await expect(handleSubmitRejection(pdp, callOperation('v9'), rejection)).rejects.toBe(rejection);
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    // The original failure travels on `cause`, already sanitized by the seam
    // wrapper -- the handler adds no second wrapping layer of its own.
    expect(rejection.cause).toBeInstanceOf(Error);
  });

  it('treats a same-era node MINOR bump as no fork: ERAS are compared, never the raw integers', async () => {
    // The case a naive integer comparison gets wrong. 2_000_000 and 2_001_000
    // are different readings of the SAME ledger era -- one node minor release
    // apart -- so nothing about this rejection says the network forked.
    const pdp = headSource(POST_FORK_NODE_MINOR_BUMP);
    const rejection = wrappedRejection();

    await expect(handleSubmitRejection(pdp, callOperation('v9'), rejection)).rejects.toBe(rejection);
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
  });

  it("keeps this framework's own coded refusals unwrapped, and makes no head read for one", async () => {
    // A provider that does not serve the pre-fork arm refuses on the way IN.
    // That is not fork evidence, a caller narrowing on it must keep seeing it,
    // and asking the network about it would be a round trip for nothing.
    const pdp = headSource(POST_FORK_PROTOCOL_VERSION);
    const refusal = new V8PayloadUnsupportedError('submitTx', PRE_FORK_PROTOCOL_VERSION);

    await expect(handleSubmitRejection(pdp, callOperation(), refusal)).rejects.toBe(refusal);
    expect(pdp.queryLatestProtocolVersion).not.toHaveBeenCalled();
  });

  it('loses NEITHER failure when the fresh head read itself rejects', async () => {
    const transportFailure = new Error('indexer unreachable');
    const pdp = { queryLatestProtocolVersion: vi.fn().mockRejectedValue(transportFailure) };
    const rejection = wrappedRejection();

    let caught: unknown;
    try {
      await handleSubmitRejection(pdp, callOperation(), rejection);
    } catch (error) {
      caught = error;
    }

    // Whether the head moved is now UNRESOLVED, so neither failure may be
    // dropped: the submit rejection is what happened, and the failed head read
    // is why it cannot be diagnosed.
    expect(caught).toBeInstanceOf(AggregateError);
    expect(caught).toBeInstanceOf(SubmitRejectionUndiagnosedError);
    expect((caught as SubmitRejectionUndiagnosedError).errors).toEqual([rejection, transportFailure]);
    // And the proximate failure is on `cause` too, so a consumer that only
    // walks cause chains still learns why no diagnosis was made.
    expect((caught as { readonly cause?: unknown }).cause).toBe(transportFailure);
    expect((caught as Error).message).toContain('could not be re-read');
    expect((caught as SubmitRejectionUndiagnosedError).reason).toBe('head-read-failed');
  });

  it('CARRIES A REGISTERED CODE when it cannot diagnose, so a retry handler does not intermittently escalate', async () => {
    // A node rejection and an unreachable indexer are the same network, so they
    // correlate. Without a code of its own, one and the same node rejection
    // would reach a handler branching on `hasErrorCode` as a coded seam failure
    // when the indexer answered, and as an uncoded AggregateError when it did
    // not -- retrying in one case and escalating in the other.
    const rejection = wrappedRejection();
    const readFailed = { queryLatestProtocolVersion: vi.fn().mockRejectedValue(new Error('indexer unreachable')) };
    const movedBack = headSource(PRE_FORK_PROTOCOL_VERSION);

    const caught: unknown[] = [];
    for (const [pdp, operation] of [
      [readFailed, callOperation()],
      [movedBack, callOperation('v9')]
    ] as const) {
      try {
        await handleSubmitRejection(pdp, operation, rejection);
      } catch (error) {
        caught.push(error);
      }
    }

    expect(caught).toHaveLength(2);
    for (const error of caught) {
      expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.SUBMIT_REJECTION_UNDIAGNOSED)).toBe(true);
      // The code is its OWN, never copied off `errors[0]` -- copying would make
      // one error report two different codes depending on which failure came
      // first.
      expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED)).toBe(false);
      // And it is in the registry, so `hasErrorCode(e)` with no argument
      // recognises it as one of this framework's own.
      expect(hasErrorCode(error)).toBe(true);
    }
  });
});

describe('the fork-crossing failure through the retained-era entry points', () => {
  let recording: CoinReceiverRecording;
  let contract: CoinReceiver016Contract;
  let v6Envelope: Uint8Array;
  let v9Envelope: Uint8Array;

  beforeAll(async () => {
    recording = loadCoinReceiverRecording();
    v6Envelope = readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex');
    v9Envelope = readHfHexFixture('coin-receiver-016', 'state-v9.hex');
    const module: CoinReceiver016Module = await import(
      /* @vite-ignore */ hfFixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
    );
    contract = new module.Contract({});
  });

  beforeEach(() => {
    setNetworkId(NETWORK_ID);
    engineSlot.engine = createReplayEngine(loadCoinReceiverRecording(), [], v6Envelope);
  });

  /** A retained-era provider set on a PRE-FORK head, with the three seams recorded. */
  const preForkProviders = (): RetainedProviders => {
    const zkConfigProvider: ZKConfigProvider<typeof CIRCUIT_ID> = {
      getVerifierKeys: vi.fn(),
      getZKIR: vi.fn(),
      getProverKey: vi.fn(),
      getVerifierKey: vi.fn().mockResolvedValue(STAND_IN_VERIFIER_KEY),
      get: vi.fn(),
      asKeyMaterialProvider: vi.fn()
    };
    const providers: Ledger8ContractProviders<CoinReceiver016Contract, typeof CIRCUIT_ID> = {
      ...createMockProviders(),
      zkConfigProvider
    };
    const seen: SeenPayloads = {};

    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(PRE_FORK_PROTOCOL_VERSION);
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));
    providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockFinalizedTxData());
    providers.walletProvider.getCoinPublicKey = (): string => recording.coinPublicKey;
    providers.proofProvider.proveTx = vi.fn().mockImplementation((tx: VersionedTx<unknown>) => {
      seen.proveTx = tx;
      return Promise.resolve(tx);
    });
    providers.walletProvider.balanceTx = vi.fn().mockImplementation((tx: VersionedTx<unknown>) => {
      seen.balanceTx = tx;
      return Promise.resolve(tx);
    });
    providers.midnightProvider.submitTx = vi.fn().mockImplementation((tx: VersionedFinalizedTransaction) => {
      seen.submitTx = tx;
      return Promise.resolve('retained-era-tx-id');
    });

    return { ...providers, seen };
  };

  const callOptions = (): Ledger8CallTxOptions<CoinReceiver016Contract, typeof CIRCUIT_ID> => ({
    compiledContract: contract,
    contractAddress: recording.contractAddress,
    circuitId: CIRCUIT_ID,
    args: [recording.receivedCoin]
  });

  it('refuses a call whose submit was rejected after the fork landed, naming both remediation steps', async () => {
    const providers = preForkProviders();
    // The fork window, in the order it happens: the operation resolves a
    // pre-fork head, composes and proves against it, and the node has crossed
    // by the time the transaction arrives.
    providers.publicDataProvider.queryLatestProtocolVersion = vi
      .fn()
      .mockResolvedValueOnce(PRE_FORK_PROTOCOL_VERSION)
      .mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    providers.midnightProvider.submitTx = recordThenReject(
      providers.seen,
      new Error('node refused the transaction')
    );

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StaleHeadError);
    expect((caught as StaleHeadError).startEra).toBe('v8');
    expect((caught as StaleHeadError).freshEra).toBe('v9');
    // The identifiers come from the operation the ENTRY POINT actually ran,
    // which is what proves they are threaded rather than defaulted.
    expect((caught as StaleHeadError).circuitId).toBe(CIRCUIT_ID);
    expect((caught as StaleHeadError).contractAddress).toBe(recording.contractAddress);
    expect((caught as Error).message).toContain(recording.contractAddress);
    expect((caught as Error).message).toMatch(/did not.*finalize|not finalize/);
    expect((caught as Error).message).toMatch(/re-run/);
    // Two head reads and no more: one for the routing, one on the rejection.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(2);
    // The transaction really did reach the seam -- this is a submit-time
    // failure, not a refusal before anything was composed.
    expect(providers.seen.submitTx?.version).toBe('v8');
  });

  it('SANITIZES the rejection it carries: no transaction or witness material survives onto the error', async () => {
    const providers = preForkProviders();
    // A node rejection of the shape that actually leaks: its message quotes the
    // serialized transaction it was handed, and it keeps the request body on an
    // own property the way an HTTP client does. Both are built from REAL
    // fixture material, so the assertion below is about the bytes this very
    // call carried.
    const leakedNonceHex = Buffer.from(recording.receivedCoin.nonce).toString('hex');
    const leakedStateHex = Buffer.from(v6Envelope).toString('hex');
    const rejection = new Error(`node rejected transaction ${leakedStateHex} with witness nonce ${leakedNonceHex}`);
    Object.assign(rejection, { response: { data: { tx: leakedStateHex, nonce: leakedNonceHex } } });
    providers.publicDataProvider.queryLatestProtocolVersion = vi
      .fn()
      .mockResolvedValueOnce(PRE_FORK_PROTOCOL_VERSION)
      .mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    providers.midnightProvider.submitTx = vi.fn().mockRejectedValue(rejection);

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StaleHeadError);
    // SERIALIZED the way a logger would serialize it -- own properties, cause
    // chain and all -- and then checked for the fixture bytes. This assertion
    // is what keeps the sanitization true across the extra wrapping layer the
    // fork diagnosis adds.
    const serialized = inspect(caught, { depth: null, showHidden: true });
    expect(serialized).not.toContain(leakedStateHex);
    expect(serialized).not.toContain(leakedNonceHex);
    // And the check is not vacuous: those bytes really are in the raw rejection.
    expect(inspect(rejection, { depth: null })).toContain(leakedStateHex);
    // Still diagnostic: the redaction marker says where material was removed.
    expect(serialized).toContain('[redacted]');
  });

  it('gives a retained-era DEPLOY rejected across the fork the runtime-deploy remediation', async () => {
    const providers = preForkProviders();
    providers.publicDataProvider.queryLatestProtocolVersion = vi
      .fn()
      .mockResolvedValueOnce(PRE_FORK_PROTOCOL_VERSION)
      .mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    providers.midnightProvider.submitTx = vi.fn().mockRejectedValue(new Error('node refused the transaction'));

    let caught: unknown;
    try {
      await runLedger8Deploy(providers, {
        contract,
        args: [],
        privateState: {},
        verifierKeys: new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]])
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StaleHeadError);
    expect((caught as StaleHeadError).kind).toBe('deploy');
    expect((caught as Error).message).toContain('runtime-deploy chapter');
    expect((caught as Error).message).not.toMatch(/re-run/);
    // The address the composition MINTED, read off the deploy record rather
    // than off anything the caller supplied -- a deploy supplies none.
    expect((caught as StaleHeadError).contractAddress.length).toBeGreaterThan(0);
    expect((caught as Error).message).toContain((caught as StaleHeadError).contractAddress);
  });

  it('re-running after the flip lands on the KEEP-STATE pipeline, with no change to the call', async () => {
    // The integration that makes the fork-window story true rather than
    // asserted: it ties this task's stale-head diagnosis to the previous task's
    // era dispatch. The remediation says "re-run", and this is the re-run --
    // the same options object, against the same providers, once their head has
    // crossed.
    const providers = preForkProviders();
    providers.publicDataProvider.queryLatestProtocolVersion = vi
      .fn()
      .mockResolvedValueOnce(PRE_FORK_PROTOCOL_VERSION)
      .mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    providers.midnightProvider.submitTx = recordThenReject(
      providers.seen,
      new Error('node refused the transaction')
    );

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(StaleHeadError);
    // The transaction the pre-fork attempt built was composed by the RETAINED
    // ledger, which is what makes the second attempt a different composition
    // rather than a retry of the same bytes.
    const preForkPayload = providers.seen.submitTx;
    expect(preForkPayload?.version).toBe('v8');
    const preForkBytes = preForkPayload?.version === 'v8' ? preForkPayload.txBytes : undefined;
    expect(txTagPrefix(preForkBytes!, RETAINED_ERA_TX_TAG)).toBe(RETAINED_ERA_TX_TAG);

    // THE RE-RUN. The network is now post-fork and serves the migrated state;
    // nothing in the caller's code changes.
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v9Envelope, POST_FORK_PROTOCOL_VERSION));
    providers.midnightProvider.submitTx = vi.fn().mockImplementation((tx: VersionedFinalizedTransaction) => {
      providers.seen.submitTx = tx;
      return Promise.resolve('keep-state-tx-id');
    });

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
    expect(providers.publicDataProvider.watchForTxData).toHaveBeenCalledWith('keep-state-tx-id');
    // The keep-state arm: an ORDINARY current-era transaction carrying a
    // retained-era call, so it crosses the seams as a live handle rather than
    // as retained-era bytes.
    expect(providers.seen.submitTx?.version).toBe('v9');
    expect(providers.seen.submitTx).not.toHaveProperty('txBytes');
  });
});
