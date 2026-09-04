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
 * Mints AND guards the three `coin-receiver-016` fixtures that a coin-moving
 * call needs downstream: a recording of the transcript the real retained-era
 * runtime produces for `receive_coin`, and the two contract-state envelopes
 * that same call is dispatched against, one per era.
 *
 * ## Why the mint lives in a test rather than in `generators/`
 *
 * The generator scripts are plain Node `.mjs` and cannot reach
 * `executeCircuit`, which is TypeScript source inside this package; and the
 * compiled fixture module opens with `checkRuntimeVersion('0.16.0')`, so it
 * only loads where the retained alias is substituted for the bare
 * `@midnight-ntwrk/compact-runtime` specifier. Both are already solved here,
 * by `vi.mock`, which is exactly how `counter-016/increment-transcript.golden.json`
 * was minted -- "directly from `v8-execute.test.ts`'s own real execution", per
 * the fixture README. This file follows that precedent rather than inventing a
 * second provenance story.
 *
 * ## The one substitution made to the recorded data, and why
 *
 * `partitionContext.block` carries the wall clock the glue stamps when the
 * circuit context is built, and `executeCircuit` does not take a clock. A
 * recording that kept it would be a different file on every run, so
 * `secondsSinceEpoch` and `lastBlockTime` are replaced with the two fixed
 * values below. NOTHING ELSE is substituted: every other member is the real
 * runtime's own output. The `it` blocks assert both halves of that claim --
 * that the recording matches a live execution everywhere except those two
 * fields, and that the recording still composes on both eras with them frozen.
 *
 * Run with `MINT_HF_FIXTURES=1` to (re)write the three files; without it this
 * suite only guards them.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import type { ConstructorContext } from 'compact-runtime-ledger8';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { assembleCallPrototype } from '../lib/shared/assemble-call';
import type { PartitionContext } from '../lib/shared/compose-types';
import type { LedgerVersion } from '../lib/shared/ledger-version';
import { executeCircuit, type Ledger8ContractLike, type TranscriptPojo } from '../lib/v8/execute';
import { fixturePath, readHexFixture } from './fixtures';

// The fixture module asserts `checkRuntimeVersion('0.16.0')` against a bare
// `@midnight-ntwrk/compact-runtime` import, so the specifier is redirected to
// the retained alias for this file only -- the same redirect
// `v8-execute.test.ts` and `era-partition-received-coin.test.ts` use.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

const CIRCUIT_ID = 'receive_coin';
const SAMPLE_COIN_PUBLIC_KEY = 'ca'.repeat(32);

// The two frozen clock values. Chosen as round numbers rather than as any real
// block's time: nothing downstream reads them for meaning, and the assertions
// below prove the composition does not depend on their being recent.
const FROZEN_SECONDS_SINCE_EPOCH = 1_700_000_000n;
const FROZEN_LAST_BLOCK_TIME = 0n;

// The coin the circuit receives. Fixed, so the recording is reproducible.
const RECEIVED_COIN = { nonce: new Uint8Array(32).fill(0x07), color: new Uint8Array(32).fill(0), value: 42n };

/**
 * THE STAND-IN VERIFIER KEY, AND IT IS A STAND-IN.
 *
 * `coin-receiver-016` ships no `keys/` -- nothing in this repo proves against
 * it -- so both state envelopes register `twin-contract`'s `increment.verifier`
 * under `receive_coin`. That key belongs to a DIFFERENT circuit. It is used
 * here only because a `ContractOperation`'s setter validates a real, tagged
 * verifier-key blob and rejects arbitrary bytes, so the slot cannot be filled
 * with a placeholder.
 */
const STAND_IN_VERIFIER_KEY = readFileSync(fixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'));

const RECORDING_PATH = fixturePath('coin-receiver-016', 'receive-coin-transcript.recording.json');
const STATE_V6_NAME = 'coin-receiver-016/state-v6-envelope.hex';
const STATE_V9_NAME = 'coin-receiver-016/state-v9.hex';
const STATE_V6_PATH = fixturePath(STATE_V6_NAME);
const STATE_V9_PATH = fixturePath(STATE_V9_NAME);

/** The slice of the compiled fixture module this suite drives. */
interface CompiledReceiverContract extends Ledger8ContractLike {
  initialState(constructorContext: ConstructorContext<Record<string, never>>): {
    currentContractState: { data: ocrt3.ChargedState };
  };
}

interface CompiledReceiverModule {
  readonly Contract: new (witnesses: Record<string, never>) => CompiledReceiverContract;
}

/**
 * The JSON encoding the recording uses: every non-JSON value kind is wrapped in
 * a SINGLE-KEY tagged object.
 *
 * Deliberately NOT the `` `${n}n` ``/bare-hex convention
 * `increment-transcript.golden.json` uses. That golden is only ever compared,
 * never decoded, so an encoding that cannot tell a hex-encoded byte string from
 * a string that merely looks like one costs it nothing. This recording IS
 * decoded -- and `partitionContext.block.parentBlockHash` is a genuine hex
 * STRING sitting beside genuine byte arrays -- so the encoding has to be
 * unambiguous in both directions.
 */
const encodeRecorded = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return { __bigint: value.toString() };
  }
  if (value instanceof Uint8Array) {
    return { __bytes: Buffer.from(value).toString('hex') };
  }
  if (value instanceof Map) {
    return { __map: [...value].map(([key, entry]) => [encodeRecorded(key), encodeRecorded(entry)]) };
  }
  if (Array.isArray(value)) {
    return value.map(encodeRecorded);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeRecorded(entry)]));
  }
  return value;
};

/** Replaces the two non-deterministic clock members; documented at the top of this file. */
const freezeClock = (partitionContext: PartitionContext): PartitionContext => ({
  block: {
    ...partitionContext.block,
    secondsSinceEpoch: FROZEN_SECONDS_SINCE_EPOCH,
    lastBlockTime: FROZEN_LAST_BLOCK_TIME
  },
  effects: partitionContext.effects,
  comIndices: partitionContext.comIndices
});

interface RealExecution {
  readonly transcript: TranscriptPojo;
  readonly preState: ledgerV9.EncodedStateValue;
  readonly initialData: ocrt3.ChargedState;
}

const runReceiveCoin = async (): Promise<RealExecution> => {
  const { Contract } = (await import(
    /* @vite-ignore */ fixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
  )) as CompiledReceiverModule;
  const ledger8Runtime = await import('compact-runtime-ledger8');
  const contract = new Contract({});
  const initial = contract.initialState(ledger8Runtime.createConstructorContext({}, SAMPLE_COIN_PUBLIC_KEY));

  const transcript = executeCircuit(
    {
      contract,
      circuitId: CIRCUIT_ID,
      args: [RECEIVED_COIN],
      state: { data: initial.currentContractState.data },
      address: ocrt3.dummyContractAddress(),
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    },
    ledger8Runtime
  );

  return {
    transcript,
    preState: transcript.preContractState.data.state.encode(),
    initialData: initial.currentContractState.data
  };
};

/** The recording's own shape. Every member is the real execution's output. */
const buildRecording = (execution: RealExecution): unknown => {
  const { transcript, preState } = execution;
  return {
    documentation:
      'Recording of the transcript the real retained-era (compact-runtime@0.16) runtime produces for ' +
      "coin-receiver-016's receive_coin circuit, minted by real execution from " +
      'packages/protocol/src/test/era-record-coin-receiver.test.ts. Values are tagged: {"__bigint"}, ' +
      '{"__bytes"} (lower-case hex) and {"__map"}. partitionContext.block.secondsSinceEpoch and ' +
      '.lastBlockTime are the only substituted members -- the runtime stamps a wall clock there and ' +
      'executeCircuit takes no clock, so they are frozen to make the recording reproducible. Everything ' +
      'else is the runtime\'s own output. Regenerate with MINT_HF_FIXTURES=1.',
    circuitId: transcript.circuitId,
    coinPublicKey: SAMPLE_COIN_PUBLIC_KEY,
    contractAddress: ocrt3.dummyContractAddress(),
    receivedCoin: encodeRecorded(RECEIVED_COIN),
    preState: encodeRecorded(preState),
    transcript: {
      circuitId: transcript.circuitId,
      result: encodeRecorded(transcript.result),
      input: encodeRecorded(transcript.input),
      output: encodeRecorded(transcript.output),
      publicTranscript: encodeRecorded(transcript.publicTranscript),
      privateTranscriptOutputs: encodeRecorded(transcript.privateTranscriptOutputs),
      partitionContext: encodeRecorded(freezeClock(transcript.partitionContext)),
      zswapLocalState: encodeRecorded(transcript.zswapLocalState)
    }
  };
};

/** The retained-era (`contract-state[v6]`) envelope the v8-native arm dispatches against. */
const mintV6Envelope = (execution: RealExecution): Uint8Array => {
  const contractState = new ocrt3.ContractState();
  contractState.data = execution.initialData;
  const operation = new ocrt3.ContractOperation();
  operation.verifierKey = STAND_IN_VERIFIER_KEY;
  contractState.setOperation(CIRCUIT_ID, operation);
  return contractState.serialize();
};

/** The current-era (`contract-state[v8]`) envelope the keep-state arm dispatches against. */
const mintV9Envelope = (execution: RealExecution): Uint8Array => {
  const contractState = new ledgerV9.ContractState();
  contractState.data = new ledgerV9.ChargedState(ledgerV9.StateValue.decode(execution.preState));
  const operation = new ledgerV9.ContractOperation();
  operation.verifierKey = STAND_IN_VERIFIER_KEY;
  contractState.setOperation(CIRCUIT_ID, operation);
  return contractState.serialize();
};

const ERAS = ['v8', 'v9'] as const;

// One assembly per era, each against its own module and its own state, because
// the two `ContractState` types are distinct nominal WASM classes -- the same
// reason `era-partition-received-coin.test.ts` writes a thunk per arm.
const ARMS: Readonly<
  Record<LedgerVersion, (transcript: TranscriptPojo, partitionContext: PartitionContext, preState: ledgerV9.EncodedStateValue) => unknown>
> = {
  v8: (transcript, partitionContext, preState) => {
    const contractState = LedgerV8.ContractState.deserialize(readHexFixture(STATE_V6_NAME));
    return assembleCallPrototype(LedgerV8, {
      circuitId: CIRCUIT_ID,
      contractAddress: ocrt3.dummyContractAddress(),
      transcript: { kind: 'unpartitioned', preState, publicTranscript: transcript.publicTranscript, partitionContext },
      privateTranscriptOutputs: transcript.privateTranscriptOutputs,
      input: transcript.input,
      output: transcript.output,
      operations: contractState,
      stage: 'call-operation',
      version: 'v8'
    });
  },
  v9: (transcript, partitionContext, preState) => {
    const contractState = ledgerV9.ContractState.deserialize(readHexFixture(STATE_V9_NAME));
    return assembleCallPrototype(ledgerV9, {
      circuitId: CIRCUIT_ID,
      contractAddress: ocrt3.dummyContractAddress(),
      transcript: { kind: 'unpartitioned', preState, publicTranscript: transcript.publicTranscript, partitionContext },
      privateTranscriptOutputs: transcript.privateTranscriptOutputs,
      input: transcript.input,
      output: transcript.output,
      operations: contractState,
      stage: 'call-operation',
      version: 'v9'
    });
  }
};

describe('coin-receiver-016 fixtures: minted by real retained-era execution, then guarded', () => {
  let execution: RealExecution;

  beforeAll(async () => {
    execution = await runReceiveCoin();

    if (process.env.MINT_HF_FIXTURES === '1') {
      writeFileSync(RECORDING_PATH, `${JSON.stringify(buildRecording(execution), null, 2)}\n`, 'utf8');
      writeFileSync(STATE_V6_PATH, `${Buffer.from(mintV6Envelope(execution)).toString('hex')}\n`, 'utf8');
      writeFileSync(STATE_V9_PATH, `${Buffer.from(mintV9Envelope(execution)).toString('hex')}\n`, 'utf8');
    }
  });

  it('the committed recording is byte-for-byte what a live execution produces, once the clock is frozen', () => {
    const committed: unknown = JSON.parse(readFileSync(RECORDING_PATH, 'utf8'));

    expect(buildRecording(execution)).toEqual(committed);
  });

  it('the committed envelopes are the ones a live execution mints', () => {
    expect(Buffer.from(readHexFixture(STATE_V6_NAME)).toString('hex')).toBe(
      Buffer.from(mintV6Envelope(execution)).toString('hex')
    );
    expect(Buffer.from(readHexFixture(STATE_V9_NAME)).toString('hex')).toBe(
      Buffer.from(mintV9Envelope(execution)).toString('hex')
    );
  });

  it.each(ERAS)('the frozen-clock recording still composes on %s, so the substitution is not load-bearing', (version) => {
    expect(ARMS[version](execution.transcript, freezeClock(execution.transcript.partitionContext), execution.preState)).toBeDefined();
  });
});
