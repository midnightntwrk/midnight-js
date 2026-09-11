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
import { ContractState, LedgerParameters, Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type RawContractState,
  type VersionedFinalizedTransaction,
  type VersionedTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EraInvariantViolationError,
  HeadStateEraMismatchError,
  IndexerInconsistencyError,
  LedgerParametersUnservedError,
  RetainedArtifactOnCurrentEraStateError
} from '../errors';
import { runLedger8CallPipeline } from '../internal/ledger8-pipeline';
import { createEncryptionPublicKeyResolver } from '../internal/utils';
import type { Ledger8CallTxOptions, Ledger8ContractProviders } from '../ledger8-contract';
import { submitCallTx } from '../submit-call-tx';
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
  raw,
  // Served from the SAME read as `raw`, which is what a real provider does and what the pipeline
  // now requires. The initial parameters stand in for the content -- a chain serves different
  // numbers -- but they are the CURRENT era's bytes, which is what dates them to this block.
  ledgerParameters: LedgerParameters.initialParameters().serialize()
});

/**
 * The same record with the block's parameters missing, which is what a `PublicDataProvider` that
 * does not serve them produces. `RawContractState.ledgerParameters` is optional, so such a provider
 * is type-correct and the omission cannot be caught at the seam.
 */
const rawStateWithoutParameters = (raw: Uint8Array, protocolVersion: number): RawContractState => {
  const { ledgerParameters: _omitted, ...withoutParameters } = rawState(raw, protocolVersion);
  return withoutParameters;
};

describe('the keep-state pipeline (previous-toolchain contract, post-fork head)', () => {
  let recording: CoinReceiverRecording;
  let contract: CoinReceiver016Contract;
  let currentEra: LedgerEra;
  let retainedEra: LedgerEra;
  let v9Envelope: Uint8Array;
  let v6Envelope: Uint8Array;

  beforeAll(async () => {
    recording = loadCoinReceiverRecording();
    v9Envelope = readHfHexFixture('coin-receiver-016', 'state-v9.hex');
    v6Envelope = readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex');
    const module: CoinReceiver016Module = await import(
      /* @vite-ignore */ hfFixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
    );
    contract = new module.Contract({});
    currentEra = await loadLedgerEra('v9');
    retainedEra = await loadLedgerEra('v8');
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
    const providers = postForkProviders(v6Envelope);

    const result = await runLedger8CallPipeline<ReplayState>({
      era: recordEraCalls(currentEra, log, (options) => {
        composed = options;
      }),
      retainedEra: recordEraCalls(retainedEra, log),
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
    // not in it -- see this file's own header for why. The transcript crosses
    // ALREADY partitioned: the pipeline resolves the split to route the Zswap
    // offer, so the composition receives the pair rather than redrawing it.
    // The order is the retained arm's, plus the one step that only keep-state
    // needs. Read the ERAS in it, not just the names: the two reads are the
    // RETAINED era's -- it is the only one that can read these bytes -- and
    // everything after execution is the CURRENT era's. That split IS
    // keep-state, and the log NAMES the era for each step, so this pins which
    // one served it rather than only the order they ran in.
    expect(log).toEqual([
      'era.v8.extractState',
      'era.v8.decodeContractState',
      'engine.downConvertForExecution',
      'engine.executeCircuit',
      // The CURRENT era's, like the composition below it: the pipeline
      // partitions with the era it composes with, so the offer is routed
      // against the same split the composer is handed. Pre-fork that is the
      // retained era; here the two differ, which is why the era is pinned.
      'era.v9.partitionCallTranscript',
      'engine.reexpressOperationsForCurrentEra',
      'era.v9.composeCallTx'
    ]);
    expect(composed?.calls).toHaveLength(1);
    expect(composed?.calls[0]?.transcript.kind).toBe('partitioned');

    // NOT the chain's own bytes: the current composer cannot deserialize a
    // retained envelope at all. What it gets is the operation registry
    // re-expressed in its own era...
    const registry = composed?.calls[0]?.contractState;
    expect(registry).toBeDefined();
    expect(registry).not.toBe(v6Envelope);

    // ...carrying the SAME verifier key the chain holds, which is what makes
    // the re-expression faithful rather than a substitution.
    const chainKey = retainedEra.decodeContractState(v6Envelope).entryPoints.find(
      (entryPoint) => entryPoint.circuitId === CIRCUIT_ID
    )?.verifierKey;
    expect(chainKey).toBeDefined();
    expect(ContractState.deserialize(registry!).operation(CIRCUIT_ID)?.verifierKey).toEqual(chainKey);

    // The CURRENT era tagged this one, and the retained tag does not match it.
    expect(txTagPrefix(result.txBytes, CURRENT_ERA_TX_TAG)).toBe(CURRENT_ERA_TX_TAG);
    expect(txTagPrefix(result.txBytes, RETAINED_ERA_TX_TAG)).not.toBe(RETAINED_ERA_TX_TAG);
  });

  it('carries the recorded coin movement in the GUARANTEED segment here too', async () => {
    const log: OrchestrationLog = [];
    const providers = postForkProviders(v6Envelope);

    const result = await runLedger8CallPipeline<ReplayState>({
      era: currentEra,
      retainedEra,
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

    // GUARANTEED because this recording's ops PARTITION that way, not because
    // the arm cannot route: this arm resolves the split before it builds the
    // offer too. See the retained arm's 'routes a coin the partition places in
    // the fallible half' for the other direction.
    expect(result.guaranteedZswapOffer).toBeInstanceOf(Uint8Array);
    expect(result.fallibleZswapOffer).toBeUndefined();
  });

  it('REFUSES a finalized record from the era the head it composed on had already left', async () => {
    const providers = postForkProviders(v6Envelope);
    // The keep-state direction of the same guard. This flow ran the RETAINED
    // pipeline against a POST-FORK head, so the transaction was composed and
    // submitted as `'v9'` and can only have been recorded as `'v9'`. A `'v8'`
    // record here is the read surface answering for an era the chain has left.
    //
    // Note what is NOT being asserted: that `era` and `version` must agree.
    // They legitimately disagree on this arm -- `era: 'ledger8'` with
    // `version: 'v9'` IS keep-state, and the happy path below relies on it.
    // What must agree is the record and the HEAD the operation resolved.
    providers.publicDataProvider.watchForTxData = vi
      .fn()
      .mockResolvedValue({ ...createMockFinalizedTxData(), version: 'v8', tx: undefined as never });

    const rejection = await submitCallTx(providers, callOptions()).then(
      () => undefined,
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(EraInvariantViolationError);
    expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
    expect((rejection as EraInvariantViolationError).seam).toBe('watchForTxData');
    expect((rejection as EraInvariantViolationError).expected).toBe('v9');
    expect((rejection as EraInvariantViolationError).circuitId).toBe(CIRCUIT_ID);
  });

  it('completes a call through the unchanged submitCallTx, reading the head ONCE and the state ONCE', async () => {
    const providers = postForkProviders(v6Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
    expect(providers.publicDataProvider.watchForTxData).toHaveBeenCalledWith('keep-state-tx-id');
    expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(providers.publicDataProvider.queryRawContractState).toHaveBeenCalledTimes(1);
  });

  it('hands every provider seam the CURRENT-era arm, as a live ledger transaction', async () => {
    const providers = postForkProviders(v6Envelope);

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

    // A LIVE HANDLE, not merely a `'v9'` tag over anything.
    // `readCurrentEraTransaction` could be replaced with `() => undefined` and
    // every assertion above would still pass, handing `undefined` down the
    // whole chain: `{ version: 'v9', tx: undefined }` satisfies both the tag
    // check and the absence of `txBytes`.
    for (const payload of [providers.seen.proveTx, providers.seen.balanceTx, providers.seen.submitTx]) {
      expect(payload?.version === 'v9' ? payload.tx : undefined).toBeInstanceOf(Transaction);
    }
  });

  it('refuses a provider that answers this current-era flow in the retained era', async () => {
    const providers = postForkProviders(v6Envelope);
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

  it("routes on the ENVELOPE, not on the record's own era label, so keep-state is not gated on a label", async () => {
    // The record LABELS itself current-era -- that label is derived from its
    // `protocolVersion` alone and is explicitly not a verified statement about
    // the bytes -- while the bytes carry a retained envelope. The envelope is
    // what decides, so this is read by the retained decoder and the call runs.
    const providers = postForkProviders(v6Envelope);
    const served = (await providers.publicDataProvider.queryRawContractState('')) as RawContractState;
    expect(served.version).toBe('v9');

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
  });

  it('refuses to compose when the read surface served no ledger parameters, before proving', async () => {
    // The pipeline HAS a read surface -- it just read the state -- so absent parameters are a
    // provider that did not serve them, not a caller that cannot read the chain. Substituting the
    // ledger's initial parameters here would partition the transcript against a cost model the
    // chain does not run, and the node would refuse the guaranteed segment for running out of gas
    // AFTER the caller had paid for proving. The sentinel exists for callers with no read surface;
    // this caller must not reach it by accident.
    const providers = postForkProviders(v6Envelope);
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue(rawStateWithoutParameters(v6Envelope, POST_FORK_PROTOCOL_VERSION));

    const log: OrchestrationLog = [];
    let caught: unknown;
    try {
      await runLedger8CallPipeline<ReplayState>({
        era: recordEraCalls(currentEra, log),
        retainedEra: recordEraCalls(retainedEra, log),
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
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(LedgerParametersUnservedError);
    expect((caught as LedgerParametersUnservedError).contractAddress).toBe(recording.contractAddress);
    // Refused before the era was ever asked to compose, which is what makes this cheap rather than
    // a wasted proof.
    expect(log).not.toContain('era.composeCallTx');
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('reads a current-era envelope with the CURRENT decoder even when the record mislabels itself as retained', async () => {
    // The mirror, and the one a label-based route would get wrong in the
    // dangerous direction: the label AGREES with the retained pipeline while
    // the bytes are current-era. Routing on the label would hand current-era
    // bytes to the retained decoder, which refuses them on the envelope tag.
    // The envelope decides which decoder may read the bytes; it does not decide
    // whether the caller's artifacts fit the contract.
    const providers = postForkProviders(v6Envelope);
    providers.publicDataProvider.queryRawContractState = vi
      .fn()
      .mockResolvedValue({ ...rawState(v9Envelope, POST_FORK_PROTOCOL_VERSION), version: 'v8' });

    await expect(submitCallTx(providers, callOptions())).resolves.toBeDefined();
  });

  it('calls a MIGRATED contract again, whose state is current-era but whose keys are still retained', async () => {
    // The second post-fork call, which is the whole point of keep-state being
    // more than one shot. The first call migrated the envelope from retained to
    // current-era; the ledger copies the retained verifier keys across
    // unchanged, so the caller's retained artifacts are still the right ones
    // for this contract. Measured on the committed goldens: a real migrated
    // 8-to-9 state carries the SAME `midnight:verifier-key[v6]:` bytes its
    // pre-migration form did, and the current-era decoder reads them.
    const providers = postForkProviders(v9Envelope);

    const finalized = await submitCallTx(providers, callOptions());

    expect(finalized.circuitId).toBe(CIRCUIT_ID);
    // Proved and submitted, not merely accepted by the reader: the point is that the call
    // COMPLETES, not that one check stopped refusing.
    expect(providers.proofProvider.proveTx).toHaveBeenCalledTimes(1);
    expect(providers.publicDataProvider.watchForTxData).toHaveBeenCalledWith('keep-state-tx-id');
    // Read with the CURRENT decoder, which is the only way these bytes decode at all: the retained
    // decoder refuses a `contract-state[v8]` envelope on the tag.
    expect(providers.publicDataProvider.queryRawContractState).toHaveBeenCalledTimes(1);
  });

  it('refuses a current-era state whose key is not the one the local artifact carries', async () => {
    // The negative the envelope check used to stand in for, now asked of the
    // signal that actually answers it. A contract deployed with current-toolchain
    // artifacts holds a key these retained artifacts cannot match, and the
    // refusal has to name that rather than the envelope -- which, after a
    // migration, says nothing about which artifacts the contract was built from.
    const providers = postForkProviders(v9Envelope);
    providers.zkConfigProvider.getVerifierKey = vi.fn().mockResolvedValue(Uint8Array.from([0x01, 0x02, 0x03]));

    let caught: unknown;
    try {
      await submitCallTx(providers, callOptions());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RetainedArtifactOnCurrentEraStateError);
    expect((caught as RetainedArtifactOnCurrentEraStateError).contractAddress).toBe(recording.contractAddress);
    // Refused before anything is paid for: a proof against a key the chain does
    // not hold is rejected on submission, which is the late failure this
    // ordering exists to prevent.
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });

  it('refuses before any provider round trip when no contract is deployed at the address', async () => {
    const providers = postForkProviders(v6Envelope);
    providers.publicDataProvider.queryRawContractState = vi.fn().mockResolvedValue(null);

    await expect(submitCallTx(providers, callOptions())).rejects.toThrow(
      `No contract deployed at contract address '${recording.contractAddress}'`
    );
    expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
  });
});
