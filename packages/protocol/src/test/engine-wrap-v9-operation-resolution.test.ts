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

import { encodeContractKeyLocation, hashVerifierKey } from '@midnight-ntwrk/compact-js';
import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as LedgerV9 from '@midnightntwrk/ledger-v9';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DownConvertedState } from '../lib/engine/down-convert';
import type { TranscriptPojo } from '../lib/engine/execute';
import { fixturePath, readHexFixture } from './fixtures';

// See engine-wrap-v9.test.ts: `ContractOperation.verifierKey`'s setter
// validates a `midnight:verifier-key[...]:` tagged blob.
const REGISTERED_VERIFIER_KEY = readFileSync(
  fixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier')
);

// The mis-dispatch negative from the hard-fork fixture set: a real, migrated,
// well-formed v9 `ContractState` whose `increment` slot carries a verifier key
// that is genuinely FOREIGN to the twin contract (fixtures/hf/README.md, "The
// mis-dispatch fixture"). Read by path rather than through testkit-js's typed
// accessor, for the reason engine-golden-fixtures.test.ts gives: testkit-js
// depends on this package, so a devDependency back would close a workspace
// cycle. packages/protocol/turbo.json declares the fixture directory as a test
// input, so editing it invalidates this package's test cache.
const FOREIGN_KEY_STATE_FIXTURE = 'state-co-v2-only-foreign.hex';


const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({ value: [new Uint8Array(32).fill(byte)], alignment: FIELD_ALIGNMENT });
const buildState = (byte: number): DownConvertedState => ({ data: new ocrt3.ChargedState(ocrt3.StateValue.newCell(fieldValue(byte))) });

// Pre- and post-state carry DIFFERENT bytes on purpose: the bridge must read
// the pre-call state, and only distinct fixtures can tell the two apart.
const buildTranscript = (): TranscriptPojo => ({
  circuitId: 'increment',
  result: [],
  input: fieldValue(0x10),
  output: fieldValue(0x20),
  publicTranscript: [],
  privateTranscriptOutputs: [fieldValue(0x30)],
  preContractState: buildState(0x01),
  postContractState: buildState(0x02),
  privateStateAfter: {}
});

const registeredContractState = (): LedgerV9.ContractState => {
  const registeredOp = new LedgerV9.ContractOperation();
  registeredOp.verifierKey = REGISTERED_VERIFIER_KEY;
  const contractState = new LedgerV9.ContractState();
  contractState.setOperation('increment', registeredOp);
  return contractState;
};

// The ten positional arguments of `ContractCallPrototype`, captured verbatim.
// Named rather than indexed so a reordering of the ledger's own signature
// shows up as a compile error here instead of a silently shifted assertion.
interface CapturedCall {
  address: unknown;
  entryPoint: unknown;
  op: LedgerV9.ContractOperation;
  guaranteed: unknown;
  fallible: unknown;
  privateTranscriptOutputs: unknown;
  input: unknown;
  output: unknown;
  commCommRand: unknown;
  keyLocation: unknown;
}

// Lives in its own file — the doMock'd `@midnightntwrk/ledger-v9` registry
// cannot leak into engine-wrap-v9.test.ts's happy-path suite (same isolation
// precedent as load-v8-failure.test.ts). Everything else in the module stays
// real (spread from importOriginal); only the pieces each test inspects are
// intercepted, because `ContractCallPrototype` exposes no getter to read
// back after construction.
describe('wrapKeepStateCall call-prototype assembly', () => {
  afterEach(() => {
    vi.doUnmock('@midnightntwrk/ledger-v9');
    vi.resetModules();
  });

  const mockCapturingPrototype = (captured: CapturedCall[]): void => {
    vi.doMock('@midnightntwrk/ledger-v9', async (importOriginal) => {
      const actual = await importOriginal<typeof LedgerV9>();
      class CapturingContractCallPrototype {
        constructor(
          address: unknown,
          entryPoint: unknown,
          op: LedgerV9.ContractOperation,
          guaranteed: unknown,
          fallible: unknown,
          privateTranscriptOutputs: unknown,
          input: unknown,
          output: unknown,
          commCommRand: unknown,
          keyLocation: unknown
        ) {
          captured.push({
            address,
            entryPoint,
            op,
            guaranteed,
            fallible,
            privateTranscriptOutputs,
            input,
            output,
            commCommRand,
            keyLocation
          });
        }
      }
      return { ...actual, ContractCallPrototype: CapturingContractCallPrototype };
    });
  };

  it('passes the operation resolved from contractState.operation(circuitId) into ContractCallPrototype', async () => {
    const captured: CapturedCall[] = [];
    mockCapturingPrototype(captured);
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');
    const contractState = registeredContractState();

    wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: LedgerV9.sampleContractAddress(), contractState });

    // `ContractState.operation()` is a WASM-bound getter: it returns a fresh
    // JS wrapper object each call (confirmed empirically — two calls never
    // share object identity), so this asserts by VALUE (the serialized form)
    // rather than by reference, proving the real registered operation's
    // bytes flow through unchanged rather than a blank default's.
    expect(captured).toHaveLength(1);
    expect(captured[0]?.op.serialize()).toEqual(contractState.operation('increment')?.serialize());
  });

  it('places the address, entry point and transcript payloads at their own positions', async () => {
    const captured: CapturedCall[] = [];
    mockCapturingPrototype(captured);
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');
    const transcript = buildTranscript();
    const contractAddress = LedgerV9.sampleContractAddress();

    wrapKeepStateCall({ transcript, contractAddress, contractState: registeredContractState() });

    // input/output/privateTranscriptOutputs carry distinct fixture bytes, so a
    // transposition of any pair fails here rather than composing a valid-looking
    // prototype that only a real ledger would reject.
    const call = captured[0];
    expect(call?.address).toBe(contractAddress);
    expect(call?.entryPoint).toBe('increment');
    expect(call?.input).toBe(transcript.input);
    expect(call?.output).toBe(transcript.output);
    expect(call?.privateTranscriptOutputs).toBe(transcript.privateTranscriptOutputs);
  });

  it('derives the key location in this framework canonical, contract-qualified form', async () => {
    const captured: CapturedCall[] = [];
    mockCapturingPrototype(captured);
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');
    const contractAddress = LedgerV9.sampleContractAddress();

    wrapKeepStateCall({ transcript: buildTranscript(), contractAddress, contractState: registeredContractState() });

    // A bare circuit id is ambiguous across contracts and is rejected by
    // parseContractKeyLocation, so a prover resolving through ZKConfigRegistry
    // could not find the artifact for this call.
    expect(captured[0]?.keyLocation).toBe(
      encodeContractKeyLocation({
        contractAddress,
        circuitId: 'increment',
        verifierKeyHash: hashVerifierKey(REGISTERED_VERIFIER_KEY)
      })
    );
  });

  it('samples fresh communication commitment randomness for every call', async () => {
    const captured: CapturedCall[] = [];
    mockCapturingPrototype(captured);
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');
    const contractAddress = LedgerV9.sampleContractAddress();
    const contractState = registeredContractState();

    wrapKeepStateCall({ transcript: buildTranscript(), contractAddress, contractState });
    wrapKeepStateCall({ transcript: buildTranscript(), contractAddress, contractState });

    // Reusing one commitment across calls is a privacy regression that nothing
    // downstream would surface, so it has to be pinned here.
    expect(captured).toHaveLength(2);
    expect(captured[0]?.commCommRand).not.toBe(captured[1]?.commCommRand);
  });

  it('bridges the PRE-call contract state into the query context, not the post-call one', async () => {
    const decoded: LedgerV9.EncodedStateValue[] = [];
    const captured: CapturedCall[] = [];
    vi.doMock('@midnightntwrk/ledger-v9', async (importOriginal) => {
      const actual = await importOriginal<typeof LedgerV9>();
      class CapturingContractCallPrototype {
        constructor() {
          captured.push({} as CapturedCall);
        }
      }
      return {
        ...actual,
        ContractCallPrototype: CapturingContractCallPrototype,
        StateValue: {
          ...actual.StateValue,
          decode: (value: LedgerV9.EncodedStateValue) => {
            decoded.push(value);
            return actual.StateValue.decode(value);
          }
        }
      };
    });
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');
    const transcript = buildTranscript();

    wrapKeepStateCall({
      transcript,
      contractAddress: LedgerV9.sampleContractAddress(),
      contractState: registeredContractState()
    });

    expect(decoded).toHaveLength(1);
    expect(decoded[0]).toEqual(transcript.preContractState.data.state.encode());
    expect(decoded[0]).not.toEqual(transcript.postContractState.data.state.encode());
  });

  // Every other case in this file registers the twin contract's own key on a
  // hand-built `new ContractState()`. This one is the mis-dispatch negative,
  // against a REAL migrated on-chain state: the operation resolves and does
  // carry a verifier key, so neither the `wrap-call` nor the
  // `call-verifier-key` guard fires — the call composes. What must not happen
  // is the foreign key being normalised away into a key location that looks
  // like the twin contract's: that would make an unprovable call resolve a
  // valid-looking artifact through ZKConfigRegistry, and push the failure past
  // the last point that can explain it. Carrying the foreign hash through is
  // what keeps the mis-dispatch detectable at artifact resolution.
  it('carries a foreign registered key into the key location instead of normalising it to the expected one', async () => {
    const captured: CapturedCall[] = [];
    mockCapturingPrototype(captured);
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');
    const contractAddress = LedgerV9.sampleContractAddress();
    const contractState = LedgerV9.ContractState.deserialize(readHexFixture(FOREIGN_KEY_STATE_FIXTURE));
    const foreignKey = contractState.operation('increment')?.verifierKey;
    if (foreignKey === undefined) {
      throw new Error(`fixture invariant violated: ${FOREIGN_KEY_STATE_FIXTURE} has no keyed 'increment' operation`);
    }

    wrapKeepStateCall({ transcript: buildTranscript(), contractAddress, contractState });

    // Guards the fixture itself: if a re-mint ever made this key equal to the
    // twin contract's, the two assertions below would agree for the wrong
    // reason and this test would stop testing anything.
    expect(Buffer.from(foreignKey).equals(REGISTERED_VERIFIER_KEY)).toBe(false);
    expect(captured[0]?.keyLocation).toBe(
      encodeContractKeyLocation({ contractAddress, circuitId: 'increment', verifierKeyHash: hashVerifierKey(foreignKey) })
    );
    expect(captured[0]?.keyLocation).not.toBe(
      encodeContractKeyLocation({
        contractAddress,
        circuitId: 'increment',
        verifierKeyHash: hashVerifierKey(REGISTERED_VERIFIER_KEY)
      })
    );
  });

  it('keeps the guaranteed and fallible partitions in their own argument positions', async () => {
    const captured: CapturedCall[] = [];
    const guaranteedSentinel = Symbol('guaranteed');
    const fallibleSentinel = Symbol('fallible');
    vi.doMock('@midnightntwrk/ledger-v9', async (importOriginal) => {
      const actual = await importOriginal<typeof LedgerV9>();
      class CapturingContractCallPrototype {
        constructor(
          address: unknown,
          entryPoint: unknown,
          op: LedgerV9.ContractOperation,
          guaranteed: unknown,
          fallible: unknown
        ) {
          captured.push({ address, entryPoint, op, guaranteed, fallible } as CapturedCall);
        }
      }
      return {
        ...actual,
        ContractCallPrototype: CapturingContractCallPrototype,
        partitionTranscripts: () => [[guaranteedSentinel, fallibleSentinel]]
      };
    });
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');

    wrapKeepStateCall({
      transcript: buildTranscript(),
      contractAddress: LedgerV9.sampleContractAddress(),
      contractState: registeredContractState()
    });

    // Transposing these two composes a structurally valid prototype that
    // Intent.addCall accepts and only a real ledger rejects.
    expect(captured[0]?.guaranteed).toBe(guaranteedSentinel);
    expect(captured[0]?.fallible).toBe(fallibleSentinel);
  });
});
