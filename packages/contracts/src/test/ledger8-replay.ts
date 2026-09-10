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
 * The retained-era test rig both pipeline suites share: the committed
 * recording, the engine that REPLAYS it, and the two measured transaction
 * tags.
 *
 * ## The engine here replays committed data. It never invents any.
 *
 * This package holds no retained-runtime dependency — not even a development
 * one — because the real engine runs a construction guard whose whole purpose
 * is to detect a SECOND acquisition path for that runtime, and a dependency
 * here would create one. So the engine is doubled. A double built from guessed
 * shapes would test the orchestration against a fiction, so this one replays a
 * transcript recorded by REAL retained-era execution and committed as a
 * fixture — minted, and continuously re-verified against a live execution, by
 * `packages/protocol/src/test/era-record-coin-receiver.test.ts`.
 *
 * The replay is CONDITIONAL, which is what keeps it honest:
 * {@link createReplayEngine} refuses to hand back the recorded transcript
 * unless the state it was asked to down-convert is the very state the
 * recording was made against, and unless the circuit and arguments match.
 * That single assertion is also the strongest thing these suites prove about
 * the read path: the state reaches the engine having travelled from a
 * committed on-chain envelope, through the era facade's own `extractState`,
 * and it arrives structurally identical to what the real runtime executed on.
 *
 * Not a `*.test.ts` file, so vitest does not collect it, and it sits under
 * `test/`, which the coverage config excludes.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ComposeCallOptions, LedgerEra } from '@midnight-ntwrk/midnight-js-protocol';
import type { ZswapLocalState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ContractOperation, ContractState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { expect } from 'vitest';

import type {
  Ledger8ConstructedState,
  Ledger8ExecutionEngine,
  Ledger8Transcript
} from '../internal/ledger8-pipeline';
import type { CoinReceiver016Coin } from './ledger8-fixture-types';

// The fixture tree lives in testkit-js because that is where it is produced and
// where the e2e suites consume it. Reached by RELATIVE path, never through
// `@midnight-ntwrk/testkit-js`: a dependency on that package from here would
// close a workspace cycle. `packages/protocol/src/test/fixtures.ts` reaches the
// same tree the same way.
const FIXTURES_DIR = resolve(
  fileURLToPath(new URL('../../../../', import.meta.url)),
  'testkit-js/testkit-js/src/fixtures/hf'
);

/** An absolute path inside the shared hard-fork fixture tree. */
export const hfFixturePath = (...segments: readonly string[]): string => resolve(FIXTURES_DIR, ...segments);

/**
 * Reads a hex-encoded fixture into the bytes it encodes.
 *
 * The length check is the point: `Buffer.from(text, 'hex')` stops at the first
 * non-hex character and returns the prefix it managed to decode, so a
 * truncated or hand-edited fixture would otherwise arrive as a short byte
 * string and be tested as though it were whole.
 */
export const readHfHexFixture = (...segments: readonly string[]): Uint8Array => {
  const text = readFileSync(hfFixturePath(...segments), 'utf8').trim();
  const bytes = Uint8Array.from(Buffer.from(text, 'hex'));
  if (bytes.length * 2 !== text.length) {
    throw new Error(`fixture ${segments.join('/')} is not whole hex: ${text.length} chars decoded to ${bytes.length} bytes`);
  }
  return bytes;
};

// ---------------------------------------------------------------------------
// The two transaction tags, MEASURED rather than guessed
// ---------------------------------------------------------------------------

/**
 * The exact tag the RETAINED ledger's `Transaction.serialize()` emits for an
 * unproven transaction.
 *
 * Measured by serializing one against the pinned retained ledger, not guessed —
 * the same literal, and the same discipline, as
 * `packages/protocol/src/test/v8-compose.test.ts`.
 *
 * Note the `[v9]`: that is the transaction OBJECT's wire-schema version and has
 * nothing to do with the ledger era. Never infer an era from a bracketed
 * version alone; compare the whole tag.
 */
export const RETAINED_ERA_TX_TAG = 'midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1]):';

/**
 * The exact tag the CURRENT ledger's `Transaction.serialize()` emits for an
 * unproven transaction. Measured the same way, by serializing one.
 *
 * This is the first place in the tree the current-era literal is written down.
 * The two tags DIFFER — 71 bytes against 72, `transaction[v9]`/`signature[v1]`
 * against `transaction[v12]`/`signature[v2]` — which is what makes the tag a
 * usable corroboration of which ledger produced a transaction. The seam's own
 * `version` field remains the primary discriminator: it is this framework's,
 * while a tag is a ledger serialization detail that can move on a vendor bump.
 */
export const CURRENT_ERA_TX_TAG = 'midnight:transaction[v12](signature[v2],proof-preimage,embedded-fr[v1]):';

/**
 * Reads the leading `tag.length` bytes of a serialized transaction as latin-1.
 *
 * A raw prefix slice, deliberately, and NOT `parseSerializedTag`: that parser
 * scans only the first 64 bytes and throws beyond them, while both transaction
 * tags are longer than 64.
 *
 * @param bytes The serialized transaction.
 * @param tag The tag to compare against, whose length decides how much is read.
 * @returns The prefix, as a string.
 */
export const txTagPrefix = (bytes: Uint8Array, tag: string): string =>
  Buffer.from(bytes.subarray(0, tag.length)).toString('latin1');

// ---------------------------------------------------------------------------
// The committed recording
// ---------------------------------------------------------------------------

/**
 * Decodes the recording's tagged JSON back into the values it encodes.
 *
 * The encoding wraps each non-JSON value kind in a single-key tagged object —
 * `{ __bigint }`, `{ __bytes }`, `{ __map }` — so decoding is unambiguous.
 * That matters here in a way it does not for the counter fixture's golden
 * transcript: this recording is DECODED and fed to a real ledger, and the
 * recorded partition context carries a genuine hex STRING
 * (`block.parentBlockHash`) beside genuine byte arrays, which a bare-hex
 * convention could not tell apart.
 */
const decodeRecorded = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(decodeRecorded);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const record: Record<string, unknown> = { ...value };
  if (typeof record.__bigint === 'string') {
    return BigInt(record.__bigint);
  }
  if (typeof record.__bytes === 'string') {
    return Uint8Array.from(Buffer.from(record.__bytes, 'hex'));
  }
  if (Array.isArray(record.__map)) {
    return new Map(
      record.__map.map((entry) => {
        if (!Array.isArray(entry) || entry.length !== 2) {
          throw new Error('malformed __map entry in the retained-era recording');
        }
        return [decodeRecorded(entry[0]), decodeRecorded(entry[1])] as const;
      })
    );
  }
  return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, decodeRecorded(entry)]));
};

/**
 * The committed recording, decoded.
 *
 * `transcript` is typed as the pipeline's own {@link Ledger8Transcript}, which
 * is what makes a replay of it type-check where the real engine's result
 * would. That is a claim about the TYPE, not about the file — see
 * {@link loadCoinReceiverRecording} for what is actually checked at load, and
 * what is trusted instead.
 */
export interface CoinReceiverRecording {
  readonly circuitId: string;
  readonly coinPublicKey: string;
  readonly contractAddress: string;
  /** The coin the recorded execution received, in the shape the artifact takes. */
  readonly receivedCoin: CoinReceiver016Coin;
  /** The state the recorded execution ran against, as the retained runtime encoded it. */
  readonly preState: unknown;
  readonly transcript: Ledger8Transcript;
}

/**
 * Every transcript member the pipeline reads that the FIXTURE carries, as a
 * runtime list.
 *
 * The list is tied to {@link Ledger8Transcript} by the assertions below, so a
 * member added to that type fails THIS file's compilation until it is named
 * here or in {@link SynthesizedMember} — and then fails the load below until
 * the fixture carries it. Which is what makes the drift claim above checkable
 * rather than asserted.
 */
const TRANSCRIPT_MEMBERS = [
  'circuitId',
  'result',
  'input',
  'output',
  'publicTranscript',
  'privateTranscriptOutputs',
  'partitionContext',
  'privateStateAfter',
  'zswapLocalState',
  'postContractStateEncoded'
] as const;

/**
 * The transcript members the DOUBLE mints rather than replays.
 *
 * `postContractState` is a live retained-runtime handle. A recording is JSON,
 * and no JSON encoding of a WASM pointer means anything, so this member cannot
 * come from the fixture — the double answers with its own marker instead, and
 * the pipeline is generic in exactly that type so nothing is cast to make it
 * fit. Listing it here rather than dropping the drift check is what keeps a
 * member that SHOULD be recorded from quietly landing on this side.
 */
type SynthesizedMember = 'postContractState';

type TranscriptMember = (typeof TRANSCRIPT_MEMBERS)[number] | SynthesizedMember;

type Assert<T extends true> = T;
type _EveryMemberListed = Assert<
  [Exclude<keyof Ledger8Transcript<ReplayState>, TranscriptMember>] extends [never] ? true : false
>;
type _NoMemberInvented = Assert<
  [Exclude<TranscriptMember, keyof Ledger8Transcript<ReplayState>>] extends [never] ? true : false
>;

/**
 * Reads and decodes the committed `coin-receiver-016` transcript recording.
 *
 * ## What is checked, and what is trusted
 *
 * CHECKED at load: that the file decodes to an object, that it carries the four
 * envelope members, and that its `transcript` carries EVERY member of
 * {@link TRANSCRIPT_MEMBERS} — so a fixture that has fallen behind the
 * pipeline's `Pick` fails loudly here rather than replaying a call that
 * silently produces `undefined` where the runtime produced a value.
 * `privateStateAfter` is the member that made this necessary: it is handed
 * straight back as a call's next private state, so a recording missing it would
 * have every call store nothing over a real private state, with a green suite.
 *
 * TRUSTED: the member VALUES. They are not re-validated shape by shape, because
 * this fixture is not caller input — it is minted from a real retained-era
 * execution and re-verified against a live one on every run of
 * `packages/protocol/src/test/era-record-coin-receiver.test.ts`, which is a
 * stronger guarantee than any structural check here could give.
 *
 * @returns The decoded recording.
 * @throws Error if the file does not decode to an object, or omits any member
 * the pipeline reads.
 */
export const loadCoinReceiverRecording = (): CoinReceiverRecording => {
  const raw: unknown = JSON.parse(
    readFileSync(hfFixturePath('coin-receiver-016', 'receive-coin-transcript.recording.json'), 'utf8')
  );
  const decoded = decodeRecorded(raw);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('the retained-era recording did not decode to an object');
  }

  const envelope: Record<string, unknown> = { ...decoded };
  for (const member of ['circuitId', 'coinPublicKey', 'contractAddress', 'receivedCoin', 'preState', 'transcript']) {
    if (!(member in envelope)) {
      throw new Error(`the retained-era recording omits '${member}'`);
    }
  }
  const transcript = envelope.transcript;
  if (typeof transcript !== 'object' || transcript === null) {
    throw new Error("the retained-era recording's 'transcript' did not decode to an object");
  }
  const transcriptMembers: Record<string, unknown> = { ...transcript };
  for (const member of TRANSCRIPT_MEMBERS) {
    if (!(member in transcriptMembers)) {
      throw new Error(
        `the retained-era recording's transcript omits '${member}', which the pipeline reads. Re-mint it ` +
          'with MINT_HF_FIXTURES=1 against packages/protocol/src/test/era-record-coin-receiver.test.ts.'
      );
    }
  }

  return decoded as CoinReceiverRecording;
};

/**
 * The opaque marker the doubled engine hands back from its down-convert.
 *
 * The pipeline is generic in the down-converted state and never looks inside
 * it, so a marker is all a replay needs — and the pipeline handing this exact
 * object back to `executeCircuit` is what proves it threaded the value through
 * rather than rebuilding one.
 */
export interface ReplayState {
  readonly replayedCircuitId: string;
}

/** Every era-facade and engine call one operation made, in the order it made them. */
export type OrchestrationLog = string[];

/**
 * What a caller additionally requires the pipeline to have handed the engine.
 *
 * The four members the double checks unconditionally are the ones the recording
 * itself pins. The PRIVATE STATE is not one of them — the recording carries no
 * private state to compare against — so a test that cares about it says so
 * here. Without this the engine answered on four of six inputs, and
 * `privateState: request.privateState` could be replaced with
 * `privateState: undefined` in the pipeline with the whole suite still green:
 * the recording replays regardless, `privateStateAfter` still comes back, and
 * the write-back still happens — against a DEFAULT state.
 */
export interface ReplayExpectations {
  /** The private state the pipeline must have handed the engine. */
  readonly privateState?: unknown;
  /**
   * The Zswap local state the CONSTRUCTOR arm answers with. Defaults to an
   * empty one — the ordinary constructor mints nothing — so a test that wants a
   * minting constructor says so here rather than the fixture pretending to one.
   */
  readonly constructorZswapLocalState?: ZswapLocalState;
}

/**
 * Builds the engine double: it replays {@link CoinReceiverRecording}, and
 * refuses to replay anything else.
 *
 * @param recording The committed recording to replay.
 * @param log The orchestration log to append each call to.
 * @param constructedState The serialized state the constructor arm replays —
 * the committed retained-era envelope for this same contract.
 * @param expectations What else the pipeline must have handed the engine.
 * @returns An engine satisfying the pipeline's slice at {@link ReplayState}.
 */
export const createReplayEngine = (
  recording: CoinReceiverRecording,
  log: OrchestrationLog,
  constructedState?: Uint8Array,
  expectations?: ReplayExpectations
): Ledger8ExecutionEngine<ReplayState> => ({
  downConvertForExecution: (state): ReplayState => {
    log.push('engine.downConvertForExecution');
    // THE REPLAY CONDITION. The recording is only replayed for the state it was
    // recorded against, so this double cannot answer for a state the real
    // runtime never ran on. It is also the assertion that carries the read
    // path: this value travelled from a committed on-chain envelope through the
    // era facade's own `extractState`, and it arrives structurally identical to
    // what the real retained runtime executed on.
    expect(state).toEqual(recording.preState);
    return { replayedCircuitId: recording.circuitId };
  },
  executeCircuit: (options): Ledger8Transcript<ReplayState> => {
    log.push('engine.executeCircuit');
    expect(options.circuitId).toBe(recording.circuitId);
    expect(options.args).toEqual([recording.receivedCoin]);
    expect(options.coinPk).toBe(recording.coinPublicKey);
    expect(options.state).toEqual({ replayedCircuitId: recording.circuitId });
    // The CONTRACT the pipeline threaded through, not merely that one was
    // passed: an engine handed some other object would otherwise replay
    // happily, because the recording answers regardless of what it is given.
    expect(Object.keys((options.contract as { readonly impureCircuits: object }).impureCircuits)).toContain(
      recording.circuitId
    );
    if (expectations !== undefined && 'privateState' in expectations) {
      expect(options.privateState).toEqual(expectations.privateState);
    }
    // The post-call state the real engine answers with is a live handle; the
    // double mints a marker DISTINCT from the down-converted one, so a test can
    // tell the state a call bound to from the state it ended on.
    return { ...recording.transcript, postContractState: { replayedCircuitId: `${recording.circuitId}:post` } };
  },
  // Reimplemented rather than delegated, deliberately: these suites test the
  // ORDER an operation touches the era and the engine in, and this package
  // holds no retained-runtime dependency to delegate through. The real
  // conversion is tested where it lives, in
  // `packages/protocol/src/test/v9-operations.test.ts`.
  reexpressOperationsForCurrentEra: (entryPoints): Uint8Array => {
    log.push('engine.reexpressOperationsForCurrentEra');
    const state = new ContractState();
    for (const entryPoint of entryPoints) {
      if (entryPoint.verifierKey === undefined) {
        continue;
      }
      const operation = new ContractOperation();
      operation.verifierKey = entryPoint.verifierKey;
      state.setOperation(entryPoint.circuitId, operation);
    }
    return state.serialize();
  },
  executeConstructor: (): Ledger8ConstructedState => {
    log.push('engine.executeConstructor');
    if (constructedState === undefined) {
      throw new Error('this replay engine was not given a constructed state to replay');
    }
    return {
      // The committed retained-era envelope for this same contract, which is a
      // real serialized retained `ContractState` built from the real
      // constructor's own primary state. It already DECLARES `receive_coin`, so
      // a deploy composed from it must be given a key map naming exactly that
      // entry point — which is the validation the deploy composition performs.
      contractState: { serialize: (): Uint8Array => constructedState },
      privateState: {},
      zswapLocalState: expectations?.constructorZswapLocalState ?? {
        coinPublicKey: recording.coinPublicKey,
        currentIndex: 0n,
        inputs: [],
        outputs: []
      }
    };
  }
});

/**
 * Wraps a real era facade so every call onto it is logged, without changing
 * what it does.
 *
 * The era objects `loadLedgerEra` hands out are FROZEN, so they cannot be
 * spied on in place; and they must stay real, because the whole point of these
 * suites is that the recorded transcript composes on a genuine ledger. A
 * delegating wrapper is what gives the orchestration order an observable trace
 * while leaving every answer the era's own.
 *
 * Built as a plain object literal satisfying {@link LedgerEra} rather than as a
 * proxy or a cast, so the compiler checks the wrapper against the very
 * interface the pipeline consumes.
 *
 * @param era The real era facade.
 * @param log The orchestration log to append each call to. Entries name the
 * era that served the call (`era.v8.composeCallTx`), so a test spanning both
 * eras can pin WHICH one ran each step and not merely the step order.
 * @param onComposeCall Optional inspection of the call options, run before the
 * era composes them.
 * @returns A facade that logs and delegates.
 */
export const recordEraCalls = (
  era: LedgerEra,
  log: OrchestrationLog,
  onComposeCall?: (options: ComposeCallOptions) => void
): LedgerEra => ({
  version: era.version,
  extractState: (raw) => {
    log.push(`era.${era.version}.extractState`);
    return era.extractState(raw);
  },
  decodeContractState: (raw) => {
    log.push(`era.${era.version}.decodeContractState`);
    return era.decodeContractState(raw);
  },
  composeCallTx: (options) => {
    log.push(`era.${era.version}.composeCallTx`);
    onComposeCall?.(options);
    return era.composeCallTx(options);
  },
  // Logged like every other seam, so a test can count partitions: the pipeline
  // resolves the split once and hands the composer the result, and a second
  // entry here would mean that stopped being true.
  partitionCallTranscript: (options) => {
    log.push(`era.${era.version}.partitionCallTranscript`);
    return era.partitionCallTranscript(options);
  },
  composeDeployTx: (options) => {
    log.push(`era.${era.version}.composeDeployTx`);
    return era.composeDeployTx(options);
  }
});
