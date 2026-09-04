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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type CommunicationCommitmentData, type ContractState, createCircuitContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type AlignedValue,
  communicationCommitment,
  type ContractAction,
  type ContractCall,
  type PartitionedTranscript,
  type PreProof,
  sampleEncryptionPublicKey,
  Transaction,
  type Transcript,
  ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as PlatformContractAddress from '@midnight-ntwrk/midnight-js-protocol/platform-js/effect/ContractAddress';
import { Option } from 'effect';
import { beforeAll, describe, expect, it } from 'vitest';

import { createUnprovenLedgerCallTx, toLedgerContractState } from '../utils/ledger-utils';

type CircuitRunEffects = Transcript<AlignedValue>['effects'];

type CircuitRunResult = {
  context: {
    callContext: { currentQueryContext: { effects: CircuitRunEffects } };
    callProofDataTrace: {
      publicTranscript: Transcript<AlignedValue>['program'];
      privateTranscriptOutputs: AlignedValue[];
      input: AlignedValue;
      output: AlignedValue;
    }[];
  };
  gasCost: Transcript<AlignedValue>['gas'];
};

type ShieldedMapContract = {
  initialState: (args: unknown) => Promise<{ currentContractState: ContractState }>;
  circuits: { deposit: (ctx: unknown, coin: unknown) => Promise<CircuitRunResult> };
};

/** Narrows a `ContractAction` to the `ContractCall` member (as opposed to a deploy or maintenance update). */
const isContractCall = (action: ContractAction<PreProof>): action is ContractCall<PreProof> =>
  'guaranteedTranscript' in action;

/** Normalizes bigints and byte arrays to strings so `Transcript` effects/program are plain-JSON comparable. */
const toPlainJson = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_key, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v instanceof Uint8Array ? Buffer.from(v).toString('hex') : v
    )
  );

const GAS_KEYS = ['bytesDeleted', 'bytesWritten', 'computeTime', 'readTime'] as const;

const REDACTED_COST_PLACEHOLDER = '<redacted-cost>';

/**
 * Redacts the four gas/cost-model fields (`read_time`, `compute_time`, `bytes_written`,
 * `bytes_deleted`) out of a `ContractCall.toString(true)` Debug string, replacing each
 * value with a fixed placeholder. These are cost-model numbers, not composition output --
 * they move on every ledger-v9/onchain-runtime/compact-runtime bump regardless of whether
 * composition behaviour changed, and `compute_time` in particular is a wall-clock-derived
 * figure, the single most architecture- and load-sensitive value in the whole fixture.
 * Redacting only these four fields (not the whole Debug string) keeps everything else this
 * stage exists to guard -- the entry point, the contract address, and the transcript
 * structure -- byte-exact. Do not widen this redaction to cover more of the string: that is
 * exactly the "tightening" this comment exists to prevent.
 */
const redactGasCostFields = (debugString: string): string =>
  debugString
    .replace(/read_time: [^,}]+/g, `read_time: ${REDACTED_COST_PLACEHOLDER}`)
    .replace(/compute_time: [^,}]+/g, `compute_time: ${REDACTED_COST_PLACEHOLDER}`)
    .replace(/bytes_written: [^,}]+/g, `bytes_written: ${REDACTED_COST_PLACEHOLDER}`)
    .replace(/bytes_deleted: [^,}]+/g, `bytes_deleted: ${REDACTED_COST_PLACEHOLDER}`);

type GoldenFixture = {
  fixedInputs: {
    contractAddress: string;
    coinPublicKey: string;
    circuitId: string;
    communicationCommitmentRand: string;
    coin: { nonce: string; color: string; value: string };
  };
  decodedContractState: { hex: string };
  observedAssembledCall: {
    guaranteedTranscript: { effects: unknown; program: unknown };
    toStringCompactNormalized: string;
  };
};

/**
 * Non-regression baselines for the v9-native call-tx composition path:
 * `unproven-call-tx.ts` -> `utils/ledger-utils.ts` (`createUnprovenLedgerCallTx`).
 *
 * This suite drives a REAL execution of the `deposit` circuit against the compiled
 * `shielded-map` contract already checked into `resources/compiled/shielded-map/` (the
 * same contract and circuit `utils/ledger-utils.test.ts` already exercises for its
 * `receiveShielded` regression coverage). Nothing here invents a contract or compiles
 * anything new.
 *
 * Stage 1 (the decoded contract state) calls `toLedgerContractState` -- real production code
 * -- directly. Stages 2 and 3 call the real `createUnprovenLedgerCallTx` and then read the
 * assembled call back off its returned `tx.intents` (the same seam stage 4 uses): that is
 * deliberate, not incidental -- a golden value built by reproducing the function's own
 * argument list, instead of reading what the function actually produced, would still pass
 * byte-identically after a change to that argument list (e.g. swapping which partitioned
 * transcript is "guaranteed" vs. "fallible"), because it never calls the function it claims
 * to guard. Every stage below observes a real return value.
 *
 * To make stages 2 and 3 deterministic, the single call they assemble is given an explicit,
 * fixed communication commitment (`fixedInputs.communicationCommitmentRand`) -- exactly what
 * production code does for an already-bound sub-call (see
 * `utils/ledger-utils.test.ts`'s "reuses a sub-call communication commitment" coverage) --
 * rather than leaving it unbound, which would sample fresh randomness on every run. Stage 4
 * assembles the same call left unbound, as the real (non-cross-contract) production path
 * always does, and asserts only its structure for exactly that reason.
 *
 * When this gate legitimately fires:
 * - if `packages/contracts` itself changed and the change is intended, regenerate
 *   `resources/golden/v9-native-composition.json` and land that as its own commit, with no
 *   other production change riding along;
 * - if only a dependency version moved (`@midnightntwrk/ledger-v9`, `onchain-runtime`,
 *   `compact-runtime` -- check `package.json`/the resolutions pin for the same window), the
 *   fixture's bytes are expected to move with it and regenerating is the correct response;
 * - if NEITHER of those moved, this is a regression: investigate before regenerating, since
 *   regenerating a fixture over a genuine regression makes the regression permanent.
 */
describe('v9-native call-tx composition: non-regression golden fixtures', () => {
  const FIXTURE_PATH = fileURLToPath(new URL('./resources/golden/v9-native-composition.json', import.meta.url));
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as GoldenFixture;

  const DUMMY_VERIFIER_KEY = new Uint8Array(
    readFileSync(new URL('./resources/compiled/shielded-map/keys/deposit.verifier', import.meta.url))
  );

  let shieldedInitialState: ContractState;
  let transcript: Transcript<AlignedValue>;
  let privateTranscriptOutputs: AlignedValue[];
  let input: AlignedValue;
  let output: AlignedValue;

  beforeAll(async () => {
    setNetworkId('testnet');

    const { contractAddress, coinPublicKey, circuitId, coin } = fixture.fixedInputs;

    const mod = (await import('./resources/compiled/shielded-map/contract/index.js')) as {
      Contract: new (witnesses: unknown) => ShieldedMapContract;
    };
    const shieldedContract = new mod.Contract({
      dummy: (ctx: { privateState: undefined }) => [ctx.privateState, []]
    });

    const emptyZswap = { coinPublicKey, outputs: [], inputs: [], currentIndex: 0n };
    const initResult = await shieldedContract.initialState({
      initialPrivateState: undefined,
      initialZswapLocalState: emptyZswap
    });
    shieldedInitialState = initResult.currentContractState;
    const depositOperation = shieldedInitialState.operation(circuitId)!;
    depositOperation.verifierKey = DUMMY_VERIFIER_KEY;
    shieldedInitialState.setOperation(circuitId, depositOperation);

    const ctx = createCircuitContext(circuitId, contractAddress, coinPublicKey, shieldedInitialState, undefined);
    const coinArg = {
      nonce: Uint8Array.from(Buffer.from(coin.nonce, 'hex')),
      color: Uint8Array.from(Buffer.from(coin.color, 'hex')),
      value: BigInt(coin.value)
    };
    const { context, gasCost } = await shieldedContract.circuits.deposit(ctx, coinArg);
    const proofData = context.callProofDataTrace[context.callProofDataTrace.length - 1]!;

    transcript = {
      gas: gasCost,
      effects: context.callContext.currentQueryContext.effects,
      program: proofData.publicTranscript
    };
    privateTranscriptOutputs = proofData.privateTranscriptOutputs;
    input = proofData.input;
    output = proofData.output;
  });

  it('stage 1: the decoded contract state matches the checked-in golden hex (deterministic)', () => {
    const ledgerState = toLedgerContractState(shieldedInitialState);
    const actualHex = Buffer.from(ledgerState.serialize()).toString('hex');

    expect(actualHex).toBe(fixture.decodedContractState.hex);
  });

  describe('stages 2 and 3: the call createUnprovenLedgerCallTx actually assembled (observed via tx.intents, not reproduced)', () => {
    /**
     * Calls the real, unmodified `createUnprovenLedgerCallTx` with our single call bound to a
     * fixed communication commitment, and returns the one `ContractCall` it assembled --
     * exactly what a later reader of `tx.intents` would see. This is a genuine call into
     * `packages/contracts` production code; nothing here reconstructs its internals.
     */
    const assembleBoundCall = (): ContractCall<PreProof> => {
      const { contractAddress, circuitId, coinPublicKey, communicationCommitmentRand } = fixture.fixedInputs;
      const platformAddress = PlatformContractAddress.ContractAddress(contractAddress);
      const boundCommitment: Option.Option<CommunicationCommitmentData> = Option.some({
        commCommRand: communicationCommitmentRand,
        commComm: communicationCommitment(input, output, communicationCommitmentRand)
      });

      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: platformAddress,
            circuitId,
            public: {
              contractState: shieldedInitialState.data.state,
              publicTranscript: [],
              partitionedTranscript: [transcript, undefined] as PartitionedTranscript
            },
            private: { input, output, privateTranscriptOutputs },
            communicationCommitment: boundCommitment
          }
        ],
        () => shieldedInitialState,
        new ZswapChainState(),
        { outputs: [], inputs: [], coinPublicKey, currentIndex: 0n },
        sampleEncryptionPublicKey()
      );

      const [action] = tx.intents?.values().next().value?.actions ?? [];
      if (!action || !isContractCall(action)) throw new Error('expected the single action to be a ContractCall');
      return action;
    };

    it('stage 2: the guaranteed transcript attached to the assembled call matches the golden fixture (deterministic; gas is shape-checked only, see comment)', () => {
      const action = assembleBoundCall();
      const guaranteed = action.guaranteedTranscript;
      expect(guaranteed).toBeDefined();
      // Also structural evidence for stage 2: our single partitioned transcript is guaranteed,
      // not fallible, so a regression that swapped which partitioned-transcript slot is
      // "guaranteed" vs. "fallible" during assembly would surface here as a routing failure,
      // not just a content mismatch.
      expect(action.fallibleTranscript).toBeUndefined();

      const actualEffectsAndProgram = toPlainJson({ effects: guaranteed!.effects, program: guaranteed!.program });
      expect(actualEffectsAndProgram).toEqual(fixture.observedAssembledCall.guaranteedTranscript);

      // gas (readTime/computeTime/bytesWritten/bytesDeleted, all picosecond- or byte-scale
      // cost-model numbers) is deliberately NOT byte-pinned: it moves on every
      // ledger-v9/onchain-runtime/compact-runtime bump regardless of whether composition
      // behaviour changed, and it is the most architecture-sensitive value here (CI may not
      // run the same CPU architecture as the machine that captured the fixture). Assert only
      // its shape: the four expected keys are present, each a non-negative bigint.
      const gas = guaranteed!.gas;
      expect(Object.keys(gas).sort()).toEqual([...GAS_KEYS].sort());
      for (const key of GAS_KEYS) {
        const value = gas[key];
        expect(typeof value).toBe('bigint');
        expect(/^\d+$/.test(value.toString())).toBe(true);
      }
    });

    it("stage 3: the assembled call's own observable fields (address, entry point, transcripts) match the golden Debug snapshot, gas cost fields redacted (deterministic)", () => {
      // `ContractCall.toString(compact)` is the only way to observe this object's own fields
      // (there are typed getters for address/entryPoint/transcripts individually, but no
      // aggregate snapshot besides this Debug repr, and pinning it also covers any field this
      // suite does not separately assert). It intentionally redacts `communication_commitment`
      // and `proof` (shown as opaque `<commitment>`/`<proof>` placeholders) rather than real
      // values, so this pin does not depend on the commitment's own field encoding.
      //
      // The four gas/cost-model fields nested inside it (read_time, compute_time,
      // bytes_written, bytes_deleted) are ALSO redacted before comparison, via
      // `redactGasCostFields` -- see that function's own comment for why: they are the same
      // cost-model numbers stage 2 already asserts only the shape of, and pinning them here
      // too would silently reintroduce exactly the failure mode this suite's `gas`
      // shape-only assertion exists to remove.
      //
      // What this CANNOT observe: `ContractCallPrototype`'s `key_location` argument (see
      // `ledger-utils.ts`'s `createUnprovenLedgerCallTx`) has no counterpart on the assembled
      // `ContractCall` -- confirmed empirically, it does not appear in this Debug repr. A
      // regression that dropped a field from the key-location encoding would not be caught by
      // this fixture; it would only surface later, at proving time, when a prover fails to
      // resolve the verifier key by that location. That gap is a known, accepted limit of an
      // "unproven"-transaction-only suite, not an oversight.
      const action = assembleBoundCall();
      const normalized = redactGasCostFields(action.toString(true));

      // Assert the redaction actually fired: if the Debug format ever stopped emitting these
      // four fields (or renamed them), the `replace` calls above would silently match nothing,
      // and this test would keep comparing (and passing) without pinning anything meaningful.
      // Exactly one occurrence of each of the four fields is expected in this fixture (a
      // single call with a guaranteed transcript and no fallible transcript).
      const placeholderCount = normalized.split(REDACTED_COST_PLACEHOLDER).length - 1;
      expect(placeholderCount).toBe(4);

      expect(normalized).toBe(fixture.observedAssembledCall.toStringCompactNormalized);
    });
  });

  describe('stage 4: the assembled unproven transaction (structural only -- carries fresh randomness)', () => {
    const buildTransaction = () => {
      const { contractAddress, circuitId, coinPublicKey } = fixture.fixedInputs;
      const platformAddress = PlatformContractAddress.ContractAddress(contractAddress);

      return createUnprovenLedgerCallTx(
        [
          {
            contractAddress: platformAddress,
            circuitId,
            public: {
              contractState: shieldedInitialState.data.state,
              publicTranscript: [],
              partitionedTranscript: [transcript, undefined] as PartitionedTranscript
            },
            private: { input, output, privateTranscriptOutputs },
            communicationCommitment: Option.none()
          }
        ],
        () => shieldedInitialState,
        new ZswapChainState(),
        { outputs: [], inputs: [], coinPublicKey, currentIndex: 0n },
        sampleEncryptionPublicKey()
      );
    };

    it('is a real Transaction with exactly the one intent and action our single call produces', () => {
      const tx = buildTransaction();

      // Structural, not byte, assertions: Transaction.fromPartsRandomized samples fresh
      // binding randomness on every call, so no field derived from it is reproducible.
      expect(tx).toBeInstanceOf(Transaction);
      expect(tx.intents?.size).toBe(1);

      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();

      const actions = intent!.actions;
      expect(actions).toHaveLength(1);

      const [action] = actions;
      if (!action || !isContractCall(action)) throw new Error('expected the single action to be a ContractCall');

      // Structural: the deposit circuit's guaranteed transcript claims exactly one shielded
      // receive (the deposited coin) and no shielded spends. Only the count is checked, not
      // the receive's own commitment bytes -- those are unaffected by the randomness above,
      // but pinning them here would blur the line between this structural stage and stage
      // 2's already byte-pinned transcript.
      const effects = action.guaranteedTranscript?.effects;
      expect(effects).toBeDefined();
      expect([...effects!.claimedShieldedReceives]).toHaveLength(1);
      expect([...effects!.claimedShieldedSpends]).toHaveLength(0);
    });

    it('samples fresh communication-commitment randomness for the unbound root call on every assembly (documents the missing injection seam)', () => {
      const rootActionOf = (tx: ReturnType<typeof buildTransaction>): ContractCall<PreProof> => {
        const [action] = tx.intents?.values().next().value?.actions ?? [];
        if (!action || !isContractCall(action)) throw new Error('expected the single action to be a ContractCall');
        return action;
      };

      // Structural: two independently assembled transactions from identical deterministic
      // inputs still differ, because the root call has no bound commitment and the function
      // samples fresh randomness for it every time. This is exactly why stages 2 and 3 above
      // must bind the call to a fixed commitment rather than leave it unbound like this.
      expect(rootActionOf(buildTransaction()).communicationCommitment).not.toEqual(
        rootActionOf(buildTransaction()).communicationCommitment
      );
    });
  });
});
