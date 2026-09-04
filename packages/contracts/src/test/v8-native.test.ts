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
import { inspect } from 'node:util';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import {
  type ComposeCallOptions,
  ComposeFailedError,
  ComposeOptionError,
  type LedgerEra,
  loadLedgerEra
} from '@midnight-ntwrk/midnight-js-protocol';
import { type Recipient } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type ProvingProvider,
  sampleCoinPublicKey,
  sampleEncryptionPublicKey
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  createMidnightProvider,
  createProofProvider,
  createWalletProvider,
  type RawContractState,
  UntaggedPayloadError,
  V8PayloadUnsupportedError,
  type VersionedFinalizedTransaction,
  type VersionedTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BlankVerifierKeySlotError,
  EraInvariantViolationError,
  IndexerInconsistencyError,
  Ledger8DeployOnV9Error,
  Ledger8SeamFailedError,
  Ledger8ShieldedSpendUnsupportedError,
  VerifierKeyMismatchError
} from '../errors';
import { findDeployedContract } from '../find-deployed-contract';
import { findLedger8Contract, runLedger8Deploy, submitLedger8CallTx } from '../internal/ledger8-entry';
import { runLedger8CallPipeline } from '../internal/ledger8-pipeline';
import type {
  Ledger8CallTxOptions,
  Ledger8ContractProviders,
  Ledger8FindDeployedContractOptions
} from '../ledger8-contract';
import { submitCallTx, submitCallTxAsync } from '../submit-call-tx';
import {
  createEncryptionPublicKeyResolver,
  type EncryptionPublicKeyResolver,
  SHIELDED_BURN_COIN_PUBLIC_KEY
} from '../utils';
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

/**
 * The committed recording with its single shielded output re-pointed at a
 * USER-owned recipient, paying the given coin public key.
 *
 * Needed because the recording's own output is CONTRACT-owned
 * (`is_left: false`), and that arm of the offer builder never consults the
 * encryption-key resolver at all — `ZswapOutput.newContractOwned` takes no
 * encryption key, only an address. So NO test built on the recording exactly
 * as committed can say anything about which key an output is encrypted to,
 * which is precisely how an encryption resolver that could never refuse
 * survived a green suite. Re-pointing the recipient is the smallest change
 * that puts the resolver on the path, and it changes nothing else: the same
 * coin, the same pre-state, the same circuit.
 *
 * @param recording The committed recording to derive from.
 * @param coinPublicKey The coin public key the re-pointed output pays.
 * @returns The recording, paying that key instead of the contract.
 */
const recordingPayingUser = (recording: CoinReceiverRecording, coinPublicKey: string): CoinReceiverRecording => {
  const output = recording.transcript.zswapLocalState.outputs[0];
  // Derived from the recording rather than invented, so a recording that ever
  // stops carrying an output fails here rather than testing nothing.
  expect(output).toBeDefined();
  const recipient: Recipient = { is_left: true, left: coinPublicKey, right: output!.recipient.right };
  return {
    ...recording,
    transcript: {
      ...recording.transcript,
      zswapLocalState: {
        ...recording.transcript.zswapLocalState,
        outputs: [{ coinInfo: output!.coinInfo, recipient }]
      }
    }
  };
};

/**
 * The provider set both retained-era describes start from: a pre-fork head,
 * the committed envelope, and a recorder on each of the three seams.
 *
 * Module scope rather than a closure inside one `describe`, because the attach
 * suite below needs the same set and a second copy would drift from this one.
 */
const retainedProviders = (recording: CoinReceiverRecording, envelope: Uint8Array): RetainedProviders => {
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
      encryptionPublicKey: createEncryptionPublicKeyResolver(
        recording.coinPublicKey,
        providers.walletProvider.getEncryptionPublicKey()
      )
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
      encryptionPublicKey: createEncryptionPublicKeyResolver(
        recording.coinPublicKey,
        providers.walletProvider.getEncryptionPublicKey()
      )
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
      encryptionPublicKey: createEncryptionPublicKeyResolver(
        recording.coinPublicKey,
        providers.walletProvider.getEncryptionPublicKey()
      )
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

  it("encrypts a user-owned output to the RECIPIENT's key, asking the resolver for that recipient", async () => {
    const log: OrchestrationLog = [];
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const walletEncryptionPublicKey = providers.walletProvider.getEncryptionPublicKey();
    const thirdPartyCoinPublicKey = sampleCoinPublicKey();
    const thirdPartyEncryptionPublicKey = sampleEncryptionPublicKey();
    // A resolver that KNOWS this recipient, so the output composes and the key
    // it composes with is observable. Spied rather than replaced, so the
    // answers are the real helper's own.
    const resolver: EncryptionPublicKeyResolver = vi.fn(
      createEncryptionPublicKeyResolver(
        recording.coinPublicKey,
        walletEncryptionPublicKey,
        new Map([[thirdPartyCoinPublicKey, thirdPartyEncryptionPublicKey]])
      )
    );

    const result = await runLedger8CallPipeline<ReplayState>({
      era: retainedEra,
      engine: createReplayEngine(recordingPayingUser(recording, thirdPartyCoinPublicKey), log),
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
      encryptionPublicKey: resolver
    });

    // PER RECIPIENT, not per caller: the resolver is asked about the party being
    // paid, and the key the output is built with is the one it answered for that
    // party -- NOT the wallet's own encryption key, which is what a bare key
    // coerced into `() => key` would have supplied for every recipient alike.
    expect(resolver).toHaveBeenCalledWith(thirdPartyCoinPublicKey);
    expect(resolver).toHaveReturnedWith(thirdPartyEncryptionPublicKey);
    expect(resolver).not.toHaveReturnedWith(walletEncryptionPublicKey);
    expect(result.guaranteedZswapOffer).toBeInstanceOf(Uint8Array);
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
      encryptionPublicKey: createEncryptionPublicKeyResolver(
        recording.coinPublicKey,
        providers.walletProvider.getEncryptionPublicKey()
      )
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
  const preForkProviders = (envelope: Uint8Array): RetainedProviders => retainedProviders(recording, envelope);

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

  it('refuses a malformed contract address on the CALL arm, without a single provider call', async () => {
    const providers = preForkProviders(v6Envelope);

    // The same local refusal the current-era arm makes, and the reason it is
    // local: a malformed address would otherwise cost a head read and a state
    // read to discover, and the state read would answer "no contract deployed
    // there" -- which points at the chain for a fault in the caller's own
    // argument.
    await expect(
      submitCallTx(providers, { ...callOptions(), contractAddress: 'not-a-contract-address' })
    ).rejects.toThrow();
    expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    expect(providers.publicDataProvider.queryRawContractState).not.toHaveBeenCalled();
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses a circuit the artifact does not declare, naming the circuit rather than the chain', async () => {
    const providers = preForkProviders(v6Envelope);

    // Without this check the id would travel all the way to the key lookup and
    // come back as a blank verifier-key slot -- a diagnosis that sends a caller
    // looking at the deployed contract for what is a typo in its own call. The
    // id is checked against the ARTIFACT's own circuit collection, which is the
    // only thing that can answer it locally.
    //
    // Driven at `submitLedger8CallTx` rather than through the overload,
    // deliberately: the retained overload narrows `circuitId` to the ids the
    // artifact declares, so an undeclared id is a COMPILE error there -- which
    // is the stronger refusal and is where a TypeScript caller meets it. This
    // check exists for the caller the type system cannot reach: JavaScript, or
    // an id computed at run time. So the test enters at the layer that check
    // lives on.
    await expect(
      submitLedger8CallTx(providers, {
        compiledContract: contract,
        contractAddress: recording.contractAddress,
        circuitId: 'not_a_declared_circuit',
        args: [recording.receivedCoin]
      })
    ).rejects.toThrow("Circuit 'not_a_declared_circuit' is undefined");
    expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    expect(providers.publicDataProvider.queryRawContractState).not.toHaveBeenCalled();
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

  it('refuses at the FIRST seam, proveTx, when a proof provider serves the current era only', async () => {
    // `createProofProvider` lifts a current-era-only proving implementation,
    // which is what a dApp has until its providers are widened. `proveTx` is
    // the FIRST of the three seams, so the refusal lands before anything has
    // been proven, balanced or submitted -- which is the point of leaving the
    // inbound guard in `types` rather than lifting it here. The proving
    // implementation below is never reached, and that is asserted rather than
    // assumed.
    let provingReached = false;
    const provingProvider: ProvingProvider = {
      check: () => Promise.resolve([]),
      prove: () => {
        provingReached = true;
        return Promise.resolve(Uint8Array.from([]));
      },
      lookupKey: () => Promise.resolve(undefined)
    };
    const providers: RetainedProviders = {
      ...preForkProviders(v6Envelope),
      proofProvider: createProofProvider(provingProvider)
    };

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(V8PayloadUnsupportedError);
    expect(provingReached).toBe(false);
    expect(providers.walletProvider.balanceTx).not.toHaveBeenCalled();
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('refuses at the balanceTx seam when only the wallet serves the current era', async () => {
    // Covered separately from the first seam, because reaching it proves
    // something different: the refusal is PER SEAM, so a partly widened
    // provider set is refused at whichever seam has not been widened rather
    // than slipping through the ones that have.
    const base = preForkProviders(v6Envelope);
    const providers: RetainedProviders = {
      ...base,
      walletProvider: createWalletProvider({
        balanceTx: () => Promise.reject(new Error('never reached')),
        getCoinPublicKey: () => recording.coinPublicKey,
        getEncryptionPublicKey: () => base.walletProvider.getEncryptionPublicKey()
      })
    };

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(V8PayloadUnsupportedError);
    expect((caught as V8PayloadUnsupportedError).seam).toBe('balanceTx');
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('refuses at the submitTx seam when only the submission provider serves the current era', async () => {
    const providers: RetainedProviders = {
      ...preForkProviders(v6Envelope),
      midnightProvider: createMidnightProvider(() => Promise.reject(new Error('never reached')))
    };

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(V8PayloadUnsupportedError);
    expect((caught as V8PayloadUnsupportedError).seam).toBe('submitTx');
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

  it('SANITIZES a provider rejection: no transaction or witness material survives onto the error', async () => {
    const providers = preForkProviders(v6Envelope);
    // A proof-server failure of the shape that actually leaks: its message
    // quotes the serialized state it was handed, and it keeps the response
    // body on an own property, the way an HTTP client does. Both are built
    // from REAL fixture material, so the assertion below is about the bytes
    // this very call carried rather than about a placeholder.
    const leakedNonceHex = Buffer.from(recording.receivedCoin.nonce).toString('hex');
    const leakedStateHex = Buffer.from(v6Envelope).toString('hex');
    const rejection = new Error(
      `proof server returned 500 for payload ${leakedStateHex} with witness nonce ${leakedNonceHex}`
    );
    // The own property an HTTP client would carry the echoed request on.
    Object.assign(rejection, { response: { data: { tx: leakedStateHex, nonce: leakedNonceHex } } });
    providers.proofProvider.proveTx = vi.fn().mockRejectedValue(rejection);

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8SeamFailedError);
    // The CODE, not only the class: a consumer that cannot import this package's
    // classes -- a JavaScript caller, or one narrowing across a bundle boundary
    // -- branches on `code`, so that is the surface the negative has to pin.
    expect(hasErrorCode(caught, CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED)).toBe(true);
    expect((caught as Ledger8SeamFailedError).seam).toBe('proveTx');
    expect((caught as Ledger8SeamFailedError).circuitId).toBe(CIRCUIT_ID);

    // SERIALIZED the way a logger would serialize it -- own properties, cause
    // chain and all -- and then checked for the fixture bytes. This assertion
    // is what keeps the sanitization true: it fails the moment the raw
    // rejection is propagated again, by whatever route.
    const serialized = inspect(caught, { depth: null, showHidden: true });
    expect(serialized).not.toContain(leakedStateHex);
    expect(serialized).not.toContain(leakedNonceHex);
    // And the check is not vacuous: those bytes really are in the raw rejection.
    expect(inspect(rejection, { depth: null })).toContain(leakedStateHex);

    // Still diagnostic: the seam survives, and the redaction marker says where
    // the material was removed rather than leaving a silently truncated message.
    expect(serialized).toContain('proveTx');
    const cause = (caught as { readonly cause?: unknown }).cause;
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toContain('[redacted]');
  });

  it('refuses a provider that answers this PRE-FORK flow in the current era, naming the era it expected', async () => {
    const providers = preForkProviders(v6Envelope);
    // The mirror of the keep-state case: nothing in the seam types ties a
    // provider's output era to its input era, so a provider that accepted
    // retained-era bytes and answered with a current-era handle is checked
    // rather than assumed. `expected` is what says WHICH direction was
    // violated, and it is the whole reason the error carries the field.
    providers.proofProvider.proveTx = vi.fn().mockResolvedValue({ version: 'v9', tx: undefined });

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EraInvariantViolationError);
    expect((caught as EraInvariantViolationError).seam).toBe('proveTx');
    expect((caught as EraInvariantViolationError).circuitId).toBe(CIRCUIT_ID);
    expect((caught as EraInvariantViolationError).expected).toBe('v8');
    // The message has to name the era too, or a caller reading a log rather
    // than catching the class learns nothing about the direction.
    expect((caught as Error).message).toContain("'v8'");
  });

  it('refuses an UNTAGGED payload from a provider on the pre-fork flow', async () => {
    const providers = preForkProviders(v6Envelope);
    // A JavaScript caller's provider, or one built before the seams were
    // version-tagged: it answers with no `version` at all. Reported as an
    // untagged payload rather than assumed to be either era.
    providers.proofProvider.proveTx = vi.fn().mockResolvedValue(undefined);

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(UntaggedPayloadError);
  });

  it("keeps this framework's own coded refusals unwrapped, so a caller can still narrow on them", async () => {
    const providers = preForkProviders(v6Envelope);
    // The sanitizing wrapper must not swallow the refusal a current-era-only
    // provider raises: a caller narrowing on it would otherwise see a generic
    // seam failure and lose the one diagnosis that says "widen your provider".
    providers.proofProvider.proveTx = vi.fn().mockRejectedValue(new V8PayloadUnsupportedError('proveTx', 42));

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(V8PayloadUnsupportedError);
  });

  it('re-reads the head on a SUBMIT rejection and, finding the same era, re-throws the seam failure', async () => {
    const providers = preForkProviders(v6Envelope);
    providers.midnightProvider.submitTx = vi.fn().mockRejectedValue(new Error('node refused the transaction'));

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Ledger8SeamFailedError);
    expect(hasErrorCode(caught, CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED)).toBe(true);
    expect((caught as Ledger8SeamFailedError).seam).toBe('submitTx');

    // TWO head reads: one for the routing, and one on the rejection to ask
    // whether the network moved under this call. This head has not moved, so
    // the rejection is what it says it is and travels unchanged -- a submit
    // rejection is not reported as a fork crossing on the strength of being a
    // rejection. `./stale-head.test.ts` covers the case where it HAS moved.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(2);
  });

  it('does not re-read the head when a rejection comes from a seam OTHER than submit', async () => {
    const providers = preForkProviders(v6Envelope);
    // A proving failure cannot mean the network moved -- the proof server
    // touches no chain state -- so asking the network about it would be a round
    // trip that could not change the answer.
    providers.proofProvider.proveTx = vi.fn().mockRejectedValue(new Error('proof server refused the request'));

    await expect(submitCallTx(providers, callOptions())).rejects.toBeInstanceOf(Ledger8SeamFailedError);
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
  });

  it('stores the private state the replayed call produced, rather than storing nothing over it', async () => {
    const providers = preForkProviders(v6Envelope);
    // The provider actually HOLDS a state under the named id. Stubbing this is
    // not scene-setting: the default mock's `get` answers `undefined`, and a
    // named id with nothing behind it is now refused outright, so without this
    // stub the test would never reach the store it exists to assert. It also
    // makes the read observable, which is what pins that the call ran against
    // the caller's real state rather than a default one.
    providers.privateStateProvider.get = vi.fn().mockResolvedValue({ storedBefore: true });

    const finalized = await submitCallTx(providers, { ...callOptions(), privateStateId: 'retained-private-state' });

    expect(providers.privateStateProvider.get).toHaveBeenCalledWith('retained-private-state');
    // The recorded `privateStateAfter` is a real value -- this contract
    // declares no private state, so it is an empty object -- and it is what
    // gets written back. Asserting it is not `undefined` is the point: a
    // recording missing that member would have every call store nothing over a
    // caller's real private state, with a green suite.
    expect(finalized.nextPrivateState).toEqual({});
    expect(finalized.nextPrivateState).not.toBeUndefined();
    expect(providers.privateStateProvider.set).toHaveBeenCalledWith('retained-private-state', {});
  });

  it('refuses a named privateStateId the provider holds nothing under, rather than executing against undefined', async () => {
    const providers = preForkProviders(v6Envelope);
    // The default mock's own answer, made explicit: an EMPTY provider asked for
    // a named id. Naming an id is the caller saying a private state exists, so
    // an empty answer is a caller error and not a contract without state.
    providers.privateStateProvider.get = vi.fn().mockResolvedValue(undefined);

    await expect(
      submitCallTx(providers, { ...callOptions(), privateStateId: 'retained-private-state' })
    ).rejects.toThrow("No private state found at private state ID 'retained-private-state'");

    // Refused BEFORE the circuit ran and before anything was proven or stored.
    // Passing `undefined` down is what makes this expensive rather than merely
    // wrong: a defensively written witness would produce a valid proof against
    // a DEFAULT state, and the result would then be stored back under this same
    // id -- overwriting the caller's real state with one derived from a
    // starting point that was never theirs.
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  it('runs a contract that declares no private state with no id at all, which is not the same as an empty provider', async () => {
    const providers = preForkProviders(v6Envelope);
    providers.privateStateProvider.get = vi.fn().mockResolvedValue(undefined);

    // The POSITIVE half of the distinction above: no id named means the circuit
    // reads no private state, which stays legal and must not be swept into the
    // refusal. Without this, tightening the empty-provider case could be
    // "fixed" by refusing an absent id too, and no test would notice.
    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
    expect(providers.privateStateProvider.get).not.toHaveBeenCalled();
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  /**
   * WHICH KEY each shielded output is encrypted to, asserted through the entry
   * point rather than against a resolver in isolation.
   *
   * The resolver helpers have their own unit tests. What those cannot see is
   * whether this arm BUILDS one: handing the offer builder a bare encryption
   * key is silently accepted and coerced into `() => key`, a resolver that can
   * never refuse and answers with the caller's own key for every recipient. The
   * three cases below are the smallest set that tells a real resolver from that
   * constant one — a constant resolver passes the first two and cannot fail the
   * third, so the third is the one that has to be here.
   */
  describe('per-recipient output encryption', () => {
    it("refuses an output paying a THIRD PARTY, rather than encrypting it to the caller's own key", async () => {
      const providers = preForkProviders(v6Envelope);
      // Some other wallet's coin public key: not this caller's, and not the
      // burn address, so nothing this arm knows can map it to an encryption
      // key. The retained call options carry no additional mappings for the
      // caller to supply one through either.
      const thirdPartyCoinPublicKey = sampleCoinPublicKey();
      engineSlot.engine = createReplayEngine(
        recordingPayingUser(loadCoinReceiverRecording(), thirdPartyCoinPublicKey),
        [],
        v6Envelope
      );

      // THE FUNDS-LOSS ASSERTION. With a bare key in place of a resolver this
      // call SUCCEEDS: the output's commitment is to the third party's coin
      // public key while its ciphertext is encrypted to the sender's, so the
      // transaction proves, balances and submits, and the recipient owns a coin
      // they can never discover on chain. Nothing errors. A refusal is the only
      // answer that cannot lose the recipient's coin.
      await expect(submitCallTx(providers, callOptions())).rejects.toThrow(
        /Unable to resolve encryption public key for recipient/
      );

      // Refused while composing, so nothing was proven, balanced or submitted.
      expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
      expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
    });

    it("composes an output paying the caller's OWN key", async () => {
      const providers = preForkProviders(v6Envelope);
      // The wallet's own coin public key -- the one `retainedProviders` reports
      // and the one the recording was made against -- which the resolver maps
      // to the wallet's own encryption key.
      engineSlot.engine = createReplayEngine(
        recordingPayingUser(loadCoinReceiverRecording(), recording.coinPublicKey),
        [],
        v6Envelope
      );

      const finalized = await submitCallTx(providers, callOptions());

      expect(finalized.circuitId).toBe(CIRCUIT_ID);
      expect(providers.midnightProvider.submitTx).toHaveBeenCalledTimes(1);
    });

    it('maps the well-known BURN address as the current era does, rather than refusing it', async () => {
      const providers = preForkProviders(v6Envelope);
      // A burn output is a deliberate send to an unspendable key, and the
      // current era maps it to `BURN_ENCRYPTION_PUBLIC_KEY`. The retained arm
      // must not refuse what the current era accepts: dropping that mapping
      // would make every pre-fork contract that burns a coin uncallable.
      engineSlot.engine = createReplayEngine(
        recordingPayingUser(loadCoinReceiverRecording(), SHIELDED_BURN_COIN_PUBLIC_KEY),
        [],
        v6Envelope
      );

      const finalized = await submitCallTx(providers, callOptions());

      expect(finalized.circuitId).toBe(CIRCUIT_ID);
      expect(providers.midnightProvider.submitTx).toHaveBeenCalledTimes(1);
    });
  });

  it('refuses a circuit that spends a shielded coin the contract already held', async () => {
    const providers = preForkProviders(v6Envelope);
    // DERIVED from the recording rather than invented: the recorded output's
    // own coin, presented as an INPUT with a Merkle index and with no matching
    // output -- exactly the shape of a coin spent from chain rather than one
    // produced by this call. Nothing reaches a ledger here, because the refusal
    // fires before the offer is built, so the derived shape is all the check
    // reads.
    const recordedCoin = recording.transcript.zswapLocalState.outputs[0]?.coinInfo;
    expect(recordedCoin).toBeDefined();
    const spending = loadCoinReceiverRecording();
    engineSlot.engine = createReplayEngine(
      {
        ...spending,
        transcript: {
          ...spending.transcript,
          zswapLocalState: {
            ...spending.transcript.zswapLocalState,
            outputs: [],
            inputs: [{ ...recordedCoin!, mt_index: 0n }]
          }
        }
      },
      [],
      v6Envelope
    );

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    // A TYPED refusal naming the era limitation and the circuit, rather than
    // the bare assertion the offer builder would otherwise raise from inside
    // itself, naming neither.
    expect(caught).toBeInstanceOf(Ledger8ShieldedSpendUnsupportedError);
    expect(hasErrorCode(caught, CONTRACTS_ERROR_CODES.LEDGER8_SHIELDED_SPEND_UNSUPPORTED)).toBe(true);
    expect((caught as Ledger8ShieldedSpendUnsupportedError).circuitId).toBe(CIRCUIT_ID);
    expect((caught as Error).message).toContain('Zswap chain state');
    // Refused before anything was composed or sent anywhere.
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });
});

/**
 * Attaching to an already-deployed retained-era contract — a READ path, so it
 * composes nothing and submits nothing.
 *
 * It gets the same treatment as the two write arms because it makes the same
 * two safety claims they do, and neither is free: that a mis-dispatched
 * artifact is caught at ATTACH time rather than at the first call, and that the
 * whole attach runs against ONE chain snapshot.
 */
describe('attaching to a retained-era contract already on chain', () => {
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
    // Attaching touches no engine at all — no down-convert, no execution, no
    // composition — so leaving the slot empty is itself part of the claim: any
    // engine acquisition on this path would reject.
    engineSlot.engine = undefined;
  });

  const attachProviders = (envelope: Uint8Array, protocolVersion = PRE_FORK_PROTOCOL_VERSION): RetainedProviders => {
    const providers = retainedProviders(recording, envelope);
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(protocolVersion);
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(envelope, protocolVersion));
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockResolvedValue(createMockFinalizedTxData());
    return providers;
  };

  const attachOptions = (): Ledger8FindDeployedContractOptions<CoinReceiver016Contract> => ({
    compiledContract: contract,
    contractAddress: recording.contractAddress
  });

  it('attaches, checking the key for every circuit the artifact declares, on ONE snapshot and ONE head read', async () => {
    const providers = attachProviders(v6Envelope);

    const found = await findDeployedContract(providers, attachOptions());

    expect(found.compiledContract).toBe(contract);
    expect(found.contractAddress).toBe(recording.contractAddress);
    // The deploy record is passed through VERSION-TAGGED rather than narrowed:
    // a retained-era contract was deployed in whichever era was current then,
    // and refusing the pre-fork arm would refuse the contracts this arm exists
    // to keep callable.
    expect(found.deployTxData.version).toBe('v9');
    expect(found.deployTxData.txId).toBe(createMockFinalizedTxData().txId);

    // Every declared circuit is checked, and this artifact declares exactly one.
    expect(providers.zkConfigProvider.getVerifierKey).toHaveBeenCalledTimes(1);
    expect(providers.zkConfigProvider.getVerifierKey).toHaveBeenCalledWith(CIRCUIT_ID);
    // The same two per-operation invariants the write arms hold to.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(providers.publicDataProvider.queryRawContractState).toHaveBeenCalledTimes(1);
  });

  it('refuses a mis-dispatched artifact BEFORE waiting on the deploy record', async () => {
    const providers = attachProviders(v6Envelope);
    providers.zkConfigProvider.getVerifierKey = vi
      .fn()
      .mockResolvedValue(Uint8Array.from(STAND_IN_VERIFIER_KEY).fill(0x00));

    await expect(findDeployedContract(providers, attachOptions())).rejects.toBeInstanceOf(VerifierKeyMismatchError);
    // ORDER, not just outcome: `watchForDeployTxData` is an UNBOUNDED watch, so
    // a mis-dispatch checked after it would not be reported until the record
    // arrived -- which for a wrong address may be never. The docblock's promise
    // that a mis-dispatch is caught at attach time is only true in this order.
    expect(providers.publicDataProvider.watchForDeployTxData).not.toHaveBeenCalled();
  });

  it('refuses when the chain holds no key for a circuit the artifact declares', async () => {
    // A real retained-era envelope for a DIFFERENT contract: it declares its
    // own entry point and never `receive_coin`, so the slot this artifact needs
    // was never deployed.
    const providers = attachProviders(readHfHexFixture('state-v8-v6-envelope.hex'));

    await expect(findDeployedContract(providers, attachOptions())).rejects.toBeInstanceOf(BlankVerifierKeySlotError);
    expect(providers.publicDataProvider.watchForDeployTxData).not.toHaveBeenCalled();
  });

  it('refuses an artifact that declares NO circuits, rather than attaching with nothing checked', async () => {
    const providers = attachProviders(v6Envelope);

    // The failure the empty list would otherwise cause, driven at the function
    // that receives it: the entry point derives the list from the artifact's
    // circuit collection, so a future artifact shape that moved that collection
    // would hand this an empty list -- and the per-circuit loop would then be a
    // no-op, attaching to ANY state with not a single key compared. This is
    // that scenario, refused.
    await expect(
      findLedger8Contract(providers, {
        contract,
        contractAddress: recording.contractAddress,
        circuitIds: []
      })
    ).rejects.toThrow('declares no callable circuits');
    expect(providers.zkConfigProvider.getVerifierKey).not.toHaveBeenCalled();
    expect(providers.publicDataProvider.queryRawContractState).not.toHaveBeenCalled();
  });

  it('refuses a malformed contract address locally, without a single provider call', async () => {
    const providers = attachProviders(v6Envelope);

    await expect(
      findDeployedContract(providers, { ...attachOptions(), contractAddress: 'not-a-contract-address' })
    ).rejects.toThrow();
    // The same local refusal the current-era arm makes. A malformed address
    // would otherwise cost a network round trip to discover.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    expect(providers.publicDataProvider.queryRawContractState).not.toHaveBeenCalled();
  });

  it('dates the fetched envelope against the head, not against the record\'s own era label', async () => {
    const providers = attachProviders(v6Envelope);
    // The record labels itself current-era and the head agrees with the label,
    // while the bytes carry a pre-fork envelope. The label is derived from
    // `protocolVersion` alone and is not a verified statement about the bytes.
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    providers.publicDataProvider.queryRawContractState = vi.fn().mockResolvedValue({
      version: 'v9',
      protocolVersion: POST_FORK_PROTOCOL_VERSION,
      raw: v6Envelope
    });

    await expect(findDeployedContract(providers, attachOptions())).rejects.toBeInstanceOf(IndexerInconsistencyError);
    expect(providers.publicDataProvider.watchForDeployTxData).not.toHaveBeenCalled();
  });
});
