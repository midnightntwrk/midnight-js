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

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import type { ConstructorContext } from 'compact-runtime-ledger8';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ComposeFailedError, PROTOCOL_ERROR_CODES } from '../errors';
import { assembleCallPrototype } from '../lib/engine/assemble-call';
import { executeCircuit, type Ledger8ContractLike, type TranscriptPojo } from '../lib/engine/execute';
import type { PartitionContext } from '../lib/era/compose-types';
import type { LedgerVersion } from '../lib/ledger-version';
import { fixturePath } from './fixtures';

// The fixture's compiled module imports `@midnight-ntwrk/compact-runtime`
// bare and asserts `checkRuntimeVersion('0.16.0')`, so the specifier is
// redirected to the retained alias for this file only — the same redirect
// engine-execute.test.ts uses for counter-016.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

const CIRCUIT_ID = 'receive_coin';
const SAMPLE_COIN_PUBLIC_KEY = 'ca'.repeat(32);
const REGISTERED_VERIFIER_KEY = readFileSync(fixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'));

/** The slice of the compiled fixture module this suite drives. */
interface CompiledReceiverContract extends Ledger8ContractLike {
  initialState(constructorContext: ConstructorContext<Record<string, never>>): {
    currentContractState: { data: ocrt3.ChargedState };
  };
}

interface CompiledReceiverModule {
  readonly Contract: new (witnesses: Record<string, never>) => CompiledReceiverContract;
}

/** What the compiler recorded about the toolchain that produced the fixture. */
interface ContractInfo {
  readonly 'runtime-version': string;
  readonly 'compiler-version': string;
}

// A coin the circuit receives. Plain data in the runtime's own decoded
// `ShieldedCoinInfo` shape, which the generated code type-checks on entry.
const RECEIVED_COIN = { nonce: new Uint8Array(32).fill(0x07), color: new Uint8Array(32).fill(0), value: 42n };

const runReceiveCoin = async (): Promise<TranscriptPojo> => {
  const { Contract } = (await import(
    /* @vite-ignore */ fixturePath('coin-receiver-016', 'compiled', 'contract', 'index.js')
  )) as CompiledReceiverModule;
  const ledger8Runtime = await import('compact-runtime-ledger8');
  const contract = new Contract({});
  const initial = contract.initialState(ledger8Runtime.createConstructorContext({}, SAMPLE_COIN_PUBLIC_KEY));

  return executeCircuit(
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
};

// One assembly per era, each against its own module and its own contract
// state. Written as a thunk per arm rather than a shared options record: the
// two `ContractState` types are distinct nominal WASM classes, so only the
// call site can be shared, not the operands.
const ARMS: Readonly<Record<LedgerVersion, (transcript: TranscriptPojo, partitionContext: PartitionContext) => unknown>> =
  {
    v8: (transcript, partitionContext) => {
      const contractState = new LedgerV8.ContractState();
      const operation = new LedgerV8.ContractOperation();
      operation.verifierKey = REGISTERED_VERIFIER_KEY;
      contractState.setOperation(CIRCUIT_ID, operation);
      return assembleCallPrototype(LedgerV8, {
        circuitId: CIRCUIT_ID,
        contractAddress: ocrt3.dummyContractAddress(),
        transcript: {
          kind: 'unpartitioned',
          preState: transcript.preContractState.data.state.encode(),
          publicTranscript: transcript.publicTranscript,
          partitionContext
        },
        privateTranscriptOutputs: transcript.privateTranscriptOutputs,
        input: transcript.input,
        output: transcript.output,
        operations: contractState,
        stage: 'call-operation',
        version: 'v8'
      });
    },
    v9: (transcript, partitionContext) => {
      const contractState = new ledgerV9.ContractState();
      const operation = new ledgerV9.ContractOperation();
      operation.verifierKey = REGISTERED_VERIFIER_KEY;
      contractState.setOperation(CIRCUIT_ID, operation);
      return assembleCallPrototype(ledgerV9, {
        circuitId: CIRCUIT_ID,
        contractAddress: ocrt3.dummyContractAddress(),
        transcript: {
          kind: 'unpartitioned',
          preState: transcript.preContractState.data.state.encode(),
          publicTranscript: transcript.publicTranscript,
          partitionContext
        },
        privateTranscriptOutputs: transcript.privateTranscriptOutputs,
        input: transcript.input,
        output: transcript.output,
        operations: contractState,
        stage: 'call-operation',
        version: 'v9'
      });
    }
  };

const ERAS = ['v8', 'v9'] as const;

// The one case `counter-016` cannot reach. A circuit that receives a shielded
// coin in-contract writes it into a `QualifiedShieldedCoinInfo` cell, and
// qualifying the coin needs the INDEX the runtime recorded its commitment at.
// So this is the suite that proves the recorded context is load-bearing rather
// than carried on principle: the same real transcript composes with it and is
// refused without it, on both eras.
describe('partitioning a transcript that received a shielded coin in-contract', () => {
  let transcript: TranscriptPojo;

  beforeAll(async () => {
    transcript = await runReceiveCoin();
  });

  it('was compiled by the retained era toolchain, not the current one', () => {
    const info = JSON.parse(
      readFileSync(fixturePath('coin-receiver-016', 'compiled', 'compiler', 'contract-info.json'), 'utf8')
    ) as ContractInfo;

    // The fixture is only worth anything while it emits the SYNC codegen the
    // retained leg runs. A recompile with the repo's own pinned compactc would
    // silently produce 0.19-era async codegen that never reaches the seam under
    // test, so the artifact carries its provenance and this asserts it.
    expect(info['runtime-version']).toBe('0.16.0');
    expect(info['compiler-version']).toBe('0.31.1');
  });

  it('records exactly one commitment index for the one coin it received', () => {
    expect(transcript.zswapLocalState.outputs).toHaveLength(1);
    expect(transcript.zswapLocalState.outputs[0].coinInfo.value).toBe(RECEIVED_COIN.value);
    // The runtime registers the commitment at the local index it assigned the
    // output — the map a composition leg has to carry.
    expect([...transcript.partitionContext.comIndices]).toHaveLength(1);
    expect([...transcript.partitionContext.comIndices][0][1]).toBe(0n);
    // A real program, not a hand-built one: the ops below are what the
    // partitioner is actually asked to split.
    expect(transcript.publicTranscript.length).toBeGreaterThan(1);
  });

  it.each(ERAS)('composes the call once the recorded commitments travel with it on %s', (version) => {
    expect(ARMS[version](transcript, transcript.partitionContext)).toBeDefined();
  });

  it.each(ERAS)('refuses the same call when the recorded commitments are dropped on %s', (version) => {
    const withoutCommitments: PartitionContext = { ...transcript.partitionContext, comIndices: new Map() };

    let caught: unknown;
    try {
      ARMS[version](transcript, withoutCommitments);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    const failure = caught as ComposeFailedError;
    expect(failure.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(failure.stage).toBe('call-partition');
    expect(failure.version).toBe(version);
    expect(failure.circuitId).toBe(CIRCUIT_ID);
    expect(failure.cause).toBeInstanceOf(Error);
  });
});
