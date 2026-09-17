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
  loadLedger8,
  loadLedgerEra
} from '@midnight-ntwrk/midnight-js-protocol';
import { type Recipient } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  LedgerParameters,
  type ProvingProvider,
  sampleCoinPublicKey,
  sampleEncryptionPublicKey
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  createMidnightProvider,
  createProofProvider,
  createWalletProvider,
  FailEntirely,
  FailFallible,
  type RawContractState,
  SeamEraUnsupportedError,
  type TxStatus,
  UntaggedPayloadError,
  V8PayloadUnsupportedError,
  type VersionedFinalizedTransaction,
  type VersionedFinalizedTxData,
  type VersionedTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { Option } from 'effect';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { deployContract } from '../deploy-contract';
import { RETAINED_PIPELINE_ERA } from '../era';
import { isLedger8Result } from '../era-results';
import {
  AnyEraTxFailedError,
  BlankVerifierKeySlotError,
  EraInvariantViolationError,
  IncompleteDeployContractPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  Ledger8AmbiguousEntryPointError,
  Ledger8CallTxFailedError,
  Ledger8DeployOnV9Error,
  Ledger8DeployTxFailedError,
  Ledger8DeployUnconfirmedError,
  Ledger8RecipientUnmappableError,
  Ledger8SeamFailedError,
  Ledger8ShieldedSpendUnsupportedError,
  VerifierKeyMismatchError
} from '../errors';
import { findDeployedContract } from '../find-deployed-contract';
import { resolveArtifactEra } from '../internal/era';
import { findLedger8Contract, runLedger8Deploy, submitLedger8CallTx } from '../internal/ledger8-entry';
import {
  assertSnapshotVerifierKey,
  type Ledger8Snapshot,
  readLedger8Snapshot,
  runLedger8CallPipeline
} from '../internal/ledger8-pipeline';
import {
  createEncryptionPublicKeyResolver,
  type EncryptionPublicKeyResolver,
  SHIELDED_BURN_COIN_PUBLIC_KEY
} from '../internal/utils';
import type {
  Ledger8CallTxOptions,
  Ledger8Contract,
  Ledger8ContractProviders,
  Ledger8FindDeployedContractOptions
} from '../ledger8-contract';
import { submitCallTx, submitCallTxAsync } from '../submit-call-tx';
import type {
  CoinReceiver016Circuits,
  CoinReceiver016ConstructorResult,
  CoinReceiver016Contract,
  CoinReceiver016Module,
  CoinReceiver016PrivateState,
  CoinReceiver016Witnesses,
  Ledger8ConstructorContextLike
} from './ledger8-fixture-types';
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
  SAMPLED_SIGNING_KEY,
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

// Minted per era, because a block's parameters are era-tagged and the arm that composes reads them
// with its OWN era: a pre-fork block's parameters go to the retained composer and a post-fork
// block's to the current one. Handing either the other's bytes is refused on the header tag, which
// is the whole reason this option exists.
let retainedLedgerParameters: Uint8Array;
let currentLedgerParameters: Uint8Array;

beforeAll(async () => {
  retainedLedgerParameters = (await loadLedger8()).LedgerParameters.initialParameters().serialize();
  currentLedgerParameters = LedgerParameters.initialParameters().serialize();
});

const rawState = (raw: Uint8Array, protocolVersion: number): RawContractState => {
  const preFork = protocolVersion === PRE_FORK_PROTOCOL_VERSION;
  return {
    version: preFork ? 'v8' : 'v9',
    protocolVersion,
    raw,
    // Served from the same read as `raw`, which is what a real provider does and what the pipeline
    // now requires rather than silently substituting the initial cost model.
    ledgerParameters: preFork ? retainedLedgerParameters : currentLedgerParameters
  };
};

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
 * The per-stage markers each write seam appends to the bytes it answers with.
 *
 * Distinct, and distinct from anything the era composes, so "these bytes came
 * out of proveTx" is a checkable claim rather than an assumption.
 */
const PROVEN_MARKER = Uint8Array.from([0xf0, 0x0d, 0x01]);
const BALANCED_MARKER = Uint8Array.from([0xf0, 0x0d, 0x02]);

/**
 * The retained-arm payload with a stage marker appended to its bytes.
 *
 * @param payload The payload the seam was handed.
 * @param marker The marker for the stage that is answering.
 * @returns The same arm, carrying the input bytes plus the marker.
 */
const withStageMarker = (payload: VersionedTx<unknown>, marker: Uint8Array): VersionedTx<unknown> => {
  if (payload.version !== 'v8') {
    return payload;
  }
  const marked = new Uint8Array(payload.txBytes.length + marker.length);
  marked.set(payload.txBytes);
  marked.set(marker, payload.txBytes.length);
  return { version: 'v8', txBytes: marked };
};

/**
 * The bytes a retained-arm payload carries, for a chaining assertion.
 *
 * @param payload The payload a seam was handed.
 * @returns Its bytes, or `undefined` if it is not the retained arm.
 */
const retainedBytes = (payload: VersionedTx<unknown> | undefined): Uint8Array | undefined =>
  payload?.version === 'v8' ? payload.txBytes : undefined;

/**
 * Whether `bytes` ends with every marker in `markers`, in order.
 *
 * @param bytes The bytes a seam received.
 * @param markers The stage markers expected at the tail, earliest first.
 * @returns `true` if the tail matches.
 */
const endsWithMarkers = (bytes: Uint8Array | undefined, markers: readonly Uint8Array[]): boolean => {
  if (bytes === undefined) {
    return false;
  }
  const tail = markers.flatMap((marker) => [...marker]);
  return [...bytes.slice(bytes.length - tail.length)].join(',') === tail.join(',');
};

/**
 * The provider set both retained-era describes start from: a pre-fork head,
 * the committed envelope, and a recorder on each of the three seams.
 *
 * Module scope rather than a closure inside one `describe`, because the attach
 * suite below needs the same set and a second copy would drift from this one.
 */
/**
 * The finalized record a PRE-FORK head can actually have produced: tagged for
 * the era that recorded it, with a `protocolVersion` that agrees with the tag.
 *
 * The shared fixture is `'v9'`-tagged with a node 2.x `protocolVersion`, which
 * on a pre-fork head describes a transaction the operation cannot have
 * produced -- and the finalizing arm now refuses exactly that. Every pre-fork
 * expectation in this file has to start from a record the head could have
 * recorded, or it asserts against a record the framework rightly rejects.
 *
 * `tx` is `undefined` for the same reason the read-surface retained arm is
 * supplied by hand below: no provider builds that arm yet, and a v9 handle is
 * not assignable to it.
 */
const retainedEraRecord = (status?: TxStatus): VersionedFinalizedTxData => ({
  ...createMockFinalizedTxData(status),
  version: 'v8',
  protocolVersion: PRE_FORK_PROTOCOL_VERSION,
  tx: undefined as never
});

/**
 * The position of a mock's FIRST call in vitest's global invocation counter,
 * which is what makes a "before" claim a real claim: `toHaveBeenCalled` alone
 * cannot see an ordering defect, and the ordering is the whole of what
 * `setContractAddress` buys — and the whole of what keeps a failed deploy from
 * leaving a local private state ahead of the chain.
 *
 * Module scope, shared by the attach and deploy suites: both make the same kind
 * of claim, and a second copy would drift.
 *
 * @param mock The mock whose first invocation is being placed.
 * @returns Its position in the global invocation order.
 */
const callOrder = (mock: (...args: never[]) => unknown): number => {
  const [first] = vi.mocked(mock).mock.invocationCallOrder;
  // Left to the matcher, an uncalled mock does fail -- vitest's `assertTypes` rejects `undefined`
  // before it compares -- but it fails as a type complaint naming neither the mock nor the claim
  // being made about it. Caught here instead, so the report says which ordering went unmeasured.
  assertDefined(first, 'expected the mock to have been called at least once');
  return first;
};

const retainedProviders = (recording: CoinReceiverRecording, envelope: Uint8Array): RetainedProviders => {
  // The retained overload's own provider type, keyed by the fixture's own
  // circuit id. `createMockProviders`'s `zkConfigProvider` is keyed by `string`
  // and its `getVerifierKeys` return type is covariant in that key, so the
  // narrower provider is built explicitly rather than widened.
const zkConfigProvider: ZKConfigProvider<typeof CIRCUIT_ID> = {
    getArtifactRuntimeVersion: vi.fn().mockResolvedValue('0.16.0'),
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
  providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(retainedEraRecord());
  providers.zkConfigProvider.getVerifierKey = vi.fn().mockResolvedValue(STAND_IN_VERIFIER_KEY);
  // The recording was made against this coin public key, and the replay
  // engine refuses to replay for any other one.
  providers.walletProvider.getCoinPublicKey = (): string => recording.coinPublicKey;
  // The three seams, implemented against the version-tagged interfaces
  // directly rather than through `createWalletProvider`/`createMidnightProvider`:
  // those adapters lift a CURRENT-ERA-ONLY implementation and refuse the
  // retained arm by design, which is asserted as its own negative below.
  //
  // Each write seam answers with DISTINCT bytes -- its input with its own stage
  // marker appended. Identity mocks (`(tx) => tx`) made every mis-chaining
  // invisible: `balanceTx({ txBytes })` in place of
  // `balanceTx({ txBytes: proven })` passed the whole suite while submitting an
  // UNPROVEN transaction. Appending rather than replacing keeps the retained
  // tag at the head of the bytes, so the tag assertions still mean what they
  // say.
  providers.proofProvider.proveTx = vi.fn().mockImplementation((tx: VersionedTx<unknown>) => {
    seen.proveTx = tx;
    return Promise.resolve(withStageMarker(tx, PROVEN_MARKER));
  });
  providers.walletProvider.balanceTx = vi.fn().mockImplementation((tx: VersionedTx<unknown>) => {
    seen.balanceTx = tx;
    return Promise.resolve(withStageMarker(tx, BALANCED_MARKER));
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

    // Pre-fork the read era and the compose era are the SAME era, so one recorded facade fills
    // both roles -- which is exactly what makes the orchestration order below comparable with
    // keep-state's, where they differ.
    const recorded = recordEraCalls(retainedEra, log, (options) => {
      composed = options;
    });

    const result = await runLedger8CallPipeline<ReplayState>({
      retainedEra: recorded,
      era: recorded,
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
      'era.v8.extractState',
      'era.v8.decodeContractState',
      'engine.downConvertForExecution',
      'engine.executeCircuit',
      'era.v8.composeCallTx',
      // INSIDE the composition, not before it: the composer resolves the split
      // and only then asks for the offer to route against it. The RETAINED era
      // does both on this arm -- the log names the era so that stays checked.
      'era.v8.zswapOffer'
    ]);
    expect(result.txBytes).toBeInstanceOf(Uint8Array);
    // Exactly ONE call: the retained era has no call tree to express, and a
    // pre-fork contract cannot emit a cross-contract call in the first place.
    expect(composed?.calls).toHaveLength(1);
    // The state handed to the composition is the RAW envelope as read from
    // chain, which is what carries the registered operation and its key.
    expect(composed?.calls[0]?.contractState).toBe(v6Envelope);
    // UNPARTITIONED: the split is the composer's to draw, once, and it hands it
    // back through the offer factory. The pipeline no longer draws its own.
    expect(composed?.calls[0]?.transcript.kind).toBe('unpartitioned');
  });

  it('carries the post-call Zswap local state, and the coins the call minted to the CALLER', async () => {
    const log: OrchestrationLog = [];
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    // The committed recording's only output goes to a CONTRACT, so it yields no
    // caller coin. Re-pointing that same coin at the caller is what makes the
    // filter observable: a pipeline that published the whole output list, or a
    // hardcoded empty one, answers differently here.
    const recorded = recording.transcript.zswapLocalState;
    const outputToCaller = {
      coinInfo: recorded.outputs[0]!.coinInfo,
      recipient: { is_left: true, left: recording.coinPublicKey, right: recording.contractAddress }
    };
    const zswapLocalState = { ...recorded, outputs: [outputToCaller] };
    const mintingRecording: CoinReceiverRecording = {
      ...recording,
      transcript: { ...recording.transcript, zswapLocalState }
    };

    const result = await runLedger8CallPipeline<ReplayState>({
      era: retainedEra,
      retainedEra,
      engine: createReplayEngine(mintingRecording, log),
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

    // The execution's own post-state, forwarded rather than rebuilt.
    expect(result.nextZswapLocalState).toBe(zswapLocalState);
    // Only the caller's coin, and the same object the execution produced.
    expect(result.newCoins).toEqual([outputToCaller.coinInfo]);
  });

  it('publishes the ONE call it made, bound to the state it executed against', async () => {
    const log: OrchestrationLog = [];
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const result = await runLedger8CallPipeline<ReplayState>({
      era: retainedEra,
      retainedEra,
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

    // Exactly one, always: a pre-fork contract cannot make a cross-contract
    // call, so the root call is the whole tree.
    expect(result.calls).toHaveLength(1);
    const [rootCall] = result.calls;
    expect(rootCall?.circuitId).toBe(CIRCUIT_ID);
    expect(rootCall?.contractAddress).toBe(recording.contractAddress);
    // The state the call ENDED on. `compact-js` fills the current era's
    // `contractState` from the FINAL query context, so this member means the
    // post-call state in BOTH eras. The double mints a distinct `:post` marker,
    // so a value re-derived from the bound state cannot pass here.
    expect(rootCall?.public.contractState).toEqual({ replayedCircuitId: `${CIRCUIT_ID}:post` });
    // The state the call BOUND to, under its OWN name because it is not what
    // the current era's `contractState` means. Forwarded rather than
    // re-derived: the marker proves it is the executed-against handle and not a
    // second decode of the same bytes.
    expect(rootCall?.public.preContractState).toEqual({ replayedCircuitId: CIRCUIT_ID });
    expect(rootCall?.public.publicTranscript).toStrictEqual(recording.transcript.publicTranscript);
    expect(rootCall?.private.input).toStrictEqual(recording.transcript.input);
    expect(rootCall?.private.output).toStrictEqual(recording.transcript.output);
    // No callee to bind to: the commitment is what ties a sub-call to its
    // caller, and this era has no sub-calls.
    expect(Option.isNone(rootCall!.communicationCommitment)).toBe(true);
  });

  it('emits a transaction the RETAINED ledger tagged, and the two eras tag differently', async () => {
    const log: OrchestrationLog = [];
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const result = await runLedger8CallPipeline<ReplayState>({
      era: retainedEra,
      retainedEra,
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
    let routed: { readonly guaranteed?: Uint8Array; readonly fallible?: Uint8Array } | undefined;
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const result = await runLedger8CallPipeline<ReplayState>({
      retainedEra,
      era: recordEraCalls(retainedEra, log, undefined, (offers) => {
        routed = offers;
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
    // GUARANTEED because this recording's ops PARTITION that way, not because
    // the arm cannot route: the pipeline now resolves the split before it builds
    // the offer, so a fallible transcript places its movements in the fallible
    // offer. See 'routes a coin the partition places in the fallible half'.
    expect(result.guaranteedZswapOffer).toBeInstanceOf(Uint8Array);
    expect(result.fallibleZswapOffer).toBeUndefined();
    // The offer the composer was handed is the one the pipeline reports, so the
    // routing survives the hand-off rather than being re-decided.
    expect(routed?.guaranteed).toBe(result.guaranteedZswapOffer);
    expect(routed?.fallible).toBeUndefined();
  });

  // The regression #731/#877 named, on the arm that did not have it. Before the
  // pipeline resolved the partition ahead of building the offer, the routing
  // helper's fourth argument defaulted to `[undefined, undefined]` and EVERY
  // movement went to the guaranteed segment however the transcript partitioned.
  // A circuit whose effects are wholly fallible then produced an offer the
  // wallet could not match, which it reports as `Wallet.InsufficientFunds` —
  // measured end to end against a live pre-fork chain, not hypothesised.
  //
  // Simulated by presenting the recording's real transcript as the FALLIBLE
  // half: the commitment then matches that half and nothing else, which is
  // exactly the shape a checkpointed mint produces. Faking the partition rather
  // than the offer keeps the routing decision under test the pipeline's own.
  it('routes a coin the partition places in the fallible half into the fallible offer', async () => {
    const log: OrchestrationLog = [];
    let routed: { readonly guaranteed?: Uint8Array; readonly fallible?: Uint8Array } | undefined;
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const recorded = recordEraCalls(retainedEra, log, undefined, (offers) => {
      routed = offers;
    });
    const fallibleOnlyEra: LedgerEra = {
      ...recorded,
      composeCallTx: (options) => {
        const { zswapOffer } = options;
        if (zswapOffer === undefined) {
          throw new Error('expected the pipeline to route its offer through the composer');
        }
        return recorded.composeCallTx({
          ...options,
          // The real halves, swapped into the fallible slot before the pipeline's
          // own factory ever sees them. Asserted rather than assumed: if the
          // recording ever stops partitioning into a guaranteed transcript this
          // test would silently stop exercising the route.
          zswapOffer: ([[guaranteed, fallible]]) => {
            if (guaranteed === undefined || fallible !== undefined) {
              throw new Error('expected the recording to partition into a guaranteed transcript only');
            }
            return zswapOffer([[undefined, guaranteed]]);
          }
        });
      }
    };

    const result = await runLedger8CallPipeline<ReplayState>({
      retainedEra,
      era: fallibleOnlyEra,
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

    // Both directions. `fallible` alone would pass on a pipeline that put the
    // coin in both segments, and `guaranteed` alone on one that dropped it.
    expect(result.fallibleZswapOffer).toBeInstanceOf(Uint8Array);
    expect(result.guaranteedZswapOffer).toBeUndefined();
    // The offer the composer received is the one the pipeline reports, so the
    // routing survives the hand-off rather than being re-decided.
    expect(routed?.fallible).toBe(result.fallibleZswapOffer);
    expect(routed?.guaranteed).toBeUndefined();
  });

  // `zswapOffer` is OPTIONAL on `ComposeCallOptions`, so an era that never calls
  // it back is type-correct. The pipeline builds its offer only inside that
  // callback, so such an era would compose a transaction carrying none of the
  // circuit's coin movements -- and report `guaranteedZswapOffer: undefined`,
  // which is also the honest shape of a call that moved nothing. Nothing
  // downstream can tell the two apart, and the wallet reports the difference as
  // `Wallet.InsufficientFunds`. So the pipeline refuses instead of reporting it.
  it('refuses an era that composes without ever asking for the offer', async () => {
    const log: OrchestrationLog = [];
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    const recorded = recordEraCalls(retainedEra, log);
    const offerIgnoringEra: LedgerEra = {
      ...recorded,
      // Drops the factory on the floor, exactly as a third-party era that never
      // read the seam's contract would.
      composeCallTx: ({ zswapOffer: _ignored, ...rest }) => recorded.composeCallTx(rest)
    };

    await expect(
      runLedger8CallPipeline<ReplayState>({
        retainedEra,
        era: offerIgnoringEra,
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
      })
    ).rejects.toThrowError(/did not build the call's Zswap offer/);
  });

  it('splits the transcript once, inside the composer, and routes the offer against that split', async () => {
    const log: OrchestrationLog = [];
    let composed: ComposeCallOptions | undefined;
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    await runLedger8CallPipeline<ReplayState>({
      retainedEra,
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

    // Exactly one composition, and exactly one offer built inside it. The offer
    // has to be routed against the split and the composer needs the split too;
    // drawing it twice would leave two answers that must agree with nothing
    // checking that they do.
    expect(log.filter((entry) => entry === 'era.v8.composeCallTx')).toHaveLength(1);
    expect(log.filter((entry) => entry === 'era.v8.zswapOffer')).toHaveLength(1);
    // And this is what makes one enough: the raw op sequence goes to the
    // composer, which splits it once and hands that split to the factory. There
    // is no second split for the two to disagree about.
    expect(composed?.calls[0]?.transcript.kind).toBe('unpartitioned');
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
      retainedEra,
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

  /**
   * The entry-point NAME the pre-proving key check resolves.
   *
   * `entryPoints` is an array because two byte entry points can decode to the
   * same name. Resolving that by taking the first match would let the key check
   * pass against one slot while the chain dispatches the proof on another — a
   * proof paid for and then rejected at submission, which is the exact late
   * failure the check exists to turn into a free one.
   */
  describe('the verifier-key check against the fetched snapshot', () => {
    const snapshotFor = async (envelope: Uint8Array): Promise<Ledger8Snapshot> => {
      const providers = createMockProviders();
      providers.publicDataProvider.queryRawContractState = vi
        .fn()
        .mockResolvedValue(rawState(envelope, PRE_FORK_PROTOCOL_VERSION));
      // Both era arguments are the retained facade, which is what a PRE-fork head means: the head's
      // era and the retained era are the same ledger there.
      return readLedger8Snapshot(
        retainedEra,
        retainedEra,
        'v8',
        providers.publicDataProvider,
        recording.contractAddress
      );
    };

    it('passes against the real committed envelope, which declares the name once', async () => {
      const snapshot = await snapshotFor(v6Envelope);

      // The POSITIVE half, so the refusal below cannot be satisfied by a check
      // that refuses everything.
      expect(snapshot.decoded.entryPoints.filter((entry) => entry.circuitId === CIRCUIT_ID)).toHaveLength(1);
      expect(() => assertSnapshotVerifierKey(snapshot, CIRCUIT_ID, STAND_IN_VERIFIER_KEY, recording.contractAddress)).not.toThrow();
    });

    it('REFUSES a state declaring the same entry-point name twice, rather than checking the first', async () => {
      const snapshot = await snapshotFor(v6Envelope);
      // The real snapshot's own entry points, duplicated: derived from the
      // committed envelope rather than invented, so this cannot drift into
      // describing a state shape the decoder never produces.
      const ambiguous: Ledger8Snapshot = {
        ...snapshot,
        decoded: {
          ...snapshot.decoded,
          entryPoints: [...snapshot.decoded.entryPoints, ...snapshot.decoded.entryPoints]
        }
      };

      let caught: unknown;
      try {
        assertSnapshotVerifierKey(ambiguous, CIRCUIT_ID, STAND_IN_VERIFIER_KEY, recording.contractAddress);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(Ledger8AmbiguousEntryPointError);
      expect((caught as Ledger8AmbiguousEntryPointError).circuitId).toBe(CIRCUIT_ID);
      expect((caught as Ledger8AmbiguousEntryPointError).matchCount).toBe(2);
    });
  });

  it('refuses more than one call on the retained arm, naming the option it refused', async () => {
    const log: OrchestrationLog = [];
    let composed: ComposeCallOptions | undefined;
    const providers = createMockProviders();
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawState(v6Envelope, PRE_FORK_PROTOCOL_VERSION));

    await runLedger8CallPipeline<ReplayState>({
      retainedEra,
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
    expect(finalized.public.status).toBe('SucceedEntirely');
    // The single-snapshot invariant, and the single-head-read invariant. One
    // head read feeds the routing and the era acquisition; one state read feeds
    // the era check, the key check, the execution and the composition. A second
    // read of either could answer differently mid-operation and leave one
    // transaction built half against each answer.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(providers.publicDataProvider.queryRawContractState).toHaveBeenCalledTimes(1);
  });

  it('tags the result with the era the ARTIFACT reports, not the era the record carries', async () => {
    const providers = preForkProviders(v6Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    // The two facts, side by side. `resolveArtifactEra` reads the artifact; the
    // record says which ledger recorded the transaction. Pre-fork they happen
    // to agree on the era being retained -- post-fork the record reads `'v9'`
    // for this same call, and the tag must still say `'ledger8'`.
    expect(finalized.era).toBe(await resolveArtifactEra(contract, providers.zkConfigProvider));
    expect(finalized.era).toBe('ledger8');
  });

  it('publishes the POST-call contract state as the retained runtime own handle', async () => {
    const providers = preForkProviders(v6Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    // ADR-0010: the handle the execution ended on, forwarded rather than
    // dropped. The marker proves it is the POST state -- the pre-call state the
    // call bound to is a different object, published on `calls[0].public`.
    expect(finalized.public.nextContractState).toEqual({ replayedCircuitId: `${CIRCUIT_ID}:post` });
    expect(finalized.calls[0]?.public.contractState).toEqual({ replayedCircuitId: `${CIRCUIT_ID}:post` });
    expect(finalized.calls[0]?.public.preContractState).toEqual({ replayedCircuitId: CIRCUIT_ID });
  });

  it('publishes every state handle with its ENCODED form beside it', async () => {
    const providers = preForkProviders(v6Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    // The pair, at both places a state appears. The handle is usable in this
    // process; the encoded form is the one that survives it, and is identical
    // across the three runtimes, so era-agnostic code reads THAT.
    expect(finalized.public.nextContractStateEncoded).toStrictEqual(
      recording.transcript.postContractStateEncoded
    );
    // The call entry's own pair. `contractStateEncoded` is the post-call state,
    // matching the member beside it; the bound state's encoded form is the
    // primary state the snapshot carried -- not a second decode of it.
    expect(finalized.calls[0]?.public.contractStateEncoded).toStrictEqual(
      recording.transcript.postContractStateEncoded
    );
    expect(finalized.calls[0]?.public.preContractStateEncoded).toStrictEqual(recording.preState);
  });

  it('publishes the execution Zswap state and the caller coin list on the private half', async () => {
    const providers = preForkProviders(v6Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    // Both members are plain data in BOTH runtimes, so both survive a clone:
    // after submission the transaction is already composed, and re-running the
    // circuit to recover them would compose a second one.
    // Structural rather than by identity: this arm runs its own replay engine,
    // which decodes the recording again, so the object is equal but not the
    // same one. Identity is asserted at the pipeline test above.
    expect(finalized.private.nextZswapLocalState).toStrictEqual(recording.transcript.zswapLocalState);
    // Empty because this recording's single output goes to a contract, not to
    // the caller -- the mapping itself is asserted at the pipeline above.
    expect(finalized.private.newCoins).toEqual([]);
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

    // THE CHAIN, asserted stage by stage. The three assertions above are the
    // same claim three times over -- each seam got SOMETHING retained-tagged --
    // and every one of them passes when the stages are wired in the wrong
    // order. These are what fail then: `balanceTx` must receive what `proveTx`
    // answered, and `submitTx` must receive what `balanceTx` answered.
    expect(endsWithMarkers(retainedBytes(providers.seen.proveTx), [])).toBe(true);
    expect(endsWithMarkers(retainedBytes(providers.seen.balanceTx), [PROVEN_MARKER])).toBe(true);
    expect(endsWithMarkers(retainedBytes(providers.seen.submitTx), [PROVEN_MARKER, BALANCED_MARKER])).toBe(true);
    // And the unproven bytes are NOT what reached the node: the marker tail
    // above is only meaningful alongside this.
    expect(retainedBytes(providers.seen.submitTx)?.length).toBeGreaterThan(
      retainedBytes(providers.seen.proveTx)!.length
    );
  });

  it('returns immediately from submitCallTxAsync, without watching for the record', async () => {
    const providers = preForkProviders(v6Envelope);

    const submitted = await submitCallTxAsync(providers, callOptions());

    expect(submitted.txId).toBe('retained-era-tx-id');
    expect(submitted.circuitId).toBe(CIRCUIT_ID);
    expect(providers.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
  });

  it('hands back the execution data from submitCallTxAsync, as the current era does', async () => {
    const providers = preForkProviders(v6Envelope);

    const submitted = await submitCallTxAsync(providers, callOptions());

    // Not waiting for finalization is a reason this arm has no finalized
    // RECORD to answer with. It is not a reason to drop the execution data,
    // which is already computed by the time the transaction is submitted and
    // is unrecoverable afterwards without composing a second one.
    expect(submitted.callTxData.private.result).toStrictEqual(recording.transcript.result);
    expect(submitted.callTxData.private.txBytes).toBeInstanceOf(Uint8Array);
    expect(submitted.callTxData.private.nextZswapLocalState).toStrictEqual(recording.transcript.zswapLocalState);
    expect(submitted.callTxData.private.newCoins).toEqual([]);
    expect(submitted.callTxData.public.publicTranscript).toStrictEqual(recording.transcript.publicTranscript);
    // The same partition the offer was routed against, so a caller reading it
    // sees what the transaction was actually composed from.
    expect(submitted.callTxData.public.partitionedTranscript).toHaveLength(2);
  });

  it('composes and submits a retained-era DEPLOY, with the verifier keys the state declares', async () => {
    const providers = preForkProviders(v6Envelope);

    const deployed = await runLedger8Deploy(providers, {
      contract,
      args: [],
      privateState: {},
      resolveVerifierKeys: () => Promise.resolve(new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]]))
    });

    expect(deployed.txId).toBe('retained-era-tx-id');
    // READ OFF the composition record, never derived: a deploy mints a fresh
    // nonce, so the same initial state deploys to a different address each time.
    expect(typeof deployed.deploy.contractAddress).toBe('string');
    expect(deployed.deploy.contractAddress.length).toBeGreaterThan(0);
    expect(txTagPrefix(deployed.deploy.txBytes, RETAINED_ERA_TX_TAG)).toBe(RETAINED_ERA_TX_TAG);
    expect(providers.seen.proveTx?.version).toBe('v8');
  });

  it('hands the constructor the caller own signing key, and reports the key the authority was built from', async () => {
    const providers = preForkProviders(v6Envelope);

    const deployed = await runLedger8Deploy(providers, {
      contract,
      args: [],
      privateState: {},
      resolveVerifierKeys: () => Promise.resolve(new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]])),
      signingKey: 'caller-own-signing-key'
    });

    // The key the caller named, not a sampled one: a caller supplies its own
    // precisely so two contracts can share one maintenance authority, and a
    // pipeline that sampled anyway would register an authority the caller
    // cannot sign for.
    expect(deployed.deploy.signingKey).toBe('caller-own-signing-key');
  });

  it('reports the SAMPLED signing key when the caller named none, which exists nowhere else', async () => {
    const providers = preForkProviders(v6Envelope);

    const deployed = await runLedger8Deploy(providers, {
      contract,
      args: [],
      privateState: {},
      resolveVerifierKeys: () => Promise.resolve(new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]]))
    });

    // Dropping this member would leave the deployment as unmaintainable as the
    // empty committee the retained constructor writes: the only copy of a
    // sampled key is the one the constructor reported.
    expect(deployed.deploy.signingKey).toBe(SAMPLED_SIGNING_KEY);
  });

  it('routes a coin the CONSTRUCTOR minted into the deploy own guaranteed offer', async () => {
    const providers = preForkProviders(v6Envelope);
    // A constructor that mints a coin to the deployer. Dropping this state is
    // what composes a deploy the ledger cannot balance: the transaction carries
    // an output nothing funds.
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope, {
      constructorZswapLocalState: {
        ...recording.transcript.zswapLocalState,
        outputs: [
          {
            coinInfo: recording.transcript.zswapLocalState.outputs[0]!.coinInfo,
            recipient: { is_left: true, left: recording.coinPublicKey, right: recording.contractAddress }
          }
        ]
      }
    });

    const deployed = await runLedger8Deploy(providers, {
      contract,
      args: [],
      privateState: {},
      resolveVerifierKeys: () => Promise.resolve(new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]]))
    });

    expect(deployed.deploy.guaranteedZswapOffer).toBeInstanceOf(Uint8Array);
    // The constructor's own post-state, published rather than discarded.
    expect(deployed.deploy.initialZswapState.outputs).toHaveLength(1);
  });

  it('composes a deploy with NO offer when the constructor minted nothing', async () => {
    const providers = preForkProviders(v6Envelope);

    const deployed = await runLedger8Deploy(providers, {
      contract,
      args: [],
      privateState: {},
      resolveVerifierKeys: () => Promise.resolve(new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]]))
    });

    // Absent rather than an empty offer: an offer with no outputs is a
    // different thing to compose against than no offer at all.
    expect(deployed.deploy.guaranteedZswapOffer).toBeUndefined();
    expect(deployed.deploy.initialZswapState.outputs).toEqual([]);
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
        resolveVerifierKeys: () => Promise.resolve(new Map())
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
        resolveVerifierKeys: () => Promise.resolve(new Map([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]]))
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
    // The error IDENTITY, not merely "something threw": a bare `toThrow()`
    // passes for a rejection from anywhere, including an `expect` failure
    // inside the replay engine or a fault in the private-state read.
    await expect(
      submitCallTx(providers, { ...callOptions(), contractAddress: 'not-a-contract-address' })
    ).rejects.toThrow(/Invalid hex-digit/);
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
    // which is what a dApp has until its providers are widened. That provider
    // DECLARES the current era only, and the operation reads that declaration
    // before it composes anything -- so the refusal names `proveTx`, the first
    // of the three seams, and the proving implementation below is never
    // reached. That is asserted rather than assumed.
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

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(SeamEraUnsupportedError);
    expect((caught as SeamEraUnsupportedError).seam).toBe('proveTx');
    expect((caught as SeamEraUnsupportedError).era).toBe('v8');
    expect(provingReached).toBe(false);
    expect(providers.walletProvider.balanceTx).not.toHaveBeenCalled();
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('refuses at the balanceTx seam when only the wallet serves the current era, WITHOUT proving first', async () => {
    // Covered separately from the first seam, because reaching it proves
    // something different. The refusal is PER SEAM, so a partly widened
    // provider set is refused at whichever seam has not been widened rather
    // than slipping through the ones that have -- and, because the check reads
    // declarations up front, the refusal lands BEFORE the proof this wallet
    // could never have balanced was paid for. `proveTx` not having been called
    // is the assertion that says so.
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

    expect(caught).toBeInstanceOf(SeamEraUnsupportedError);
    expect((caught as SeamEraUnsupportedError).seam).toBe('balanceTx');
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
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

    expect(caught).toBeInstanceOf(SeamEraUnsupportedError);
    expect((caught as SeamEraUnsupportedError).seam).toBe('submitTx');
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
    expect(providers.walletProvider.balanceTx).not.toHaveBeenCalled();
  });

  it('returns the finalized record as the read surface reported it, retained arm included', async () => {
    const providers = preForkProviders(v6Envelope);
    // The READ surface's retained arm is a DIFFERENT union from the write
    // surface's: it carries `tx`, never `txBytes`. No provider produces this
    // arm yet -- the read path decodes with the current-era deserializer -- so
    // it is spelled out here rather than taken from `retainedEraRecord`, to
    // prove this flow does not narrow it away against a literal this test owns.
    // Refusing it would refuse exactly the records the retained pipelines exist
    // to produce, which is why the retained result type is version-tagged.
    const retainedRecord = { ...createMockFinalizedTxData(), version: 'v8', tx: undefined as never };
    providers.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(retainedRecord);

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.public.version).toBe('v8');
    // The record is handed back AS REPORTED, not rebuilt: asserting the shape
    // of the literal above would only restate the fixture.
    expect(finalized.public).toMatchObject(retainedRecord);
    // And the two surfaces really are different unions -- the WRITE surface's
    // retained arm, which this same flow produced, carries `txBytes` and no
    // `tx`. Asserting the read record lacks `txBytes` would be tautological on
    // a literal that never had one; asserting the contrast is not.
    expect(providers.seen.submitTx).toHaveProperty('txBytes');
    expect(providers.seen.submitTx).not.toHaveProperty('tx');
    expect(finalized.public).toMatchObject(retainedRecord);
  });

  it('REFUSES a finalized record from an era the head it composed on cannot have recorded', async () => {
    const providers = preForkProviders(v6Envelope);
    // `version` on the record SELECTS the runtime of the live `tx` handle beside
    // it, so a mislabelled record is not a cosmetic disagreement: a caller that
    // narrows on it reaches into the other ledger module and gets a plausible
    // wrong value rather than a throw. This flow resolved a PRE-FORK head and
    // submitted retained-era bytes, so a `'v9'` record describes a transaction
    // this operation cannot have produced.
    //
    // The current era already refuses the mirror of this at the same seam, via
    // `requireV9Record`. This is the retained arm's half, and it compares the
    // record against the HEAD rather than against a fixed era, because a
    // retained-era call is legitimately recorded by EITHER era.
    providers.publicDataProvider.watchForTxData = vi
      .fn()
      .mockResolvedValue({ ...createMockFinalizedTxData(), version: 'v9' });

    const rejection = await submitCallTx(providers, callOptions()).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(EraInvariantViolationError);
    expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
    expect((rejection as EraInvariantViolationError).seam).toBe('watchForTxData');
    // The era this operation could accept is the HEAD's own, NOT the class's
    // `'v9'` default -- which is the whole difference from `requireV9Record`.
    expect((rejection as EraInvariantViolationError).expected).toBe('v8');
    expect((rejection as EraInvariantViolationError).circuitId).toBe(CIRCUIT_ID);
  });

  it('is recognised as a retained-era result by the published guard, and narrows to it', async () => {
    const providers = preForkProviders(v6Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    // `era` already discriminates a union on its own. The guard is the NAMED
    // way to do it: it keeps the literal in one place, and it narrows any of
    // the result shapes rather than one, so a caller does not write
    // `=== 'ledger8'` against a string of its own spelling.
    expect(isLedger8Result(finalized)).toBe(true);
    // Narrowing, not just a boolean: `txBytes` is reachable only on this arm.
    if (isLedger8Result(finalized)) {
      expect(finalized.private.txBytes).toBeInstanceOf(Uint8Array);
    }
  });

  it('reports the era fault AHEAD of the status, when a record is both mislabelled and failing', async () => {
    const providers = preForkProviders(v6Envelope);
    // The guard's ordering, asserted rather than only described. `status` is a
    // field of the very record whose provenance is in doubt, so a record this
    // operation cannot have produced is refused before anything is read off
    // it -- including a failing status, which on an attributable record
    // produces the typed `Ledger8CallTxFailedError` asserted further down.
    providers.publicDataProvider.watchForTxData = vi
      .fn()
      .mockResolvedValue({ ...createMockFinalizedTxData(FailEntirely), version: 'v9' });

    const rejection = await submitCallTx(providers, callOptions()).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(EraInvariantViolationError);
    // The point of the test: the status fault is NOT what surfaced.
    expect(rejection).not.toBeInstanceOf(Ledger8CallTxFailedError);
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
    // The engine is told what the pipeline MUST have handed it. Asserting only
    // that `get` was called leaves `privateState: undefined` in the pipeline
    // fully green -- the recording replays regardless -- which is the whole
    // failure mode this test is named for.
    engineSlot.engine = createReplayEngine(loadCoinReceiverRecording(), [], v6Envelope, {
      privateState: { storedBefore: true }
    });

    const finalized = await submitCallTx(providers, { ...callOptions(), privateStateId: 'retained-private-state' });

    expect(providers.privateStateProvider.get).toHaveBeenCalledWith('retained-private-state');
    // The recorded `privateStateAfter` is a real value -- this contract
    // declares no private state, so it is an empty object -- and it is what
    // gets written back. Asserting it is not `undefined` is the point: a
    // recording missing that member would have every call store nothing over a
    // caller's real private state, with a green suite.
    expect(finalized.private.nextPrivateState).toEqual({});
    expect(finalized.private.nextPrivateState).not.toBeUndefined();
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
      let caught: unknown;
      try {
        await submitCallTx(providers, callOptions());
      } catch (error) {
        caught = error;
      }

      // A TYPED refusal naming the era, the circuit and the recipient. The bare
      // `Error` the offer builder raises names none of them, and its advice --
      // supply a resolver mapping -- points at a field the retained call
      // options do not have, so a caller could not act on it.
      expect(caught).toBeInstanceOf(Ledger8RecipientUnmappableError);
      expect((caught as Ledger8RecipientUnmappableError).circuitId).toBe(CIRCUIT_ID);
      expect((caught as Ledger8RecipientUnmappableError).recipientCoinPublicKey).toBe(thirdPartyCoinPublicKey);
      // The message must not send the caller after a knob this arm lacks.
      expect((caught as Error).message).not.toMatch(/Provide a mapping via the encryptionPublicKeyResolver/);

      // Refused BEFORE the offer is built, so nothing was proven, balanced or submitted.
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

  /**
   * THE WALLET'S COIN PUBLIC KEY, which a real wallet hands over Bech32m-encoded.
   *
   * The testkit wallet answers in hex, so no end-to-end run in this repo can
   * catch a missing normalization: the retained runtime's `encodeCoinPublicKey`
   * accepts hex only and throws `Invalid character 'm' at position 0` from
   * inside the WASM on anything else, which is a total failure of the retained
   * arm for every Bech32m wallet and a green suite everywhere else.
   */
  describe("the wallet's coin public key", () => {
    // The committed vector from `packages/utils/src/test/hex-utils.test.ts`, so
    // the two files agree on what this encoding decodes to.
    const BECH32M_COIN_PUBLIC_KEY = 'mn_shield-cpk_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sn7kq7h';
    const BECH32M_DECODED_HEX = 'dca6896e7fe2f00a3d63be2168df8862cae24a770471e08c646d260db162675f';

    it('is normalized to hex before it reaches the retained runtime', async () => {
      const providers = preForkProviders(v6Envelope);
      providers.walletProvider.getCoinPublicKey = (): string => BECH32M_COIN_PUBLIC_KEY;
      // The recording is re-pointed at the DECODED form, so the replay engine's
      // own `coinPk` check is the oracle: an un-normalized key arrives as
      // `mn_shield-cpk_...` and the replay refuses to answer for it.
      const replay = createReplayEngine(
        { ...loadCoinReceiverRecording(), coinPublicKey: BECH32M_DECODED_HEX },
        [],
        v6Envelope
      );
      let seenCoinPk: string | undefined;
      engineSlot.engine = {
        ...replay,
        executeCircuit: (options: Parameters<typeof replay.executeCircuit>[0]) => {
          seenCoinPk = options.coinPk;
          return replay.executeCircuit(options);
        }
      };

      await submitCallTx(providers, callOptions());

      expect(seenCoinPk).toBe(BECH32M_DECODED_HEX);
      expect(seenCoinPk).toMatch(/^[0-9a-f]{64}$/);
    });

    it('passes an already-hex key through unchanged, so normalizing costs a hex wallet nothing', async () => {
      const providers = preForkProviders(v6Envelope);

      const finalized = await submitCallTx(providers, callOptions());

      // `retainedProviders` reports the recording's own hex key, and the replay
      // engine answers only for that exact value.
      expect(finalized.circuitId).toBe(CIRCUIT_ID);
    });
  });

  /**
   * A call the CHAIN recorded as failed. The two failing statuses differ in
   * what landed, so they differ in what the caller must do next.
   */
  describe('a call recorded on chain with a failing status', () => {
    const withStatus = (providers: RetainedProviders, status: typeof FailEntirely | typeof FailFallible): void => {
      providers.publicDataProvider.watchForTxData = vi
        .fn()
        .mockResolvedValue({ ...retainedEraRecord(status), txId: 'retained-era-tx-id' });
    };

    const callAndCatch = async (providers: RetainedProviders): Promise<unknown> => {
      providers.privateStateProvider.get = vi.fn().mockResolvedValue({ storedBefore: true });
      engineSlot.engine = createReplayEngine(loadCoinReceiverRecording(), [], v6Envelope, {
        privateState: { storedBefore: true }
      });
      try {
        await submitCallTx(providers, { ...callOptions(), privateStateId: 'retained-private-state' });
        return undefined;
      } catch (error) {
        return error;
      }
    };

    it('refuses FailEntirely with a TYPED error carrying the record, and stores nothing', async () => {
      const providers = preForkProviders(v6Envelope);
      withStatus(providers, FailEntirely);

      const caught = await callAndCatch(providers);

      // TYPED, and carrying the record: the current era throws
      // `CallTxFailedError` with the record on it, and a caller narrowing on a
      // failed call must be able to read the status off this arm too rather
      // than parse it out of a message.
      expect(caught).toBeInstanceOf(Ledger8CallTxFailedError);
      // And a caller that catches the era-agnostic base gets this one too --
      // asserted on the object the pipeline really threw rather than on a
      // constructed instance, because the claim is about the throw path.
      expect(caught).toBeInstanceOf(AnyEraTxFailedError);
      expect((caught as Ledger8CallTxFailedError).record.status).toBe(FailEntirely);
      expect((caught as Ledger8CallTxFailedError).txData.status).toBe(FailEntirely);
      expect((caught as Ledger8CallTxFailedError).circuitId).toBe(CIRCUIT_ID);
      // Nothing landed on chain either, so saying the local state still matches
      // it is TRUE for this status.
      expect((caught as Error).message).toContain('still matches');
      expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
    });

    it('refuses FailFallible WITHOUT claiming the local state still matches the chain', async () => {
      const providers = preForkProviders(v6Envelope);
      withStatus(providers, FailFallible);

      const caught = await callAndCatch(providers);

      expect(caught).toBeInstanceOf(Ledger8CallTxFailedError);
      expect((caught as Ledger8CallTxFailedError).txData.status).toBe(FailFallible);
      // THE DISTINCTION. `FailFallible` keeps every GUARANTEED effect, and this
      // pipeline places every movement it makes in the guaranteed segment, so
      // the contract state advanced on chain while no private state was stored.
      // Telling the caller their local state still matches the chain would send
      // them past a reconciliation they now need.
      expect((caught as Error).message).not.toContain('still matches');
      expect((caught as Error).message).toMatch(/guaranteed phase LANDED/i);
      expect((caught as Error).message).toMatch(/reconcile/i);
      expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
    });
  });

  it('SANITIZES a FOREIGN CODED rejection, which is the shape real HTTP clients reject with', async () => {
    const providers = preForkProviders(v6Envelope);
    // An axios/undici-shaped rejection: a registry-FOREIGN `code`, the payload
    // echoed on an own property, and the payload in the message too. The
    // pass-through gate keys on registry membership, so this must be sanitized
    // -- and no test drove the foreign-coded case, even though it is what a
    // proof server or node client actually throws.
    const payloadHex = 'ab'.repeat(40);
    const rejection = Object.assign(new Error(`Request failed with body ${payloadHex}`), {
      code: 'ECONNREFUSED',
      response: { data: { tx: payloadHex } }
    });
    providers.proofProvider.proveTx = vi.fn().mockRejectedValue(rejection);

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8SeamFailedError);
    const rendered = inspect(caught, { depth: null, showHidden: true });
    expect(rendered).not.toContain(payloadHex);
    // Non-vacuity: the payload IS in the raw rejection, so its absence above is
    // the sanitizer's doing and not an artefact of the fixture.
    expect(inspect(rejection, { depth: null, showHidden: true })).toContain(payloadHex);
    // The class name survives, so the failure is still identifiable.
    expect((caught as Error).message).toContain('proveTx');
  });

  it('keeps the DIAGNOSIS from a wrapped rejection, rather than truncating the cause chain', async () => {
    const providers = preForkProviders(v6Envelope);
    // What global `fetch` rejects with when nothing is listening: the message
    // says only "fetch failed", and the reason lives one link down. Truncating
    // at depth one renders wrong-port, DNS, TLS and refused identically.
    const rejection = new Error('fetch failed', {
      cause: new Error('connect ECONNREFUSED 127.0.0.1:6300')
    });
    providers.proofProvider.proveTx = vi.fn().mockRejectedValue(rejection);

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8SeamFailedError);
    const rendered = inspect(caught, { depth: null });
    expect(rendered).toContain('fetch failed');
    expect(rendered).toContain('ECONNREFUSED');
    expect(rendered).toContain('6300');
  });

  it("keeps an AggregateError's members, which is where fetch reports per-address failures", async () => {
    const providers = preForkProviders(v6Envelope);
    // `AggregateError.errors` is an OWN property, so it travels with neither
    // the message nor the cause chain. For a proof server resolving to several
    // addresses this is the only place the per-address reason exists.
    const rejection = new Error('fetch failed', {
      cause: new AggregateError(
        [new Error('connect ECONNREFUSED ::1:6300'), new Error('connect ECONNREFUSED 127.0.0.1:6300')],
        'all addresses refused'
      )
    });
    providers.proofProvider.proveTx = vi.fn().mockRejectedValue(rejection);

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8SeamFailedError);
    const rendered = inspect(caught, { depth: null, showHidden: true });
    expect(rendered).toContain('::1:6300');
    expect(rendered).toContain('127.0.0.1:6300');
  });

  /**
   * WHICH SHAPES the redaction catches, and which diagnostics it must leave
   * alone. Both directions are asserted, because the regex can fail either way
   * and the two failures cost different things: a missed payload is a leak into
   * the caller's log sink, and an over-eager match eats the endpoint or the
   * exception class name a developer needs to act on.
   */
  describe('payload redaction, by shape', () => {
    const REDACTED_CASES: readonly (readonly [string, string])[] = [
      // A 32-byte value: the shape a transaction hash or a key takes.
      ['hex, 64 characters', 'ca'.repeat(32)],
      // A 12-byte secret. Under a 32-character floor this leaks.
      ['hex, 24 characters', 'aabbccddeeff001122334455'],
      // base64url is what JSON and HTTP APIs actually use; `-` and `_` are
      // outside a `+/`-only character class.
      ['base64url', 'AbCdEf-_gH12345678901234567890abcdEFGHijKL99'],
      ['standard base64', 'TWlkbmlnaHQvdHJhbnNhY3Rpb24rcGF5bG9hZDEyMzQ1Njc4OTA='],
      // What `JSON.stringify(new Uint8Array(...))` produces. Commas break a
      // contiguous-run match, so this needs an alternative of its own.
      ['decimal byte list', JSON.stringify([...new Uint8Array(20).keys()].map((i) => i + 7))]
    ];

    const KEPT_CASES: readonly (readonly [string, string])[] = [
      // The highest-value diagnostic in a misconfiguration, and the one a
      // `/`-inclusive base64 class eats.
      ['a URL path', 'https://indexer.example.com/api/v1/graphql/subscriptions/endpoint'],
      // 43 characters of mixed case, no digit.
      ['a long exception class name', 'ContractStateDeserializationFailedException'],
      ['an address and port', 'connect ECONNREFUSED 127.0.0.1:6300'],
      ['hex-alphabet English words', 'the decade was defaced by a facade']
    ];

    const sanitizedMessage = async (raw: string): Promise<string> => {
      const providers = preForkProviders(v6Envelope);
      providers.proofProvider.proveTx = vi.fn().mockRejectedValue(new Error(raw));
      try {
        await submitCallTx(providers, callOptions());
      } catch (error) {
        return inspect(error, { depth: null, showHidden: true });
      }
      throw new Error('the seam did not reject');
    };

    it.each(REDACTED_CASES)('redacts %s', async (_label, payload) => {
      const rendered = await sanitizedMessage(`provider said: ${payload}`);

      expect(rendered).not.toContain(payload);
      expect(rendered).toContain('[redacted]');
    });

    it.each(KEPT_CASES)('keeps %s, which a developer needs in order to act', async (_label, diagnostic) => {
      const rendered = await sanitizedMessage(`provider said: ${diagnostic}`);

      expect(rendered).toContain(diagnostic);
    });
  });

  it('cannot be made to throw FROM ITS OWN CATCH BLOCK by an unrenderable rejection', async () => {
    const providers = preForkProviders(v6Envelope);
    // `String(Object.create(null))` throws. Unguarded, that TypeError would
    // replace the provider's rejection entirely -- no seam, no circuit, and the
    // original value gone -- so the seam machinery would report its own bug as
    // the application's.
    providers.proofProvider.proveTx = vi.fn().mockRejectedValue(Object.create(null));

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8SeamFailedError);
    expect((caught as Ledger8SeamFailedError).seam).toBe('proveTx');
    expect((caught as Ledger8SeamFailedError).circuitId).toBe(CIRCUIT_ID);
  });

});

/**
 * Deploying a retained-era contract through the public `deployContract` — a
 * WRITE path, so it composes, submits and waits for the record.
 *
 * Every assertion below is newly reachable: the arm refused unconditionally
 * until a maintenance authority was set on the constructed state, so nothing
 * downstream of the constructor had ever run through this entry point. On top
 * of the claims the call arm makes, it owns two of its own: that the address
 * the deploy minted is the one the private state is written under, and that the
 * chain's deploy record is checked BEFORE anything local is stored.
 */
describe('deploying a retained-era contract through deployContract', () => {
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

  /**
   * The state a doubled constructor that ADVANCED its input answers with.
   *
   * Distinct from every `initialPrivateState` supplied below, because a
   * faithful double threads its input back unchanged: without a value the
   * caller never passed, "stored the constructor's output" and "stored the
   * caller's input" are the same assertion.
   */
  const ADVANCED_PRIVATE_STATE = { advancedByConstructor: true };

  /**
   * The coin receiver's artifact, described as though its CONSTRUCTOR took an
   * argument of its own.
   *
   * The fixture's real `initialState` takes only the context, and so does every
   * other retained artifact in the tree — which left `deployContract`'s `args`
   * hop measurable nowhere. The replay engine never invokes `initialState`, so
   * the runtime object stays the real artifact and only the TYPE has to admit
   * the argument.
   */
  interface SeededCoinReceiver016Contract extends Ledger8Contract<CoinReceiver016PrivateState> {
    readonly witnesses: CoinReceiver016Witnesses;
    readonly circuits: CoinReceiver016Circuits;
    readonly impureCircuits: CoinReceiver016Circuits;
    readonly provableCircuits: CoinReceiver016Circuits;
    initialState(context: Ledger8ConstructorContextLike, seed: bigint): CoinReceiver016ConstructorResult;
  }

  interface SeededCoinReceiver016Module {
    readonly Contract: new (witnesses: CoinReceiver016Witnesses) => SeededCoinReceiver016Contract;
  }

  /**
   * The provider set every deploy below starts from: a pre-fork head, a deploy
   * record the pre-fork head could have produced, and a key for every entry
   * point the constructed state declares.
   */
  const deployProviders = (): RetainedProviders => {
    const providers = retainedProviders(recording, v6Envelope);
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockResolvedValue(retainedEraRecord());
    providers.zkConfigProvider.getVerifierKeys = vi.fn().mockResolvedValue([[CIRCUIT_ID, STAND_IN_VERIFIER_KEY]]);
    return providers;
  };

  it('composes, submits and hands back a handle carrying everything the constructor produced', async () => {
    const providers = deployProviders();

    const deployed = await deployContract(providers, { compiledContract: contract });

    expect(deployed.era).toBe(RETAINED_PIPELINE_ERA);
    expect(deployed.compiledContract).toBe(contract);
    // READ OFF the composition record: a deploy mints a fresh nonce, so the
    // same initial state deploys to a different address every time.
    expect(typeof deployed.contractAddress).toBe('string');
    expect(deployed.contractAddress.length).toBeGreaterThan(0);
    // The key the authority was built from, which only the deployer ever holds.
    expect(deployed.signingKey).toBe(SAMPLED_SIGNING_KEY);
    expect(deployed.initialState).toBeInstanceOf(Uint8Array);
    // The LIVE handle beside the bytes, as the retained constructor built it.
    expect(deployed.initialContractState.serialize()).toEqual(v6Envelope);
    // This deploy named no private state, so the constructor was handed
    // `undefined` and threaded it back. Presence is asserted separately: a
    // handle that dropped the member entirely would otherwise read the same.
    expect('initialPrivateState' in deployed).toBe(true);
    expect(deployed.initialPrivateState).toBeUndefined();
    expect(deployed.initialZswapState.outputs).toEqual([]);
    expect(deployed.deployTxData.version).toBe('v8');
    expect(deployed.deployTxData.txId).toBe(retainedEraRecord().txId);
    expect(Object.keys(deployed.callTx)).toEqual([CIRCUIT_ID]);
    // The retained tag on the bytes that crossed the write seams, which is what
    // says the RETAINED ledger composed this deployment.
    expect(providers.seen.proveTx?.version).toBe('v8');
  });

  it('reports the caller own signing key when one is supplied, rather than sampling over it', async () => {
    const providers = deployProviders();

    const deployed = await deployContract(providers, {
      compiledContract: contract,
      signingKey: 'caller-own-signing-key'
    });

    expect(deployed.signingKey).toBe('caller-own-signing-key');
  });

  it('asks for a verifier key for EVERY entry point the artifact declares', async () => {
    const providers = deployProviders();

    await deployContract(providers, { compiledContract: contract });

    // Off the ARTIFACT, the same source the attach path reads. A retained
    // constructor builds every entry-point slot BLANK and the retained deploy
    // registers no keys of its own, so a map naming anything but exactly these
    // puts a contract on chain that nothing can call.
    expect(providers.zkConfigProvider.getVerifierKeys).toHaveBeenCalledWith(Object.keys(contract.impureCircuits));
  });

  it('refuses at the composer when the key map does not name what the state declares', async () => {
    const providers = deployProviders();
    providers.zkConfigProvider.getVerifierKeys = vi.fn().mockResolvedValue([]);

    let caught: unknown;
    try {
      await deployContract(providers, { compiledContract: contract });
    } catch (error) {
      caught = error;
    }

    // POSITIVE evidence that the fetched map is the one the composer checks:
    // an arm that built its own map, or dropped the caller's, would compose.
    expect(caught).toBeInstanceOf(ComposeFailedError);
    expect((caught as ComposeFailedError).stage).toBe('deploy-verifier-key');
  });

  it('watches for the deploy record under the address it just minted, not for a transaction id', async () => {
    const providers = deployProviders();

    const deployed = await deployContract(providers, { compiledContract: contract });

    expect(providers.publicDataProvider.watchForDeployTxData).toHaveBeenCalledWith(deployed.contractAddress);
    expect(providers.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
  });

  it('REFUSES a deploy record from an era the head it composed on cannot have recorded', async () => {
    const providers = deployProviders();
    // The shared fixture is `'v9'`-tagged, which on a pre-fork head describes a
    // transaction this operation cannot have produced.
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockResolvedValue(createMockFinalizedTxData());

    const caught: unknown = await deployContract(providers, {
      compiledContract: contract,
      privateStateId: 'retained-private-state',
      initialPrivateState: {}
    }).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(Ledger8DeployUnconfirmedError);
    expect((caught as Ledger8DeployUnconfirmedError).cause).toBeInstanceOf(EraInvariantViolationError);
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
    // The namespace switch too, not only the write: moved ahead of the assertions, a refused
    // deploy would leave the provider pointed at an address holding nothing, and the next
    // unnamespaced read on that process would answer out of it.
    expect(providers.privateStateProvider.setContractAddress).not.toHaveBeenCalled();
  });

  it('reports the era fault AHEAD of the status, when a record is both mislabelled and failing', async () => {
    const providers = deployProviders();
    providers.publicDataProvider.watchForDeployTxData = vi
      .fn()
      .mockResolvedValue(createMockFinalizedTxData(FailEntirely));

    // `status` is a field of the very record whose provenance is in doubt, so
    // the era is settled first and the refusal names the cause a caller can act
    // on. Read off `cause`: the refusal carries the era violation there, and a
    // status refusal would carry none.
    const caught: unknown = await deployContract(providers, { compiledContract: contract }).catch(
      (error: unknown) => error
    );

    expect(caught).toBeInstanceOf(Ledger8DeployUnconfirmedError);
    expect((caught as Ledger8DeployUnconfirmedError).cause).toBeInstanceOf(EraInvariantViolationError);
  });

  it('refuses a deploy the node recorded with a non-success status, and stores nothing', async () => {
    const providers = deployProviders();
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockResolvedValue(retainedEraRecord(FailEntirely));

    let caught: unknown;
    try {
      await deployContract(providers, {
        compiledContract: contract,
        privateStateId: 'retained-private-state',
        initialPrivateState: {}
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8DeployTxFailedError);
    expect(caught).toBeInstanceOf(AnyEraTxFailedError);
    expect((caught as Ledger8DeployTxFailedError).txData.status).toBe(FailEntirely);
    // The whole point of checking the record before storing: a deploy the chain
    // refused must leave no local private state ahead of it.
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
    expect(providers.privateStateProvider.setContractAddress).not.toHaveBeenCalled();
  });

  it('names the minted address before it writes, so the state lands in this contract namespace', async () => {
    const providers = deployProviders();

    const deployed = await deployContract(providers, {
      compiledContract: contract,
      privateStateId: 'retained-private-state',
      initialPrivateState: {}
    });

    // A provider namespaces every entry by the address last named, and a real
    // one REFUSES a write before any has been named. Written first, the state
    // lands under whichever address the process happened to touch last -- and a
    // later call, which names this address itself, reads its own key, finds
    // nothing, and reports nothing.
    expect(providers.privateStateProvider.setContractAddress).toHaveBeenCalledWith(deployed.contractAddress);
    expect(callOrder(providers.privateStateProvider.setContractAddress)).toBeLessThan(
      callOrder(providers.privateStateProvider.set)
    );
  });

  it('stores the private state the CONSTRUCTOR produced, and only after the record has been checked', async () => {
    const providers = deployProviders();
    // A constructor that ADVANCED what it was handed. The double otherwise
    // threads the input back, and then an arm that stored `options.initialPrivateState`
    // instead of the constructor's result passes this test unchanged.
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope, {
      advancedConstructorPrivateState: ADVANCED_PRIVATE_STATE
    });

    const deployed = await deployContract(providers, {
      compiledContract: contract,
      privateStateId: 'retained-private-state',
      initialPrivateState: {}
    });

    // The constructor's OWN output, as the current era stores it too -- not the
    // caller's input, which the constructor may have advanced.
    expect(providers.privateStateProvider.set).toHaveBeenCalledWith(
      'retained-private-state',
      ADVANCED_PRIVATE_STATE
    );
    expect(callOrder(providers.publicDataProvider.watchForDeployTxData)).toBeLessThan(
      callOrder(providers.privateStateProvider.set)
    );
    // The caller's input here is `{}`, distinct from ADVANCED_PRIVATE_STATE, so
    // this pins the returned handle to the constructor's output specifically --
    // a check the `toBeUndefined()` tests below can't make, since both sides
    // are `undefined` there and so indistinguishable.
    expect(deployed.initialPrivateState).toBe(ADVANCED_PRIVATE_STATE);
  });

  it('leaves the private state untouched when the caller named no id', async () => {
    const providers = deployProviders();

    await deployContract(providers, { compiledContract: contract });

    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  it('refuses an initial private state with no id to store it under', async () => {
    const providers = deployProviders();

    // There is nowhere to put the state, so it would be silently dropped -- and
    // a caller that supplied one believes it was stored. The TYPE refuses this shape too, which
    // is what the directive below records; the run-time guard is what a JavaScript caller, or one
    // that built its options dynamically, still reaches.
    await expect(
      // @ts-expect-error - a private state with no id naming where it goes
      deployContract(providers, { compiledContract: contract, initialPrivateState: {} })
    ).rejects.toBeInstanceOf(IncompleteDeployContractPrivateStateConfig);
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
    // Refused before anything is composed or submitted.
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('hands the constructor the initial private state the caller supplied', async () => {
    const providers = deployProviders();
    // The engine is told what the arm MUST have handed it. Asserting only that
    // the deploy succeeded leaves `privateState: undefined` fully green, because
    // the constructor replays regardless -- and that is the failure this names:
    // a contract seeded from a state it never saw.
    //
    // `{}` rather than a populated state because this fixture DECLARES no
    // private state; the pair that matters here is supplied-versus-absent, and
    // the absent half is the test below.
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope, {
      constructorPrivateState: {},
      advancedConstructorPrivateState: ADVANCED_PRIVATE_STATE
    });

    const deployed = await deployContract(providers, {
      compiledContract: contract,
      privateStateId: 'retained-private-state',
      initialPrivateState: {}
    });

    // The deploy ran to completion on the state the engine accepted: the write
    // carries the constructor's ADVANCED output, which no value the caller
    // passed could have produced.
    expect(providers.privateStateProvider.set).toHaveBeenCalledWith(
      'retained-private-state',
      ADVANCED_PRIVATE_STATE
    );
    // The caller's input here is `{}`, distinct from ADVANCED_PRIVATE_STATE, so
    // this pins the returned handle to the constructor's output specifically --
    // a check the `toBeUndefined()` tests below can't make, since both sides
    // are `undefined` there and so indistinguishable.
    expect(deployed.initialPrivateState).toBe(ADVANCED_PRIVATE_STATE);
  });

  it('hands the constructor UNDEFINED when the caller supplied no initial private state', async () => {
    const providers = deployProviders();
    // THE MEASUREMENT this arm owes: a caller on the no-private-state arm has
    // nothing to pass, so the retained constructor is handed `undefined` rather
    // than an empty object. Asserted on what the engine RECEIVED, because the
    // deploy composes either way and the difference is invisible downstream.
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope, { constructorPrivateState: undefined });

    const deployed = await deployContract(providers, { compiledContract: contract });

    // The engine expectation above is the measurement; this is the visible half
    // of it. The 0.16 runtime threads its input straight back, so an
    // `undefined` in is an `undefined` out -- and the member being absent from
    // the handle altogether is ruled out separately.
    expect('initialPrivateState' in deployed).toBe(true);
    expect(deployed.initialPrivateState).toBeUndefined();
  });

  it('refuses a retained-era deploy against a POST-FORK head, before the constructor runs', async () => {
    const providers = deployProviders();
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    const log: OrchestrationLog = [];
    engineSlot.engine = createReplayEngine(recording, log, v6Envelope);

    // Reachable through this entry point at last: the unconditional refusal
    // that stood in front of it is gone, so the era pairing table decides.
    await expect(deployContract(providers, { compiledContract: contract })).rejects.toBeInstanceOf(
      Ledger8DeployOnV9Error
    );
    expect(log).toEqual([]);
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('hands back a callTx interface bound to the address the deploy minted', async () => {
    const providers = deployProviders();

    const deployed = await deployContract(providers, { compiledContract: contract });
    // The state read the call makes is what says WHICH address the handle
    // carries. Asserting only that `callTx` has the right keys would keep
    // passing for a handle built against the wrong contract entirely.
    providers.publicDataProvider.queryRawContractState = vi.fn().mockResolvedValue(null);
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope);

    await expect(deployed.callTx[CIRCUIT_ID](recording.receivedCoin)).rejects.toThrow(deployed.contractAddress);
    expect(providers.publicDataProvider.queryRawContractState).toHaveBeenCalledWith(deployed.contractAddress);
  });

  it('runs a call made through the deploy handle against the STORED private state', async () => {
    const providers = deployProviders();
    // What the provider answers the CALL with, distinct from everything the deploy wrote, so the
    // read is observable at all -- the default mock answers `undefined`.
    providers.privateStateProvider.get = vi.fn().mockResolvedValue({ storedBefore: true });
    // The engine is told what the CALL must have been handed. Asserting only that the call ran
    // leaves `privateState: undefined` fully green, because the recording replays regardless --
    // and that is the failure this names: a handle that dropped the id proves against a default
    // state and writes nothing back, with nothing erroring at any stage.
    const freshRecording = loadCoinReceiverRecording();
    engineSlot.engine = createReplayEngine(freshRecording, [], v6Envelope, {
      privateState: { storedBefore: true },
      advancedConstructorPrivateState: ADVANCED_PRIVATE_STATE
    });

    const deployed = await deployContract(providers, {
      compiledContract: contract,
      privateStateId: 'retained-private-state',
      initialPrivateState: {}
    });

    // The call cannot COMPLETE here, and the reason is the deploy's own: the committed transcript
    // was recorded against the recording's address, a deploy mints a fresh one, and the ledger
    // refuses to split a transcript against a query context bound to a different address. Every
    // step this test measures -- the read, and what the engine executed on -- runs before that.
    await expect(deployed.callTx[CIRCUIT_ID](freshRecording.receivedCoin)).rejects.toBeInstanceOf(
      ComposeFailedError
    );
    expect(providers.privateStateProvider.get).toHaveBeenCalledWith('retained-private-state');
    // And the deploy's own write is still the constructor's output, under the same id.
    expect(providers.privateStateProvider.set).toHaveBeenCalledWith(
      'retained-private-state',
      ADVANCED_PRIVATE_STATE
    );
  });

  it('forwards the constructor arguments the caller supplied, rather than a default empty list', async () => {
    const providers = deployProviders();
    // The fixture's own `initialState` takes no argument of its own, and nothing else in the tree
    // declares a retained artifact whose constructor does -- so the entry point's `args` hop was
    // measured nowhere. The replay double never invokes `initialState`, so the runtime object is
    // the real artifact and only the TYPE has to admit the argument.
    const seededModule: SeededCoinReceiver016Module = await import(
      /* @vite-ignore */ hfFixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
    );
    const seededContract = new seededModule.Contract({});
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope, { constructorArgs: [7n] });

    const deployed = await deployContract(providers, { compiledContract: seededContract, args: [7n] });

    // The engine expectation above is the measurement; this is what says the deploy reached it.
    expect(deployed.contractAddress.length).toBeGreaterThan(0);
  });

  it('reads the wallet coin public key ONCE, so one key feeds both the constructor and the encryption resolver', async () => {
    const providers = deployProviders();
    const getCoinPublicKey = vi.fn().mockReturnValue(recording.coinPublicKey);
    providers.walletProvider.getCoinPublicKey = getCoinPublicKey;

    await deployContract(providers, { compiledContract: contract });

    // The call arm forbids exactly this: a resolver built against a different key than the one the
    // circuit executed under is the mismatch that mis-encrypts a minted coin. Two reads of a
    // provider method are two chances to answer differently.
    expect(getCoinPublicKey).toHaveBeenCalledTimes(1);
  });

  it('reads the network head ONCE for the whole deploy', async () => {
    const providers = deployProviders();

    await deployContract(providers, { compiledContract: contract });

    // The head the deploy composed on is passed down to the finalizing step rather than re-read:
    // a second read could answer differently and attribute the record against a head the
    // transaction was never built for.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
  });

  it('refuses a privateStateId written as undefined, rather than deploying against no state at all', async () => {
    const providers = deployProviders();

    // A caller that wrote `privateStateId: cfg.someId` with an undefined `someId` BELIEVES it named
    // one. Read as "no id given", the deploy stores nothing and hands `callTx` an undefined id, so
    // every later call proves against a state the contract never had and writes nothing back --
    // with nothing erroring. The attach arm refuses exactly this shape.
    await expect(
      deployContract(providers, { compiledContract: contract, privateStateId: undefined })
    ).rejects.toThrow("'privateStateId' was given as undefined");
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
    expect(providers.midnightProvider.submitTx).not.toHaveBeenCalled();
  });

  it('refuses a POST-FORK head before the ZK config provider is asked for a single key', async () => {
    const providers = deployProviders();
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    // The ordinary browser case after a fork: the retained artifact's ZK config is no longer
    // served. Fetched ahead of the era gate, the caller is handed the provider's fetch rejection
    // instead of the reason it can act on.
    providers.zkConfigProvider.getVerifierKeys = vi
      .fn()
      .mockRejectedValue(new Error('retained-era ZK config is no longer served'));

    await expect(deployContract(providers, { compiledContract: contract })).rejects.toBeInstanceOf(
      Ledger8DeployOnV9Error
    );
    expect(providers.zkConfigProvider.getVerifierKeys).not.toHaveBeenCalled();
  });

  it('refuses a wallet that cannot carry the era before the ZK config provider is asked for a single key', async () => {
    const base = deployProviders();
    // A v9-only wallet on a pre-fork head. A proof is the expensive step and the first of the
    // three, so a seam that cannot take this payload has to be found before one is paid for -- and
    // before anything is fetched on its behalf.
    const providers: RetainedProviders = {
      ...base,
      walletProvider: createWalletProvider({
        balanceTx: () => Promise.reject(new Error('never reached')),
        getCoinPublicKey: () => recording.coinPublicKey,
        getEncryptionPublicKey: () => base.walletProvider.getEncryptionPublicKey()
      })
    };
    providers.zkConfigProvider.getVerifierKeys = vi
      .fn()
      .mockRejectedValue(new Error('retained-era ZK config is no longer served'));

    await expect(deployContract(providers, { compiledContract: contract })).rejects.toBeInstanceOf(
      SeamEraUnsupportedError
    );
    expect(providers.zkConfigProvider.getVerifierKeys).not.toHaveBeenCalled();
  });

  it('carries the signing key on a status refusal, so a deployment that DID land is still maintainable', async () => {
    const providers = deployProviders();
    // `FailFallible`, specifically: a `ContractDeploy` sits in the Intent -- the GUARANTEED part --
    // so the contract landed, under the authority built from this key. Discarded, that address is
    // one nobody can ever maintain, which is the harm this arm exists to remove.
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockResolvedValue(retainedEraRecord(FailFallible));

    let caught: unknown;
    try {
      await deployContract(providers, { compiledContract: contract });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8DeployTxFailedError);
    expect((caught as Ledger8DeployTxFailedError).signingKey).toBe(SAMPLED_SIGNING_KEY);
    // And the message has to say the contract landed. A caller told "nothing local refers to this
    // address" concludes nothing happened and never looks for the deployment.
    expect((caught as Ledger8DeployTxFailedError).message).toContain('LANDED');
  });

  it('carries the signing key when the record cannot be attributed to the head it composed on', async () => {
    const providers = deployProviders();
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockResolvedValue(createMockFinalizedTxData());

    let caught: unknown;
    try {
      await deployContract(providers, { compiledContract: contract });
    } catch (error) {
      caught = error;
    }

    // One refusal for every way the record fails to arrive usable, with the era violation kept on
    // `cause` -- so the condition a caller branches on, its seam and its registered code are all
    // still reachable, and the original stack is not thrown away.
    expect(caught).toBeInstanceOf(Ledger8DeployUnconfirmedError);
    const cause = (caught as Ledger8DeployUnconfirmedError).cause;
    expect(cause).toBeInstanceOf(EraInvariantViolationError);
    expect(hasErrorCode(cause, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
    expect((cause as EraInvariantViolationError).seam).toBe('watchForDeployTxData');
    // The transaction is already on the network by the time this is raised, so discarding the key
    // here leaves whatever does finalize permanently unmaintainable.
    expect((caught as Ledger8DeployUnconfirmedError).signingKey).toBe(SAMPLED_SIGNING_KEY);
    expect((caught as Ledger8DeployUnconfirmedError).contractAddress).toMatch(/^[0-9a-f]+$/);
  });

  it('carries the signing key when the record cannot be read back at all, keeping the rejection on cause', async () => {
    const providers = deployProviders();
    const unreachable = new Error('indexer unreachable');
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockRejectedValue(unreachable);

    let caught: unknown;
    try {
      await deployContract(providers, { compiledContract: contract });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8DeployUnconfirmedError);
    expect((caught as Ledger8DeployUnconfirmedError).signingKey).toBe(SAMPLED_SIGNING_KEY);
    // The reason the record is unreadable is what the caller acts on, so it is kept rather than
    // replaced -- this class adds the one fact a provider rejection cannot carry.
    expect((caught as Ledger8DeployUnconfirmedError).cause).toBe(unreachable);
  });

  it('carries the signing key when the record comes back with no readable era tag', async () => {
    const providers = deployProviders();
    // The third way this step fails, alongside a rejected read and a record from the wrong era.
    // All three strand the same key, so all three carry it -- an untagged record left it behind
    // while the other two did not.
    providers.publicDataProvider.watchForDeployTxData = vi
      .fn()
      .mockResolvedValue({ ...createMockFinalizedTxData(), version: undefined });

    let caught: unknown;
    try {
      await deployContract(providers, { compiledContract: contract });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8DeployUnconfirmedError);
    expect((caught as Ledger8DeployUnconfirmedError).signingKey).toBe(SAMPLED_SIGNING_KEY);
    expect((caught as Ledger8DeployUnconfirmedError).cause).toBeInstanceOf(UntaggedPayloadError);
  });

  it('persists the signing key against the address it minted, in the shape the store takes', async () => {
    const providers = deployProviders();

    const deployed = await deployContract(providers, { compiledContract: contract });

    // The store is the CURRENT era's and its key is `{ tag, value }`, where the retained era's is
    // the bare hex string. Both runtimes sample the same 32-byte Schnorr key and the retained one
    // reads a current-era key's `value` verbatim, so the wrapper is the whole difference -- which
    // is why this arm adds it here instead of widening the provider interface.
    //
    // No private state is named by this deploy, so the write is pinned on the arm that has no
    // private-state write to ride along with.
    expect(providers.privateStateProvider.setSigningKey).toHaveBeenCalledWith(deployed.contractAddress, {
      tag: 'schnorr',
      value: deployed.signingKey
    });
  });

  it('writes the key only after the chain record has been checked', async () => {
    const providers = deployProviders();
    providers.publicDataProvider.watchForDeployTxData = vi.fn().mockResolvedValue(retainedEraRecord(FailEntirely));

    await expect(deployContract(providers, { compiledContract: contract })).rejects.toBeInstanceOf(
      Ledger8DeployTxFailedError
    );

    // The same order the private-state write already holds to: a deploy the chain refused must
    // leave no local state claiming it succeeded. The refusal carries the key instead, which is
    // the only copy that then exists.
    expect(providers.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
  });

  it('names the minted address before it writes the key', async () => {
    const providers = deployProviders();

    const deployed = await deployContract(providers, { compiledContract: contract });

    expect(providers.privateStateProvider.setContractAddress).toHaveBeenCalledWith(deployed.contractAddress);
    expect(callOrder(providers.privateStateProvider.setContractAddress)).toBeLessThan(
      callOrder(providers.privateStateProvider.setSigningKey)
    );
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

  it('hands back a callTx interface covering every circuit the artifact declares', async () => {
    const providers = attachProviders(v6Envelope);
    // Attaching itself touches no engine; CALLING through the handle does, so
    // this test is the one place in this block that fills the slot.
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope);

    const found = await findDeployedContract(providers, attachOptions());

    // The current era hands back a handle a caller can invoke; the retained arm
    // answered with data only, so a caller who attached had to go back to
    // `submitCallTx` and re-state the contract and address it had just supplied.
    expect(Object.keys(found.callTx)).toEqual([CIRCUIT_ID]);

    const finalized = await found.callTx[CIRCUIT_ID](recording.receivedCoin);

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
    expect(finalized.private.result).toStrictEqual(recording.transcript.result);
    expect(finalized.public.txId).toBe(createMockFinalizedTxData().txId);
  });

  it('runs a call made through the handle against the STORED private state, and writes the result back', async () => {
    const providers = attachProviders(v6Envelope);
    // The provider actually holds a state under the named id, which is what
    // makes the read observable at all -- the default mock answers `undefined`.
    providers.privateStateProvider.get = vi.fn().mockResolvedValue({ storedBefore: true });
    // The engine is told what the pipeline MUST have handed it. Asserting only
    // that `get` ran leaves `privateState: undefined` fully green, because the
    // recording replays regardless -- and that is the failure this test names:
    // a handle that cannot carry the id proves against a default state and then
    // discards the next one, with nothing erroring at any stage.
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope, {
      privateState: { storedBefore: true }
    });

    const found = await findDeployedContract(providers, {
      ...attachOptions(),
      privateStateId: 'retained-private-state'
    });
    const finalized = await found.callTx[CIRCUIT_ID](recording.receivedCoin);

    expect(providers.privateStateProvider.get).toHaveBeenCalledWith('retained-private-state');
    expect(finalized.private.nextPrivateState).toEqual({});
    expect(providers.privateStateProvider.set).toHaveBeenCalledWith('retained-private-state', {});
  });

  it('leaves the private state untouched when the caller named no id', async () => {
    const providers = attachProviders(v6Envelope);
    engineSlot.engine = createReplayEngine(recording, [], v6Envelope);

    const found = await findDeployedContract(providers, attachOptions());
    await found.callTx[CIRCUIT_ID](recording.receivedCoin);

    // A retained-era contract may genuinely carry no private state, so naming
    // no id stays legal -- but then NOTHING is read and nothing is written.
    expect(providers.privateStateProvider.get).not.toHaveBeenCalled();
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  // SEEDING, which is the attach's one write. Everything else on this path is a read, and the cases
  // below are the current era's rule applied unchanged: the two configurations that act, and the
  // three that are refused rather than guessed at. The rule itself lives in one place --
  // `setOrGetInitialPrivateState` in `find-deployed-contract.ts` -- so what these pin is that the
  // retained arm reaches it, not a second copy of the rule.
  //
  it('names the contract address before it writes, so the seed lands in this contract namespace', async () => {
    const providers = attachProviders(v6Envelope);

    await findDeployedContract(providers, {
      ...attachOptions(),
      privateStateId: 'retained-private-state',
      initialPrivateState: {}
    });

    expect(providers.privateStateProvider.setContractAddress).toHaveBeenCalledWith(recording.contractAddress);
    // A provider namespaces every entry by the address last named, and a real one REFUSES a write
    // before any has been named. Written first, the seed lands under whichever address the process
    // happened to touch last -- and the retained CALL path, which names the address itself, then
    // reads its own key and finds nothing, with no error at any stage.
    expect(callOrder(providers.privateStateProvider.setContractAddress)).toBeLessThan(
      callOrder(providers.privateStateProvider.set)
    );
  });

  it('names the contract address before it reads', async () => {
    const providers = attachProviders(v6Envelope);
    providers.privateStateProvider.get = vi.fn().mockResolvedValue({ storedBefore: true });

    await findDeployedContract(providers, { ...attachOptions(), privateStateId: 'retained-private-state' });

    expect(providers.privateStateProvider.setContractAddress).toHaveBeenCalledWith(recording.contractAddress);
    expect(callOrder(providers.privateStateProvider.setContractAddress)).toBeLessThan(
      callOrder(providers.privateStateProvider.get)
    );
  });

  it('stores the initial private state at the named id', async () => {
    const providers = attachProviders(v6Envelope);
    const initialPrivateState = {};

    await findDeployedContract(providers, {
      ...attachOptions(),
      privateStateId: 'retained-private-state',
      initialPrivateState
    });

    expect(providers.privateStateProvider.set).toHaveBeenCalledWith('retained-private-state', initialPrivateState);
    // Stored, not merged with whatever was there: the caller said what the state is.
    expect(providers.privateStateProvider.get).not.toHaveBeenCalled();
  });

  it('reads the state already stored at the named id when the caller supplies none', async () => {
    const providers = attachProviders(v6Envelope);
    providers.privateStateProvider.get = vi.fn().mockResolvedValue({ storedBefore: true });

    await findDeployedContract(providers, { ...attachOptions(), privateStateId: 'retained-private-state' });

    expect(providers.privateStateProvider.get).toHaveBeenCalledWith('retained-private-state');
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  it('refuses the ATTACH when the named id holds nothing, rather than the first call', async () => {
    const providers = attachProviders(v6Envelope);

    // The mock provider answers `undefined` by default, which is the condition under test: an id
    // the caller believes is populated and is not. This read exists for exactly this refusal --
    // nothing on `Ledger8FoundContract` carries the state it returns -- so what it buys is the
    // error arriving at attach time instead of at the first call, against a state the contract
    // never had.
    await expect(
      findDeployedContract(providers, { ...attachOptions(), privateStateId: 'retained-private-state' })
    ).rejects.toThrow("No private state found at private state ID 'retained-private-state'");
    // No handle was built, so there is no `callTx` for a caller to reach the missing state through.
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  it('refuses an initial private state with no id to store it under', async () => {
    const providers = attachProviders(v6Envelope);

    await expect(
      findDeployedContract(providers, { ...attachOptions(), initialPrivateState: {} })
    ).rejects.toBeInstanceOf(IncompleteFindContractPrivateStateConfig);
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  it('refuses a privateStateId written as undefined, rather than reading it as no id at all', async () => {
    const providers = attachProviders(v6Envelope);

    // `{ privateStateId: cfg.somethingUndefined }` is an ordinary way for a JavaScript consumer to
    // reach this, and it means the caller BELIEVES it named an id. Treating the key's presence as
    // "no id given" would attach against no state and leave every later call running on one the
    // contract never had.
    await expect(
      findDeployedContract(providers, { ...attachOptions(), privateStateId: undefined })
    ).rejects.toThrow("'privateStateId' was given as undefined");
    expect(providers.privateStateProvider.get).not.toHaveBeenCalled();
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  it('refuses an undefined privateStateId even when an initial private state is supplied', async () => {
    const providers = attachProviders(v6Envelope);

    // The other direction, and the one that used to WRITE: the id was passed straight through to
    // the provider, storing the state under an id of `undefined`.
    await expect(
      findDeployedContract(providers, { ...attachOptions(), privateStateId: undefined, initialPrivateState: {} })
    ).rejects.toThrow("'privateStateId' was given as undefined");
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
  });

  it('reads and writes no private state at all when the caller gives neither', async () => {
    const providers = attachProviders(v6Envelope);

    await findDeployedContract(providers, attachOptions());

    // OMITTING the key stays legal, where writing it as `undefined` is refused above: a retained-era
    // contract may genuinely carry no private state. Stated at the ATTACH rather than after a call,
    // because the attach is now a writer: the test above that makes a call through the handle would
    // keep passing if the attach itself seeded an unnamed state and the call then read it back.
    expect(providers.privateStateProvider.get).not.toHaveBeenCalled();
    expect(providers.privateStateProvider.set).not.toHaveBeenCalled();
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
    ).rejects.toThrow(/Invalid hex-digit/);
    // The same local refusal the current-era arm makes. A malformed address
    // would otherwise cost a network round trip to discover.
    expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    expect(providers.publicDataProvider.queryRawContractState).not.toHaveBeenCalled();
  });

  it("routes on the ENVELOPE, not on the record's own era label, when attaching after the fork", async () => {
    const providers = attachProviders(v6Envelope);
    // The record labels itself current-era and the head agrees with the label, while the bytes
    // carry a retained envelope. The label is derived from `protocolVersion` alone and is not a
    // verified statement about the bytes -- and the bytes are what a decoder has to read.
    //
    // This is a contract deployed before the fork and attached to after it, which is ordinary:
    // the fork does not rewrite stored state. It must attach, not be refused.
    providers.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(POST_FORK_PROTOCOL_VERSION);
    providers.publicDataProvider.queryRawContractState = vi.fn().mockResolvedValue({
      version: 'v9',
      protocolVersion: POST_FORK_PROTOCOL_VERSION,
      raw: v6Envelope
    });

    await expect(findDeployedContract(providers, attachOptions())).resolves.toBeDefined();
    expect(providers.publicDataProvider.watchForDeployTxData).toHaveBeenCalled();
  });

  // Both tags are legitimate on this path -- the test above pins that -- so
  // there is no era to compare the record against. What IS refusable is a
  // record carrying no usable tag at all. `version` selects the runtime of the
  // live `tx` handle beside it, so an unreadable tag hands a caller a handle it
  // cannot attribute, which is the failure the current era's arm refuses
  // through `requireV9Record`'s own default branch.
  it.each([
    ['absent', undefined],
    ['unrecognised', 'v10'],
    ['mis-cased', 'V8']
  ])('refuses a deploy record whose version tag is %s', async (_label, version) => {
    const providers = attachProviders(v6Envelope);
    providers.publicDataProvider.watchForDeployTxData = vi
      .fn()
      .mockResolvedValue({ ...createMockFinalizedTxData(), version });

    await expect(findDeployedContract(providers, attachOptions())).rejects.toBeInstanceOf(UntaggedPayloadError);
  });

  it('names the seam and the tag it actually received when it refuses one', async () => {
    const providers = attachProviders(v6Envelope);
    providers.publicDataProvider.watchForDeployTxData = vi
      .fn()
      .mockResolvedValue({ ...createMockFinalizedTxData(), version: 'v10' });

    const caught = await findDeployedContract(providers, attachOptions()).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(UntaggedPayloadError);
    expect((caught as UntaggedPayloadError).seam).toBe('watchForDeployTxData');
    expect((caught as UntaggedPayloadError).received).toContain('v10');
  });

  it('still accepts BOTH legitimate tags, which is what makes the refusal above about the shape', async () => {
    for (const version of ['v8', 'v9'] as const) {
      const providers = attachProviders(v6Envelope);
      providers.publicDataProvider.watchForDeployTxData = vi
        .fn()
        .mockResolvedValue({ ...createMockFinalizedTxData(), version });

      const found = await findDeployedContract(providers, attachOptions());

      expect(found.deployTxData.version).toBe(version);
    }
  });

  // THE SIGNING KEY. The deploy arm persists it against the address it minted, so this arm is the
  // side of that round trip that reads it back -- and the field that used to be documented as
  // discarded is now the way to seed a key the deploy happened elsewhere.
  it('stores a signing key the caller supplies, and reports it back', async () => {
    const providers = attachProviders(v6Envelope);

    const found = await findDeployedContract(providers, { ...attachOptions(), signingKey: 'caller-own-signing-key' });

    expect(providers.privateStateProvider.setSigningKey).toHaveBeenCalledWith(recording.contractAddress, {
      tag: 'schnorr',
      value: 'caller-own-signing-key'
    });
    expect(found.signingKey).toBe('caller-own-signing-key');
  });

  it('reports the key a deploy persisted when the caller supplies none', async () => {
    const providers = attachProviders(v6Envelope);
    providers.privateStateProvider.getSigningKey = vi
      .fn()
      .mockResolvedValue({ tag: 'schnorr', value: 'stored-retained-signing-key' });

    const found = await findDeployedContract(providers, attachOptions());

    // Unwrapped back to the bare string the retained runtime takes.
    expect(found.signingKey).toBe('stored-retained-signing-key');
    // KEPT, not written over: a caller that attaches without naming a key is asking what is held,
    // not replacing it.
    expect(providers.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
  });

  it('reports no key, and samples none, when the provider holds none for the address', async () => {
    const providers = attachProviders(v6Envelope);
    providers.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(null);

    const found = await findDeployedContract(providers, attachOptions());

    // The member is PRESENT and undefined, not dropped: a handle missing it entirely reads the
    // same at a call site that only checks the value.
    expect('signingKey' in found).toBe(true);
    expect(found.signingKey).toBeUndefined();
    // The current era samples a fresh key in this case. The retained era must not: a sampled key
    // bears no relation to the authority the chain holds for a contract deployed by someone else,
    // and this arm carries no maintenance interface for one to be used through, so storing it
    // would report a key that can maintain nothing.
    expect(providers.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
  });

  it('refuses a stored key of the other signature kind rather than handing it to the retained runtime', async () => {
    const providers = attachProviders(v6Envelope);
    // The store is shared with the current era, whose keys may legitimately be `ecdsa`. Unwrapped
    // blindly, that value would be handed to the retained runtime as a maintenance key nobody
    // holds the verifying key for.
    providers.privateStateProvider.getSigningKey = vi
      .fn()
      .mockResolvedValue({ tag: 'ecdsa', value: 'other-kind-key-material' });

    const caught = await findDeployedContract(providers, attachOptions()).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('ecdsa');
    // Named, never rendered: the value is secret material and an error message reaches logs.
    expect((caught as Error).message).not.toContain('other-kind-key-material');
  });

});
