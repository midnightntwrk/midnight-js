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
 * The RETAINED-NATIVE pipeline: a previous-toolchain contract called against a
 * PRE-FORK network head, composing on the retained ledger.
 *
 * The retained EXECUTION is replayed from a committed recording — see
 * `./ledger8-replay.ts` for why this package doubles the engine and what keeps
 * the double honest. Everything else in these tests is real: the era facade is
 * the genuine retained ledger, the contract is the real generated artifact,
 * and the transaction the era composes is a real retained-era transaction.
 *
 * `./keep-state.test.ts` is the same contract, the same recording and the same
 * pipeline against a POST-FORK head. Read the two together: the only thing
 * that differs is which era object the pipeline is handed, and which arm of the
 * provider seams the result crosses on.
 */

import { readFileSync } from 'node:fs';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import {
  type ComposeCallOptions,
  ComposeFailedError,
  ComposeOptionError,
  type LedgerEra,
  loadLedgerEra
} from '@midnight-ntwrk/midnight-js-protocol';
import {
  createMidnightProvider,
  type RawContractState,
  V8PayloadUnsupportedError,
  type VersionedFinalizedTransaction,
  type VersionedTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlankVerifierKeySlotError, Ledger8DeployOnV9Error, VerifierKeyMismatchError } from '../errors';
import {
  runLedger8Deploy,
  submitLedger8Tx
} from '../internal/ledger8-entry';
import { runLedger8CallPipeline } from '../internal/ledger8-pipeline';
import type { Ledger8CallTxOptions, Ledger8ContractProviders } from '../ledger8-contract';
import { submitCallTx, submitCallTxAsync } from '../submit-call-tx';
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

// The real generated artifact opens with `checkRuntimeVersion('0.16.0')`, which
// the installed current runtime rejects, so the specifier is redirected to the
// import-time stub for this file. Nothing here executes a circuit -- the
// recording is replayed -- so a stub is sufficient, and an insufficient one
// would fail loudly at import rather than quietly at run time.
vi.mock('@midnight-ntwrk/compact-runtime', () => import('./ledger8-runtime-stub'));

// The retained engine acquisition is replaced, and ONLY it: everything else on
// the protocol barrel -- `loadLedgerEra` above all -- stays the real thing, so
// the transaction these tests compose is composed by the genuine retained
// ledger. This package must not acquire the retained runtime at all: the real
// engine's construction guard exists to catch a second acquisition path for it.
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
// The era timeline's own scheme, `node-major * 1_000_000 + node-minor * 1_000`:
// node 1.x is the pre-fork era, node 2.x the post-fork one.
const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
const POST_FORK_PROTOCOL_VERSION = 2_000_000;

// THE STAND-IN KEY. `coin-receiver-016` ships no `keys/` of its own, so both
// committed state envelopes register `twin-contract`'s `increment.verifier`
// under `receive_coin` -- a key that belongs to a DIFFERENT circuit. The
// pre-proving byte-match below therefore passes ONLY because both sides of the
// comparison use the same stand-in: it exercises the check as wiring, and says
// nothing about this circuit's real key, which does not exist in this repo.
const STAND_IN_VERIFIER_KEY = Uint8Array.from(
  readFileSync(hfFixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))
);

/** What each provider seam was handed, captured for assertion. */
interface SeenPayloads {
  proveTx?: VersionedTx<unknown>;
  balanceTx?: VersionedTx<unknown>;
  submitTx?: VersionedFinalizedTransaction;
}

/** The retained overload's provider set, plus what its seams were handed. */
type RetainedProviders = Ledger8ContractProviders<CoinReceiver016Contract, typeof CIRCUIT_ID> & {
  readonly seen: SeenPayloads;
};

const rawState = (raw: Uint8Array, protocolVersion: number): RawContractState => ({
  version: protocolVersion === PRE_FORK_PROTOCOL_VERSION ? 'v8' : 'v9',
  protocolVersion,
  raw
});

describe('the retained-native pipeline (previous-toolchain contract, pre-fork head)', () => {
  let recording: CoinReceiverRecording;
  let contract: CoinReceiver016Contract;
  let retainedEra: LedgerEra;
  let v6Envelope: Uint8Array;

  beforeAll(async () => {
    recording = loadCoinReceiverRecording();
    v6Envelope = readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex');
    const module: CoinReceiver016Module = await import(
      /* @vite-ignore */ hfFixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
    );
    contract = new module.Contract({});
    retainedEra = await loadLedgerEra('v8');
  });

  beforeEach(() => {
    setNetworkId(NETWORK_ID);
    engineSlot.engine = undefined;
  });

  it('composes the recorded call on the retained ledger, in the fixed orchestration order', async () => {
    const log: OrchestrationLog = [];
    let composed: ComposeCallOptions | undefined;
    const engine = createReplayEngine(recording, log);
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const result = await runLedger8CallPipeline<ReplayState>({
      era: recordEraCalls(retainedEra, log, (options) => {
        composed = options;
      }),
      engine,
      publicDataProvider: providers.publicDataProvider,
      head: 'v8',
      contract,
      contractAddress: recording.contractAddress,
      circuitId: CIRCUIT_ID,
      args: [recording.receivedCoin],
      coinPublicKey: recording.coinPublicKey,
      privateState: {},
      localVerifierKey: STAND_IN_VERIFIER_KEY,
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000),
      encryptionPublicKey: providers.walletProvider.getEncryptionPublicKey()
    });

    // THE ORCHESTRATION ORDER, asserted as an order and not merely as an
    // outcome. `wrapKeepStateCall` is deliberately absent: the era's own
    // composition performs exactly the binding that method performs, and its
    // result is a live ledger handle that may not cross this package boundary.
    expect(log).toEqual([
      'era.extractState',
      'era.decodeContractState',
      'engine.downConvertForExecution',
      'engine.executeCircuit',
      'era.composeCallTx'
    ]);
    expect(result.txBytes).toBeInstanceOf(Uint8Array);
    // Exactly ONE call: the retained era has no call tree to express, and a
    // pre-fork contract cannot emit a cross-contract call in the first place.
    expect(composed?.calls).toHaveLength(1);
    // The state handed to the composition is the RAW envelope as read from
    // chain, which is what carries the registered operation and its key.
    expect(composed?.calls[0]?.contractState).toBe(v6Envelope);
    expect(composed?.calls[0]?.transcript.kind).toBe('unpartitioned');
  });

  it('emits a transaction the RETAINED ledger tagged, and the two eras tag differently', async () => {
    const log: OrchestrationLog = [];
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const result = await runLedger8CallPipeline<ReplayState>({
      era: retainedEra,
      engine: createReplayEngine(recording, log),
      publicDataProvider: providers.publicDataProvider,
      head: 'v8',
      contract,
      contractAddress: recording.contractAddress,
      circuitId: CIRCUIT_ID,
      args: [recording.receivedCoin],
      coinPublicKey: recording.coinPublicKey,
      privateState: {},
      localVerifierKey: STAND_IN_VERIFIER_KEY,
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000),
      encryptionPublicKey: providers.walletProvider.getEncryptionPublicKey()
    });

    // A raw PREFIX slice, never `parseSerializedTag`: that parser scans only
    // the first 64 bytes and both tags are longer than that.
    expect(txTagPrefix(result.txBytes, RETAINED_ERA_TX_TAG)).toBe(RETAINED_ERA_TX_TAG);
    // Measured, and worth pinning: the two eras' tags are NOT the same string,
    // so the tag corroborates which ledger produced a transaction. Never read
    // an era off the bracketed version alone -- the retained tag says `[v9]`.
    expect(CURRENT_ERA_TX_TAG).not.toBe(RETAINED_ERA_TX_TAG);
    expect(txTagPrefix(result.txBytes, CURRENT_ERA_TX_TAG)).not.toBe(CURRENT_ERA_TX_TAG);
  });

  it('carries the recorded coin movement in the GUARANTEED segment, with the fallible segment empty', async () => {
    const log: OrchestrationLog = [];
    let composed: ComposeCallOptions | undefined;
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const result = await runLedger8CallPipeline<ReplayState>({
      era: recordEraCalls(retainedEra, log, (options) => {
        composed = options;
      }),
      engine: createReplayEngine(recording, log),
      publicDataProvider: providers.publicDataProvider,
      head: 'v8',
      contract,
      contractAddress: recording.contractAddress,
      circuitId: CIRCUIT_ID,
      args: [recording.receivedCoin],
      coinPublicKey: recording.coinPublicKey,
      privateState: {},
      localVerifierKey: STAND_IN_VERIFIER_KEY,
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000),
      encryptionPublicKey: providers.walletProvider.getEncryptionPublicKey()
    });

    // The recorded circuit really does move a coin -- one contract-owned output
    // -- so there is an offer to place at all.
    expect(recording.transcript.zswapLocalState.outputs).toHaveLength(1);
    // GUARANTEED only, and a two-segment split is UNREACHABLE on this arm
    // rather than merely unimplemented: the retained execution leg emits one
    // unpartitioned op sequence, and the guaranteed/fallible split is computed
    // inside the composition, after the offer has to be an option on it. Do not
    // tighten this into a both-segments expectation.
    expect(result.guaranteedZswapOffer).toBeInstanceOf(Uint8Array);
    expect(result.fallibleZswapOffer).toBeUndefined();
    expect(composed?.guaranteedZswapOffer).toBe(result.guaranteedZswapOffer);
    expect(composed?.fallibleZswapOffer).toBeUndefined();
  });

  it('refuses more than one call on the retained arm, naming the option it refused', async () => {
    const log: OrchestrationLog = [];
    let composed: ComposeCallOptions | undefined;
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    await runLedger8CallPipeline<ReplayState>({
      era: recordEraCalls(retainedEra, log, (options) => {
        composed = options;
      }),
      engine: createReplayEngine(recording, log),
      publicDataProvider: providers.publicDataProvider,
      head: 'v8',
      contract,
      contractAddress: recording.contractAddress,
      circuitId: CIRCUIT_ID,
      args: [recording.receivedCoin],
      coinPublicKey: recording.coinPublicKey,
      privateState: {},
      localVerifierKey: STAND_IN_VERIFIER_KEY,
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000),
      encryptionPublicKey: providers.walletProvider.getEncryptionPublicKey()
    });

    const single = composed;
    expect(single).toBeDefined();
    const rootCall = single?.calls[0];
    expect(rootCall).toBeDefined();

    // The very options the pipeline built, with the root call duplicated. The
    // pipeline can never produce this -- it composes exactly one call -- which
    // is why the refusal is provoked at the era directly, against real data the
    // pipeline really did produce rather than a hand-built stand-in.
    let caught: unknown;
    try {
      retainedEra.composeCallTx({ ...single!, calls: [rootCall!, rootCall!] });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeOptionError);
    expect((caught as ComposeOptionError).option).toBe('calls');
    expect((caught as ComposeOptionError).version).toBe('v8');
  });
});

/**
 * The same pipeline reached through the UNCHANGED public entry points, which is
 * where the per-operation read invariants can be pinned: only a test that
 * composes the whole operation can count how many times the head and the
 * contract state were read.
 */
describe('the retained-native pipeline through the unchanged entry points', () => {
  let recording: CoinReceiverRecording;
  let contract: CoinReceiver016Contract;
  let v6Envelope: Uint8Array;

  beforeAll(async () => {
    recording = loadCoinReceiverRecording();
    v6Envelope = readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex');
    const module: CoinReceiver016Module = await import(
      /* @vite-ignore */ hfFixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
    );
    contract = new module.Contract({});
  });

  beforeEach(() => {
    setNetworkId(NETWORK_ID);
    engineSlot.engine = createReplayEngine(loadCoinReceiverRecording(), [], v6Envelope);
  });

  /** The provider set every test below starts from: a pre-fork head, the committed envelope. */
  const preForkProviders = (envelope: Uint8Array): RetainedProviders => {
    // The retained overload's own provider type, keyed by the fixture's own
    // circuit id. `createMockProviders`'s `zkConfigProvider` is keyed by `string`
    // and its `getVerifierKeys` return type is covariant in that key, so the
    // narrower provider is built explicitly rather than widened.
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
      .mockResolvedValue(rawState(envelope, PRE_FORK_PROTOCOL_VERSION));
    providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockFinalizedTxData());
    providers.zkConfigProvider.getVerifierKey = vi.fn().mockResolvedValue(STAND_IN_VERIFIER_KEY);
    // The recording was made against this coin public key, and the replay
    // engine refuses to replay for any other one.
    providers.walletProvider.getCoinPublicKey = (): string => recording.coinPublicKey;
    // The three seams, implemented against the version-tagged interfaces
    // directly rather than through `createWalletProvider`/`createMidnightProvider`:
    // those adapters lift a CURRENT-ERA-ONLY implementation and refuse the
    // retained arm by design, which is asserted as its own negative below.
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

  it('completes a call through submitCallTx, reading the head ONCE and the state ONCE', async () => {
    const providers = preForkProviders(v6Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
    // The record is watched for under the id the submission returned, and the
    // record itself is handed back VERSION-TAGGED rather than narrowed: a
    // retained-era contract's call is recorded by whichever era the head is on.
    expect(providers.publicDataProvider.watchForTxData).toHaveBeenCalledWith('retained-era-tx-id');
    expect(finalized.txData.status).toBe('SucceedEntirely');
    // The single-snapshot invariant, and the single-head-read invariant. One
    // head read feeds the routing and the era acquisition; one state read feeds
    // the era check, the key check, the execution and the composition. A second
    // read of either could answer differently mid-operation and leave one
    // transaction built half against each answer.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(providers.publicDataProvider.queryRawContractState).toHaveBeenCalledTimes(1);
  });

  it('hands every provider seam the RETAINED arm, as serialized bytes carrying the retained tag', async () => {
    const providers = preForkProviders(v6Envelope);

    await submitCallTx(providers, callOptions());

    // The WRITE surface's retained arm carries `txBytes`, not `tx` -- these are
    // genuinely different unions, and the read surface's retained arm carries
    // `tx`. Each is asserted against the shape its own seam declares.
    for (const payload of [providers.seen.proveTx, providers.seen.balanceTx, providers.seen.submitTx]) {
      expect(payload).toBeDefined();
      expect(payload?.version).toBe('v8');
      const bytes = payload?.version === 'v8' ? payload.txBytes : undefined;
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(txTagPrefix(bytes!, RETAINED_ERA_TX_TAG)).toBe(RETAINED_ERA_TX_TAG);
    }
  });

  it('returns immediately from submitCallTxAsync, without watching for the record', async () => {
    const providers = preForkProviders(v6Envelope);

    const submitted = await submitCallTxAsync(providers, callOptions());

    expect(submitted.txId).toBe('retained-era-tx-id');
    expect(submitted.circuitId).toBe(CIRCUIT_ID);
    expect(providers.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
  });

  it('composes and submits a retained-era DEPLOY, with the verifier keys the state declares', async () => {
    const providers = preForkProviders(v6Envelope);

    const deployed = await runLedger8Deploy(providers, {
      contract,
      args: [],
      privateState: {},
      verifierKeys: new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]])
    });

    expect(deployed.txId).toBe('retained-era-tx-id');
    // READ OFF the composition record, never derived: a deploy mints a fresh
    // nonce, so the same initial state deploys to a different address each time.
    expect(typeof deployed.deploy.contractAddress).toBe('string');
    expect(deployed.deploy.contractAddress.length).toBeGreaterThan(0);
    expect(txTagPrefix(deployed.deploy.txBytes, RETAINED_ERA_TX_TAG)).toBe(RETAINED_ERA_TX_TAG);
    expect(providers.seen.proveTx?.version).toBe('v8');
  });

  it('refuses a retained-era deploy whose key map does not name the entry points the state declares', async () => {
    const providers = preForkProviders(v6Envelope);

    // `verifierKeys` is REQUIRED by the request type on this arm -- omitting it
    // does not type-check -- so the reachable failure is a map that names the
    // wrong set. The retained constructor leaves every slot blank and the
    // retained deploy registers no keys of its own, which is why the map cannot
    // simply be left out.
    let caught: unknown;
    try {
      await runLedger8Deploy(providers, {
        contract,
        args: [],
        privateState: {},
        verifierKeys: new Map()
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    expect((caught as ComposeFailedError).version).toBe('v8');
    expect((caught as ComposeFailedError).stage).toBe('deploy-verifier-key');
  });

  it('refuses a retained-era deploy against a POST-FORK head, before the constructor runs', async () => {
    const providers = preForkProviders(v6Envelope);
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    const log: OrchestrationLog = [];
    engineSlot.engine = createReplayEngine(recording, log, v6Envelope);

    await expect(
      runLedger8Deploy(providers, {
        contract,
        args: [],
        privateState: {},
        verifierKeys: new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]])
      })
    ).rejects.toBeInstanceOf(Ledger8DeployOnV9Error);
    // Refused before ANY work: no constructor executed, nothing composed.
    expect(log).toEqual([]);
  });

  it('refuses the call when the chain holds a different key for the circuit, before proving', async () => {
    const providers = preForkProviders(v6Envelope);
    providers.zkConfigProvider.getVerifierKey = vi
      .fn()
      .mockResolvedValue(Uint8Array.from(STAND_IN_VERIFIER_KEY).fill(0x00));

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(VerifierKeyMismatchError);
    // BEFORE proving, which is the whole value of the check: a proof against a
    // key the chain does not hold is rejected on submission, and paid for.
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses the call when the chain holds no key for the circuit at all', async () => {
    // A DIFFERENT real retained-era envelope: the committed counter state,
    // which declares its own entry point and never `receive_coin`. So the slot
    // this call needs was never deployed, which is a different fault from a
    // wrong key -- a build-versus-address mistake rather than an artifact
    // mismatch -- and has a different fix, which is why it is its own error.
    const providers = preForkProviders(readHfHexFixture('state-v8-v6-envelope.hex'));

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(BlankVerifierKeySlotError);
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses at the FIRST seam when a provider serves the current era only', async () => {
    // `createMidnightProvider` lifts a current-era-only implementation, which
    // is exactly the provider a dApp has until it is widened. It rejects the
    // retained arm on the way IN -- one coherent typed refusal at the seam,
    // rather than a submit dying half-way through with a transaction already
    // composed and abandoned.
    const providers: RetainedProviders = {
      ...preForkProviders(v6Envelope),
      midnightProvider: createMidnightProvider(() => Promise.resolve('never-reached'))
    };

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(V8PayloadUnsupportedError);
  });

  it('returns the finalized record as the read surface reported it, retained arm included', async () => {
    const providers = preForkProviders(v6Envelope);
    // The READ surface's retained arm is a DIFFERENT union from the write
    // surface's: it carries `tx`, never `txBytes`. No provider produces this
    // arm yet -- the read path decodes with the current-era deserializer -- so
    // it is supplied here to prove this flow does not narrow it away. Refusing
    // it would refuse exactly the records the retained pipelines exist to
    // produce, which is why the retained result type is version-tagged.
    const retainedRecord = { ...createMockFinalizedTxData(), version: 'v8', tx: undefined as never };
    providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(retainedRecord);

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.txData.version).toBe('v8');
    expect(finalized.txData).not.toHaveProperty('txBytes');
    expect(finalized.txData).toBe(retainedRecord);
  });

  it('propagates a submit rejection with its cause, and does not re-read the head', async () => {
    const providers = preForkProviders(v6Envelope);
    const rejection = new Error('node refused the transaction');
    providers.midnightProvider.submitTx = vi.fn().mockRejectedValue(rejection);

    let caught: unknown;
    try {
      await submitLedger8Tx(providers, Uint8Array.from([1, 2, 3]), CIRCUIT_ID, 'v8');
    } catch (error) {
      caught = error;
    }

    // Propagated, not re-interpreted: deciding whether a rejection means the
    // head moved is the next task's, and it needs its own tests honestly red.
    expect(caught).toBe(rejection);
    expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
  });
});
