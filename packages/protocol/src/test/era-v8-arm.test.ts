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
import { resolve } from 'node:path';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import { describe, expect, it, vi } from 'vitest';

import { ComposeOptionError, Ledger8ZswapUnsupportedError, PROTOCOL_ERROR_CODES } from '../errors';
import type { Ledger8ContractLike } from '../lib/engine/execute';
import { loadLedger8Engine } from '../lib/engine/load-engine';
import type { ComposeCallEntry } from '../lib/era/compose-types';
import { loadLedgerEra } from '../lib/era/load-era';

const PKG_ROOT = resolve(__dirname, '..', '..');
const FIXTURE_DIR = resolve(PKG_ROOT, '..', '..', 'testkit-js/testkit-js/src/fixtures/hf/counter-016');
const VERIFIER_KEY_PATH = resolve(
  PKG_ROOT,
  '..',
  '..',
  'testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier'
);
const SAMPLE_COIN_PUBLIC_KEY = 'ca'.repeat(32);
const NETWORK_ID = 'test-network';

// Redirects the ported spike fixture's bare `@midnight-ntwrk/compact-runtime`
// import to this package's own `compact-runtime-ledger8` (the real retained
// 0.16 instance) — see engine-execute.test.ts for the full rationale.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

// Both engine surfaces at once: the fixture is a real compiled pre-fork
// contract, so it is simultaneously something `executeCircuit` can dispatch
// through and something `executeConstructor` can build an initial state from.
// `currentContractState` is declared with both members it really has — the
// live `ChargedState` execution runs against, and the `serialize()` the deploy
// leg bridges by.
interface CompiledCounterContract extends Ledger8ContractLike {
  initialState(constructorContext: unknown): {
    currentContractState: { data: ocrt3.ChargedState; serialize: () => Uint8Array };
    currentPrivateState: unknown;
  };
}

interface CompiledCounterModule {
  readonly Contract: new (witnesses: Record<string, never>) => CompiledCounterContract;
}

const loadCounterContract = async (): Promise<CompiledCounterContract> => {
  const { Contract } = (await import(
    /* @vite-ignore */ resolve(FIXTURE_DIR, 'compiled/contract/index.js')
  )) as CompiledCounterModule;
  return new Contract({});
};

const VERIFIER_KEY = new Uint8Array(readFileSync(VERIFIER_KEY_PATH));

const serializedV8StateWithOperation = (): Uint8Array => {
  const contractState = new LedgerV8.ContractState();
  const operation = new LedgerV8.ContractOperation();
  operation.verifierKey = VERIFIER_KEY;
  contractState.setOperation('increment', operation);
  return contractState.serialize();
};

// The whole point of the facade's boundary: what the retained execution leg
// produces as live WASM handles crosses into a composition request as plain
// data — the pre-call state as an EncodedStateValue, the contract state as
// bytes.
const callEntryFromTranscript = (
  transcript: {
    readonly circuitId: string;
    readonly input: ocrt3.AlignedValue;
    readonly output: ocrt3.AlignedValue;
    readonly publicTranscript: ocrt3.Op<ocrt3.AlignedValue>[];
    readonly privateTranscriptOutputs: ocrt3.AlignedValue[];
    readonly preContractState: { readonly data: ocrt3.ChargedState };
  },
  contractAddress: string
): ComposeCallEntry => ({
  contractAddress,
  circuitId: transcript.circuitId,
  contractState: serializedV8StateWithOperation(),
  transcript: {
    kind: 'unpartitioned',
    preState: transcript.preContractState.data.state.encode(),
    publicTranscript: transcript.publicTranscript
  },
  privateTranscriptOutputs: transcript.privateTranscriptOutputs,
  input: transcript.input,
  output: transcript.output
});

const runIncrement = async (): Promise<{
  readonly entry: ComposeCallEntry;
  readonly address: string;
}> => {
  const engine = await loadLedger8Engine();
  const contract = await loadCounterContract();
  const ledger8Runtime = await import('compact-runtime-ledger8');
  const constructorContext = ledger8Runtime.createConstructorContext({}, SAMPLE_COIN_PUBLIC_KEY);
  const initial = contract.initialState(constructorContext);
  const address = ocrt3.dummyContractAddress();

  const transcript = engine.executeCircuit({
    contract,
    circuitId: 'increment',
    args: [],
    state: { data: initial.currentContractState.data },
    address,
    coinPk: SAMPLE_COIN_PUBLIC_KEY,
    privateState: {}
  });

  return { entry: callEntryFromTranscript(transcript, address), address };
};

// A transcript whose effects claim an unshielded payout to a user address —
// the shape a coin-paying call produces and the only input from which the
// transaction's unshielded offers can be derived.
const payingTranscript = (
  owner: string,
  token: string,
  value: bigint
): LedgerV8.Transcript<LedgerV8.AlignedValue> => ({
  gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
  effects: {
    claimedNullifiers: [],
    claimedShieldedReceives: [],
    claimedShieldedSpends: [],
    claimedContractCalls: [],
    shieldedMints: new Map(),
    unshieldedMints: new Map(),
    unshieldedInputs: new Map(),
    unshieldedOutputs: new Map(),
    claimedUnshieldedSpends: new Map([
      [
        [
          { tag: 'unshielded', raw: token } as LedgerV8.TokenType,
          { tag: 'user', address: owner } as LedgerV8.PublicAddress
        ],
        value
      ]
    ])
  },
  program: []
});

const payingCallEntry = (owner: string, token: string): ComposeCallEntry => ({
  contractAddress: ocrt3.dummyContractAddress(),
  circuitId: 'increment',
  contractState: serializedV8StateWithOperation(),
  transcript: {
    kind: 'partitioned',
    guaranteed: payingTranscript(owner, token, 42n),
    fallible: payingTranscript(owner, token, 7n)
  },
  privateTranscriptOutputs: [],
  input: { value: [], alignment: [] },
  output: { value: [], alignment: [] }
});

describe('the v8 era arm', () => {
  it('extracts a v8-era envelope the engine can then down-convert for execution', async () => {
    const era = await loadLedgerEra('v8');
    const engine = await loadLedger8Engine();
    const contractState = new ocrt3.ContractState();
    contractState.data = new ocrt3.ChargedState(
      ocrt3.StateValue.newCell({
        value: [new Uint8Array(32).fill(7)],
        alignment: [{ tag: 'atom', value: { tag: 'field' } }]
      })
    );

    const downConverted = engine.downConvertForExecution(era.extractState(contractState.serialize()));

    expect(downConverted.data.state.type()).toBe('cell');
  });

  it('composes a v8-native call transaction from a real executeCircuit transcript passed as plain data', async () => {
    const era = await loadLedgerEra('v8');
    const { entry, address } = await runIncrement();
    const ttl = new Date(Date.now() + 3_600_000);

    const bytes = era.composeCallTx({ calls: [entry], networkId: NETWORK_ID, ttl });

    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
    const intents = [...(back.intents?.values() ?? [])];
    expect(intents).toHaveLength(1);
    const calls = intents[0].actions.filter((action) => action instanceof LedgerV8.ContractCall);
    expect(calls).toHaveLength(1);
    expect(calls[0].address).toBe(address);
    expect(calls[0].entryPoint).toBe('increment');
    // This circuit's ops are all guaranteed, so the guaranteed transcript must
    // be populated and the fallible one absent. Swapping the two positional
    // arguments in the shared assembler would misplace the work between the
    // transaction's guaranteed and fallible sections, and passes every other
    // assertion in this package.
    expect(calls[0].guaranteedTranscript).toBeDefined();
    expect(calls[0].fallibleTranscript).toBeUndefined();
    // Intents record their ttl at second granularity, so compare floored seconds.
    expect(Math.floor(intents[0].ttl.getTime() / 1000)).toBe(Math.floor(ttl.getTime() / 1000));
  });

  // Both eras must attach the unshielded offer each segment pays out. Without
  // it a v8 call that pays a user out composes into an unbalanced transaction
  // the node rejects on submission, with nothing having reported a problem at
  // composition time — the failure the aggregation exists to prevent, and the
  // reason it cannot live on one era only.
  it('attaches the unshielded offer each segment pays out', async () => {
    const era = await loadLedgerEra('v8');
    const owner = LedgerV8.sampleUserAddress();
    const token = LedgerV8.sampleRawTokenType();

    const bytes = era.composeCallTx({
      calls: [payingCallEntry(owner, token)],
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000)
    });

    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);
    const intents = [...(back.intents?.values() ?? [])];
    expect(intents[0].guaranteedUnshieldedOffer?.outputs).toEqual([{ value: 42n, owner, type: token }]);
    expect(intents[0].fallibleUnshieldedOffer?.outputs).toEqual([{ value: 7n, owner, type: token }]);
  });


  it('composes a v8-native deploy from a constructor result passed as bytes', async () => {
    const era = await loadLedgerEra('v8');
    const engine = await loadLedger8Engine();
    const contract = await loadCounterContract();

    const constructorResult = engine.executeConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY
    });
    const result = era.composeDeployTx({
      contractState: constructorResult.contractState.serialize(),
      verifierKeys: new Map([['increment', VERIFIER_KEY]]),
      networkId: NETWORK_ID,
      ttl: new Date(Date.now() + 3_600_000)
    });

    // Read the deploy back apart rather than only round-tripping it: the
    // deployed state must carry the supplied key under the circuit it was
    // supplied for, which byte-identity of a re-serialization cannot show.
    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', result.transaction);
    const deploys = [...(back.intents?.values() ?? [])]
      .flatMap((intent) => intent.actions)
      .filter((action) => action instanceof LedgerV8.ContractDeploy);
    expect(deploys).toHaveLength(1);
    expect(result.contractAddress).toBe(deploys[0].address);
    expect(Buffer.from(result.initialState)).toEqual(Buffer.from(deploys[0].initialState.serialize()));

    const registered = LedgerV8.ContractState.deserialize(result.initialState);
    expect(registered.operations()).toEqual(['increment']);
    expect(Buffer.from(registered.operation('increment')?.verifierKey ?? new Uint8Array())).toEqual(
      Buffer.from(VERIFIER_KEY)
    );
  });

  // The retained execution leg does not carry the post-call Zswap local state,
  // so a coin-moving call composed on this era would drop those movements and
  // yield an unbalanced transaction. The two eras are therefore NOT
  // interchangeable for coin-moving circuits, and this is where that shows.
  it('refuses a Zswap offer rather than composing a transaction that drops it', async () => {
    const era = await loadLedgerEra('v8');
    const { entry } = await runIncrement();

    const refuse = (): unknown =>
      era.composeCallTx({
        calls: [entry],
        networkId: NETWORK_ID,
        ttl: new Date(Date.now() + 3_600_000),
        guaranteedZswapOffer: new Uint8Array([1, 2, 3])
      });

    expect(refuse).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID, option: 'zswapOffer', version: 'v8' })
    );
    expect(refuse).toThrowError(ComposeOptionError);
    // The class the EXECUTION leg raises when a circuit really did produce coin
    // effects stays out of this path: nothing ran here, so a message saying a
    // circuit produced Zswap outputs would describe something that did not
    // happen, and the two remediations differ.
    expect(refuse).not.toThrowError(Ledger8ZswapUnsupportedError);
  });

  // `refuseZswapOffer` tests the offers with `Array.prototype.some`, which
  // short-circuits: with only the guaranteed offer ever set, the fallible slot
  // was never evaluated with a defined value, and both branches of the
  // predicate still covered. Narrowing the check to the guaranteed offer alone
  // would have passed the whole suite while accepting an offer on an era that
  // cannot carry coin movements.
  it('refuses a fallible Zswap offer, not just a guaranteed one', async () => {
    const era = await loadLedgerEra('v8');
    const { entry } = await runIncrement();

    expect(() =>
      era.composeCallTx({
        calls: [entry],
        networkId: NETWORK_ID,
        ttl: new Date(Date.now() + 3_600_000),
        fallibleZswapOffer: new Uint8Array([1, 2, 3])
      })
    ).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID, option: 'zswapOffer', version: 'v8' })
    );
  });

  // The retained leg composes exactly one call: `executeCircuit` runs a single
  // circuit and refuses one with coin effects, so there is no cross-contract
  // call tree to compose. Silently dropping the rest is the failure mode this
  // refusal exists to prevent.
  it('refuses a call tree this era cannot compose rather than dropping the extra calls', async () => {
    const era = await loadLedgerEra('v8');
    const { entry } = await runIncrement();

    let caught: unknown;
    try {
      era.composeCallTx({
        calls: [entry, entry],
        networkId: NETWORK_ID,
        ttl: new Date(Date.now() + 3_600_000)
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeOptionError);
    expect(caught).toMatchObject({ option: 'calls', version: 'v8' });
  });

  it('refuses a contract state this era cannot read, preserving the decoder failure', async () => {
    const era = await loadLedgerEra('v8');
    const { entry } = await runIncrement();

    let caught: unknown;
    try {
      era.composeCallTx({
        calls: [{ ...entry, contractState: new Uint8Array([1, 2, 3]) }],
        networkId: NETWORK_ID,
        ttl: new Date(Date.now() + 3_600_000)
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeOptionError);
    expect(caught).toMatchObject({ option: 'contractState', version: 'v8' });
    expect((caught as ComposeOptionError).cause).toBeInstanceOf(Error);
  });

  // A constructor-built state declares every entry point with a blank key, and
  // this era's deploy leg is what fills them in. Without the map the deploy
  // would carry unregistered entry points and be refused by the ledger.
  it('refuses a deploy with no verifier-key map', async () => {
    const era = await loadLedgerEra('v8');
    const engine = await loadLedger8Engine();
    const contract = await loadCounterContract();
    const constructorResult = engine.executeConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY
    });

    let caught: unknown;
    try {
      era.composeDeployTx({
        contractState: constructorResult.contractState.serialize(),
        networkId: NETWORK_ID,
        ttl: new Date(Date.now() + 3_600_000)
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeOptionError);
    expect(caught).toMatchObject({ option: 'verifierKeys', version: 'v8' });
  });

  it('refuses a deploy carrying a Zswap offer', async () => {
    const era = await loadLedgerEra('v8');
    const engine = await loadLedger8Engine();
    const contract = await loadCounterContract();
    const constructorResult = engine.executeConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY
    });

    expect(() =>
      era.composeDeployTx({
        contractState: constructorResult.contractState.serialize(),
        verifierKeys: new Map([['increment', VERIFIER_KEY]]),
        networkId: NETWORK_ID,
        ttl: new Date(Date.now() + 3_600_000),
        guaranteedZswapOffer: new Uint8Array([1, 2, 3])
      })
    ).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID, option: 'zswapOffer', version: 'v8' })
    );
  });

  it('refuses a call transaction with no calls in it', async () => {
    const era = await loadLedgerEra('v8');

    expect(() => era.composeCallTx({ calls: [], networkId: NETWORK_ID, ttl: new Date(Date.now() + 3_600_000) })).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED, stage: 'call-empty', version: 'v8' })
    );
  });
});
