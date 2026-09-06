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
 * The KEEP-STATE pipeline: a previous-toolchain contract called against a
 * POST-FORK network head, composing on the current ledger.
 *
 * This is `./v8-native.test.ts`'s twin. The contract, the committed recording
 * and the pipeline are the same; what differs is which era object the pipeline
 * is handed and, consequently, which ledger tags the transaction and which arm
 * of the provider seams it crosses on. Read the two files together — the
 * orchestration order assertion is deliberately IDENTICAL in both, because the
 * claim under test is that the two arms differ only in the era object.
 *
 * `wrapKeepStateCall` is absent from that order on purpose, and it is worth
 * saying why here of all places, since the method is named for this arm: the
 * current era's own `composeCallTx` reaches exactly the same call-assembly step
 * the wrap reaches, so calling both would bind the call twice; and the wrap's
 * result is a live ledger handle, which may not cross this package boundary at
 * all. With the pipelines composed this way, `wrapKeepStateCall` consequently
 * has no consumer.
 */

import { readFileSync } from 'node:fs';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import { type ComposeCallOptions, type LedgerEra, loadLedgerEra } from '@midnight-ntwrk/midnight-js-protocol';
import {
  type RawContractState,
  type VersionedFinalizedTransaction,
  type VersionedTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EraInvariantViolationError, HeadStateEraMismatchError, IndexerInconsistencyError } from '../errors';
import { runLedger8CallPipeline } from '../internal/ledger8-pipeline';
import type { Ledger8CallTxOptions, Ledger8ContractProviders } from '../ledger8-contract';
import { submitCallTx } from '../submit-call-tx';
import { createEncryptionPublicKeyResolver } from '../utils';
import type { CoinReceiver016Contract, CoinReceiver016Module } from './ledger8-fixture-types';
import {
  type CoinReceiverRecording,
  createReplayEngine,
  CURRENT_ERA_TX_TAG,
  hfFixturePath,
  loadCoinReceiverRecording,
  type OrchestrationLog,
  readHfHexFixture,
  recordEraCalls,
  type ReplayState,
  RETAINED_ERA_TX_TAG,
  txTagPrefix
} from './ledger8-replay';
import { createMockFinalizedTxData, createMockProviders } from './test-mocks';

// See `./v8-native.test.ts` for both redirects: the artifact's own runtime
// check needs an import-time stub, and the retained engine acquisition is
// replaced so this package never acquires the retained runtime. Everything else
// on the protocol barrel stays real, `loadLedgerEra` above all.
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
const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
const POST_FORK_PROTOCOL_VERSION = 2_000_000;

// THE STAND-IN KEY -- see `./v8-native.test.ts` for the full note. The
// byte-match below passes ONLY because both sides use the same stand-in:
// `coin-receiver-016` has no verifier key of its own in this repo.
const STAND_IN_VERIFIER_KEY = Uint8Array.from(
  readFileSync(hfFixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))
);

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

describe('the keep-state pipeline (previous-toolchain contract, post-fork head)', () => {
  let recording: CoinReceiverRecording;
  let contract: CoinReceiver016Contract;
  let currentEra: LedgerEra;
  let v9Envelope: Uint8Array;

  beforeAll(async () => {
    recording = loadCoinReceiverRecording();
    v9Envelope = readHfHexFixture('coin-receiver-016', 'state-v9.hex');
    const module: CoinReceiver016Module = await import(
      /* @vite-ignore */ hfFixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
    );
    contract = new module.Contract({});
    currentEra = await loadLedgerEra('v9');
  });

  beforeEach(() => {
    setNetworkId(NETWORK_ID);
    engineSlot.engine = createReplayEngine(loadCoinReceiverRecording(), []);
  });

  const postForkProviders = (envelope: Uint8Array): RetainedProviders => {
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

    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(envelope, POST_FORK_PROTOCOL_VERSION));
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
      return Promise.resolve('keep-state-tx-id');
    });

    return { ...providers, seen };
  };

  const callOptions = (): Ledger8CallTxOptions<CoinReceiver016Contract, typeof CIRCUIT_ID> => ({
    compiledContract: contract,
    contractAddress: recording.contractAddress,
    circuitId: CIRCUIT_ID,
    args: [recording.receivedCoin]
  });

  it('composes the recorded call on the CURRENT ledger, in the same fixed order as the retained arm', async () => {
    const log: OrchestrationLog = [];
    let composed: ComposeCallOptions | undefined;
    const providers = postForkProviders(v9Envelope);

    const result = await runLedger8CallPipeline<ReplayState>({
      era: recordEraCalls(currentEra, log, (options) => {
        composed = options;
      }),
      engine: createReplayEngine(recording, log),
      publicDataProvider: providers.publicDataProvider,
      head: 'v9',
      contract,
      contractAddress: recording.contractAddress,
      circuitId: CIRCUIT_ID,
      args: [recording.receivedCoin],
      coinPublicKey: recording.coinPublicKey,
      privateState: {},
      localVerifierKey: STAND_IN_VERIFIER_KEY,
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000),
      encryptionPublicKey: createEncryptionPublicKeyResolver(
        recording.coinPublicKey,
        providers.walletProvider.getEncryptionPublicKey()
      )
    });

    // IDENTICAL to the retained arm's order, which is the claim: the two arms
    // differ only in which era object they are handed. `wrapKeepStateCall` is
    // not in it -- see this file's own header for why, and note that the
    // transcript still crosses as `'unpartitioned'`, which is what makes the
    // era's composition perform the very binding that method performs.
    expect(log).toEqual([
      'era.extractState',
      'era.decodeContractState',
      'engine.downConvertForExecution',
      'engine.executeCircuit',
      'era.composeCallTx'
    ]);
    expect(composed?.calls).toHaveLength(1);
    expect(composed?.calls[0]?.transcript.kind).toBe('unpartitioned');
    expect(composed?.calls[0]?.contractState).toBe(v9Envelope);

    // The CURRENT era tagged this one, and the retained tag does not match it.
    expect(txTagPrefix(result.txBytes, CURRENT_ERA_TX_TAG)).toBe(CURRENT_ERA_TX_TAG);
    expect(txTagPrefix(result.txBytes, RETAINED_ERA_TX_TAG)).not.toBe(RETAINED_ERA_TX_TAG);
  });

  it('carries the recorded coin movement in the GUARANTEED segment here too', async () => {
    const log: OrchestrationLog = [];
    const providers = postForkProviders(v9Envelope);

    const result = await runLedger8CallPipeline<ReplayState>({
      era: currentEra,
      engine: createReplayEngine(recording, log),
      publicDataProvider: providers.publicDataProvider,
      head: 'v9',
      contract,
      contractAddress: recording.contractAddress,
      circuitId: CIRCUIT_ID,
      args: [recording.receivedCoin],
      coinPublicKey: recording.coinPublicKey,
      privateState: {},
      localVerifierKey: STAND_IN_VERIFIER_KEY,
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000),
      encryptionPublicKey: createEncryptionPublicKeyResolver(
        recording.coinPublicKey,
        providers.walletProvider.getEncryptionPublicKey()
      )
    });

    // Unreachable as a two-segment split on this arm as well, and for the same
    // structural reason: the partition is computed inside the composition,
    // after the offer must already be an option on it.
    expect(result.guaranteedZswapOffer).toBeInstanceOf(Uint8Array);
    expect(result.fallibleZswapOffer).toBeUndefined();
  });

  it('completes a call through the unchanged submitCallTx, reading the head ONCE and the state ONCE', async () => {
    const providers = postForkProviders(v9Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
    expect(providers.publicDataProvider.watchForTxData).toHaveBeenCalledWith('keep-state-tx-id');
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(providers.publicDataProvider.queryRawContractState).toHaveBeenCalledTimes(1);
  });

  it('hands every provider seam the CURRENT-era arm, as a live ledger transaction', async () => {
    const providers = postForkProviders(v9Envelope);

    await submitCallTx(providers, callOptions());

    // The `version` tag names the LEDGER RUNTIME that produced the payload, not
    // the toolchain that produced the contract. A keep-state transaction is an
    // ordinary current-era transaction that happens to carry a retained-era
    // call, so it crosses as the current era's live handle -- both sides of the
    // seam share that runtime. Tagging it `'v8'` would claim the retained
    // runtime built it, which is false, and would send a current-era-only
    // provider looking for a runtime it does not need.
    for (const payload of [providers.seen.proveTx, providers.seen.balanceTx, providers.seen.submitTx]) {
      expect(payload).toBeDefined();
      expect(payload?.version).toBe('v9');
      // The WRITE surface's current-era arm carries `tx`, and carries no
      // `txBytes` at all -- the two arms are genuinely different shapes.
      expect(payload).not.toHaveProperty('txBytes');
    }
  });

  it('refuses a provider that answers this current-era flow in the retained era', async () => {
    const providers = postForkProviders(v9Envelope);
    // A broken or mis-pointed provider: it accepted a current-era payload and
    // answered with retained-era bytes. Nothing in the seam types ties a
    // provider's output era to its input era, so this is checked rather than
    // assumed.
    providers.proofProvider.proveTx = vi
      .fn()
      .mockResolvedValue({ version: 'v8', txBytes: Uint8Array.from([1, 2, 3]) });

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EraInvariantViolationError);
    expect((caught as EraInvariantViolationError).seam).toBe('proveTx');
    expect((caught as EraInvariantViolationError).circuitId).toBe(CIRCUIT_ID);
    expect((caught as EraInvariantViolationError).expected).toBe('v9');
  });

  it('refuses when the head reading has fallen behind the state it fetched, and says re-running fixes it', async () => {
    const providers = postForkProviders(v9Envelope);
    // The fork-window case: the operation started from a pre-fork head reading
    // and then fetched a post-fork state. A FRESH head read agrees with the
    // state, so the first reading was merely stale.
    providers.publicDataProvider.queryLatestProtocolVersion = vi
      .fn()
      .mockResolvedValueOnce(PRE_FORK_PROTOCOL_VERSION)
      .mockResolvedValue(POST_FORK_PROTOCOL_VERSION);

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HeadStateEraMismatchError);
    expect((caught as HeadStateEraMismatchError).head).toBe('v8');
    expect((caught as HeadStateEraMismatchError).stateEra).toBe('v9');
    // The re-read is the second head read, and it happens ONLY on a
    // disagreement -- which is why the happy path above reads the head once.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(2);
  });

  it('refuses, differently, when the disagreement survives a fresh head read', async () => {
    const providers = postForkProviders(v9Envelope);
    // The head is confirmed, so the served state and the served head cannot
    // both describe one chain. A fault in what was served, not a stale reading
    // this client can correct -- and deliberately not reported as a fork in
    // progress, which nothing here establishes.
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(PRE_FORK_PROTOCOL_VERSION);

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(IndexerInconsistencyError);
    expect((caught as IndexerInconsistencyError).head).toBe('v8');
    expect((caught as IndexerInconsistencyError).stateEra).toBe('v9');
  });

  it("routes on the ENVELOPE, not on the record's own era label, so a mislabelled state cannot mix eras", async () => {
    const providers = postForkProviders(v9Envelope);
    // The unsanctioned-mixing case, and the one `RawContractState.version`
    // cannot catch: the record LABELS itself current-era, and the head really
    // is current-era, so the label and the head agree -- while the bytes carry
    // a pre-fork envelope. That label is derived from the record's
    // `protocolVersion` alone and is explicitly not a verified statement about
    // the bytes, which is why the envelope is read instead.
    providers.publicDataProvider.queryRawContractState = vi.fn().mockResolvedValue({
      version: 'v9',
      protocolVersion: POST_FORK_PROTOCOL_VERSION,
      raw: readHfHexFixture('state-v8-v6-envelope.hex')
    });

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    // Refused before any decoder is handed the bytes, so the pre-fork envelope
    // never reaches the current era's decoder at all.
    expect(caught).toBeInstanceOf(IndexerInconsistencyError);
    expect((caught as IndexerInconsistencyError).stateEra).toBe('v8');
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses before any provider round trip when no contract is deployed at the address', async () => {
    const providers = postForkProviders(v9Envelope);
    providers.publicDataProvider.queryRawContractState = vi.fn().mockResolvedValue(null);

    await expect(submitCallTx(providers, callOptions())).rejects.toThrow(
      `No contract deployed at contract address '${recording.contractAddress}'`
    );
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });
});
