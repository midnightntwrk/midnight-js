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

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type CircuitContext,
  type CircuitResults,
  type CommunicationCommitmentData,
  type ConstructorResult,
  type ContractState,
  createCircuitContext,
  type EncodedZswapLocalState,
  type ZswapLocalState
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type AlignedValue,
  communicationCommitment,
  type ContractAction,
  type ContractCall,
  type PartitionedTranscript,
  type PreProof,
  sampleEncryptionPublicKey,
  type Transcript,
  ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as PlatformContractAddress from '@midnight-ntwrk/midnight-js-protocol/platform-js/effect/ContractAddress';
import { Transaction } from '@midnight-ntwrk/midnight-js-types';
import { Option } from 'effect';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createUnprovenLedgerCallTx, toLedgerContractState } from '../internal/utils/ledger-utils';

/** The compiled `shielded-map` contract, typed through the runtime's own exported generics. */
type ShieldedMapContract = {
  // The generated constructor takes the plain or the encoded Zswap local state; the runtime's own
  // constructor-context type admits only the encoded one.
  initialState: (args: {
    initialPrivateState: undefined;
    initialZswapLocalState: ZswapLocalState | EncodedZswapLocalState;
  }) => Promise<ConstructorResult<undefined>>;
  circuits: {
    deposit: (
      ctx: CircuitContext<undefined>,
      coin: { nonce: Uint8Array; color: Uint8Array; value: bigint }
    ) => Promise<CircuitResults<undefined, []>>;
  };
};

/** Narrows a `ContractAction` to the `ContractCall` member (as opposed to a deploy or maintenance update). */
const isContractCall = (action: ContractAction<PreProof>): action is ContractCall<PreProof> =>
  'guaranteedTranscript' in action;

/**
 * Normalizes a ledger value for plain-JSON comparison: bigints and byte arrays become strings,
 * `Map`/`Set` become tagged entry arrays. The container cases are required, not defensive:
 * `JSON.stringify` renders any `Map` as `{}`.
 *
 * @see docs/architecture/contracts-non-regression-golden-baselines.md
 */
const toPlainJson = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => {
      if (typeof v === 'bigint') return v.toString();
      if (v instanceof Uint8Array) return Buffer.from(v).toString('hex');
      if (v instanceof Map) return { __map: [...v.entries()] };
      if (v instanceof Set) return { __set: [...v] };
      return v;
    })
  );

const GAS_KEYS = ['bytesDeleted', 'bytesWritten', 'computeTime', 'readTime'] as const;

/** Every field of `Effects`, pinned as a set so an upstream rename fails here by name. */
const EFFECTS_KEYS = [
  'claimedContractCalls',
  'claimedNullifiers',
  'claimedShieldedReceives',
  'claimedShieldedSpends',
  'claimedUnshieldedSpends',
  'shieldedMints',
  'unshieldedInputs',
  'unshieldedMints',
  'unshieldedOutputs'
] as const;

/** The gas/cost-model fields as they appear in the `ContractCall` Debug string. */
const GAS_DEBUG_FIELDS = ['read_time', 'compute_time', 'bytes_written', 'bytes_deleted'] as const;

const REDACTED_COST_PLACEHOLDER = '<redacted-cost>';

/**
 * Matches one gas/cost-model field and the whole of its value. Two of the four render as formatted
 * durations (`read_time: 255.000us`), so a digits-only pattern would leave the fraction behind.
 *
 * @see docs/architecture/contracts-non-regression-golden-baselines.md
 */
const gasDebugFieldPattern = (field: string): RegExp => new RegExp(`\\b${field}: [0-9][^,}]*`, 'g');

/**
 * Replaces the four gas/cost-model values in a `ContractCall.toString(true)` Debug string with a
 * fixed placeholder. Redact only these four: everything else in the string is the point of the pin.
 *
 * @see docs/architecture/contracts-non-regression-golden-baselines.md
 */
const redactGasCostFields = (debugString: string): string =>
  GAS_DEBUG_FIELDS.reduce(
    (redacted, field) =>
      redacted.replace(gasDebugFieldPattern(field), `${field}: ${REDACTED_COST_PLACEHOLDER}`),
    debugString
  );

type GoldenFixture = {
  documentation: string;
  inputHashes: { note: string; files: Record<string, string> };
  fixedInputs: {
    note: string;
    contractAddress: string;
    coinPublicKey: string;
    circuitId: string;
    blockTimeSeconds: number;
    communicationCommitmentRand: string;
    coin: { nonce: string; color: string; value: string };
  };
  decodedContractState: { hex: string };
  observedAssembledCall: {
    guaranteedTranscript: { effects: Record<string, unknown>; program: unknown[] };
    communicationCommitment: string;
    toStringCompactNormalized: string;
  };
};

const FIXTURE_PATH = fileURLToPath(new URL('./resources/golden/v9-native-composition.json', import.meta.url));

const readFixture = (): GoldenFixture => {
  try {
    return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as GoldenFixture;
  } catch (error) {
    throw new Error(
      `cannot read the golden fixture at ${FIXTURE_PATH}. Regenerate it with ` +
        '`UPDATE_GOLDEN=1 yarn test src/test/non-regression-golden.test.ts`',
      { cause: error }
    );
  }
};

const fixture = readFixture();

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** The compiled artifacts every byte-pinned value in this file was captured from. */
const ARTIFACT_PATHS = [
  'packages/contracts/src/test/resources/compiled/shielded-map/contract/index.js',
  'packages/contracts/src/test/resources/compiled/shielded-map/keys/deposit.verifier'
] as const;

const hashArtifacts = (): Record<string, string> =>
  Object.fromEntries(
    ARTIFACT_PATHS.map((repoRelativePath) => {
      try {
        return [
          repoRelativePath,
          createHash('sha256').update(readFileSync(`${REPO_ROOT}${repoRelativePath}`)).digest('hex')
        ];
      } catch (error) {
        throw new Error(`cannot read golden fixture input artifact '${repoRelativePath}'`, { cause: error });
      }
    })
  );

/**
 * `UPDATE_GOLDEN=1` makes each stage record what it observed and write the fixture back instead of
 * asserting against it.
 *
 * @see docs/architecture/contracts-non-regression-golden-baselines.md
 */
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === '1';

const regenerated: Partial<Pick<GoldenFixture, 'decodedContractState' | 'observedAssembledCall'>> = {};

describe('v9-native call-tx composition: fixture inputs', () => {
  // Guards the fixture's INPUTS, in its own suite with no shared setup so it stays readable when
  // the stages' `beforeAll` is what broke.
  it('lists exactly the two compiled artifacts the fixture was captured from', () => {
    expect(Object.keys(fixture.inputHashes.files).sort()).toEqual([...ARTIFACT_PATHS].sort());
  });

  it.skipIf(UPDATE_GOLDEN)('was captured from the compiled artifacts still checked in here', () => {
    expect(hashArtifacts()).toEqual(fixture.inputHashes.files);
  });
});

/**
 * Non-regression baselines for `utils/ledger-utils.ts` (`createUnprovenLedgerCallTx`), captured
 * from a real `deposit` execution against the compiled `shielded-map` contract in
 * `resources/compiled/`. `unproven-call-tx.ts`, which delegates to it, is covered by
 * `unproven-call-tx.test.ts` and is not exercised here.
 *
 * What each stage pins, what it excludes, the known blind spots, how to regenerate the fixture and
 * how to triage a failure:
 * @see docs/architecture/contracts-non-regression-golden-baselines.md
 */
describe('v9-native call-tx composition: non-regression golden fixtures', () => {
  const COMPILED_VERIFIER_KEY = new Uint8Array(
    readFileSync(new URL('./resources/compiled/shielded-map/keys/deposit.verifier', import.meta.url))
  );

  let shieldedInitialState: ContractState;
  let transcript: Transcript<AlignedValue>;
  let privateTranscriptOutputs: AlignedValue[];
  let input: AlignedValue;
  let output: AlignedValue;

  beforeAll(async () => {
    setNetworkId('testnet');

    const { contractAddress, coinPublicKey, circuitId, coin, blockTimeSeconds } = fixture.fixedInputs;

    const mod = (await import('./resources/compiled/shielded-map/contract/index.js')) as {
      Contract: new (witnesses: { dummy: (ctx: { privateState: undefined }) => [undefined, []] }) => ShieldedMapContract;
    };
    const shieldedContract = new mod.Contract({
      dummy: (ctx: { privateState: undefined }): [undefined, []] => [ctx.privateState, []]
    });

    const emptyZswap = { coinPublicKey, outputs: [], inputs: [], currentIndex: 0n };
    const initResult = await shieldedContract.initialState({
      initialPrivateState: undefined,
      initialZswapLocalState: emptyZswap
    });
    shieldedInitialState = initResult.currentContractState;
    const depositOperation = shieldedInitialState.operation(circuitId)!;
    depositOperation.verifierKey = COMPILED_VERIFIER_KEY;
    shieldedInitialState.setOperation(circuitId, depositOperation);

    // Passed explicitly (argument 9): `createCircuitContext` otherwise defaults the block time to
    // `Date.now()`.
    const ctx = createCircuitContext(
      circuitId,
      contractAddress,
      coinPublicKey,
      shieldedInitialState,
      undefined,
      undefined,
      undefined,
      undefined,
      blockTimeSeconds
    );
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

  afterAll(() => {
    if (!UPDATE_GOLDEN) return;
    const updated: GoldenFixture = {
      ...fixture,
      inputHashes: { ...fixture.inputHashes, files: hashArtifacts() },
      decodedContractState: regenerated.decodedContractState ?? fixture.decodedContractState,
      observedAssembledCall: regenerated.observedAssembledCall ?? fixture.observedAssembledCall
    };
    writeFileSync(FIXTURE_PATH, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  });

  /** The single `ContractCall` the assembled transaction must contain, with the counts asserted. */
  const soleContractCallOf = (tx: ReturnType<typeof createUnprovenLedgerCallTx>): ContractCall<PreProof> => {
    const intents = [...(tx.intents?.values() ?? [])];
    expect(intents, 'one input call should produce exactly one intent').toHaveLength(1);
    const { actions } = intents[0]!;
    expect(actions, 'one input call should produce exactly one action').toHaveLength(1);
    const [action] = actions;
    if (!action || !isContractCall(action)) {
      throw new Error(`expected a ContractCall, got ${action?.constructor?.name ?? String(action)}`);
    }
    return action;
  };

  it('stage 1: the decoded contract state matches the checked-in golden hex (deterministic)', () => {
    // The pinned hex begins `midnight:contract-state[v8]:`; that `[v8]` is the serialized object's
    // schema version, not a ledger era.
    const ledgerState = toLedgerContractState(shieldedInitialState);
    const actualHex = Buffer.from(ledgerState.serialize()).toString('hex');

    regenerated.decodedContractState = { hex: actualHex };
    if (!UPDATE_GOLDEN) expect(actualHex).toBe(fixture.decodedContractState.hex);
  });

  describe('stages 2 and 3: the call createUnprovenLedgerCallTx actually assembled', () => {
    /** Assembles the single call bound to a fixed communication commitment. */
    const assembleBoundCall = (): ContractCall<PreProof> => {
      const { contractAddress, circuitId, coinPublicKey, communicationCommitmentRand } = fixture.fixedInputs;
      const platformAddress = PlatformContractAddress.ContractAddress(contractAddress);
      const partitioned: PartitionedTranscript = [transcript, undefined];
      // Production reads only `commCommRand` off this option; `commComm` is carried for shape.
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
              partitionedTranscript: partitioned
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

      return soleContractCallOf(tx);
    };

    it('stage 2: the guaranteed transcript and commitment on the assembled call match the golden fixture (gas is shape-checked, see comment)', () => {
      const { communicationCommitmentRand } = fixture.fixedInputs;
      const action = assembleBoundCall();
      const guaranteed = action.guaranteedTranscript;
      expect(guaranteed).toBeDefined();
      // Our single partitioned transcript is guaranteed, not fallible, so a swapped slot fails here.
      expect(action.fallibleTranscript).toBeUndefined();

      expect(Object.keys(guaranteed!.effects).sort()).toEqual([...EFFECTS_KEYS].sort());

      const actualEffectsAndProgram = toPlainJson({
        effects: guaranteed!.effects,
        program: guaranteed!.program
      }) as GoldenFixture['observedAssembledCall']['guaranteedTranscript'];

      // Re-derived through the ledger's own function. Pins `input`, `output` and the bound
      // randomness, which nothing else on the assembled call observes. It cannot detect the two
      // being transposed for this circuit -- see the blind spots in the doc referenced above.
      const actualCommitment = action.communicationCommitment;
      expect(actualCommitment).toBe(communicationCommitment(input, output, communicationCommitmentRand));

      // Shape only: the four expected keys, each a non-negative bigint.
      const gas = guaranteed!.gas;
      expect(Object.keys(gas).sort()).toEqual([...GAS_KEYS].sort());
      for (const key of GAS_KEYS) {
        expect(gas[key], key).toBeTypeOf('bigint');
        expect(gas[key], key).toBeGreaterThanOrEqual(0n);
      }

      regenerated.observedAssembledCall = {
        ...(regenerated.observedAssembledCall ?? fixture.observedAssembledCall),
        guaranteedTranscript: actualEffectsAndProgram,
        communicationCommitment: actualCommitment
      };
      if (UPDATE_GOLDEN) return;
      expect(actualEffectsAndProgram).toEqual(fixture.observedAssembledCall.guaranteedTranscript);
      expect(actualCommitment).toBe(fixture.observedAssembledCall.communicationCommitment);
    });

    it("stage 3: the assembled call's own observable fields match the golden Debug snapshot, gas cost fields redacted (deterministic)", () => {
      // `toString(compact)` is the only aggregate view of this call's own fields. It shows
      // `communication_commitment` and `proof` as placeholders (stage 2 asserts the commitment
      // itself); `key_location`, `op` and `privateTranscriptOutputs` do not appear here at all.
      const action = assembleBoundCall();
      const raw = action.toString(true);

      // Assert each target occurs exactly once before redacting, so a renamed, dropped or
      // non-numeric field fails by name instead of the replace silently matching nothing.
      for (const field of GAS_DEBUG_FIELDS) {
        expect(raw.match(gasDebugFieldPattern(field)) ?? [], field).toHaveLength(1);
      }

      const normalized = redactGasCostFields(raw);

      regenerated.observedAssembledCall = {
        ...(regenerated.observedAssembledCall ?? fixture.observedAssembledCall),
        toStringCompactNormalized: normalized
      };
      if (!UPDATE_GOLDEN) expect(normalized).toBe(fixture.observedAssembledCall.toStringCompactNormalized);
    });
  });

  describe('stage 4: the assembled unproven transaction (structural only -- carries fresh randomness)', () => {
    it('is a real Transaction with exactly the one intent and action our single call produces', () => {
      const { contractAddress, circuitId, coinPublicKey } = fixture.fixedInputs;
      const platformAddress = PlatformContractAddress.ContractAddress(contractAddress);
      const partitioned: PartitionedTranscript = [transcript, undefined];

      const tx = createUnprovenLedgerCallTx(
        [
          {
            contractAddress: platformAddress,
            circuitId,
            public: {
              contractState: shieldedInitialState.data.state,
              publicTranscript: [],
              partitionedTranscript: partitioned
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

      // `Transaction` is imported from the module production returns it from, so this checks the
      // value's class rather than two modules' copies agreeing.
      expect(tx).toBeInstanceOf(Transaction);

      const action = soleContractCallOf(tx);

      // The deposit circuit claims exactly one shielded receive and no shielded spends.
      const effects = action.guaranteedTranscript?.effects;
      expect(effects).toBeDefined();
      expect([...effects!.claimedShieldedReceives]).toHaveLength(1);
      expect([...effects!.claimedShieldedSpends]).toHaveLength(0);
    });
  });
});
