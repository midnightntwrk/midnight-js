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

import { encodeContractKeyLocation, hashVerifierKey } from '@midnight-ntwrk/compact-js';
import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { ComposeFailedError, ComposeOptionError, PROTOCOL_ERROR_CODES } from '../errors';
import type { ComposeCallEntry, ComposeCallOptions } from '../lib/era/compose-types';
import { composeV9CallTx } from '../lib/era/compose-v9';

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});

// `ContractOperation.verifierKey`'s setter validates a
// `midnight:verifier-key[...]:` tagged blob, so a synthetic key will not do.
const REGISTERED_VERIFIER_KEY = readFileSync(
  resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
);

const NETWORK_ID = 'test-network';
const TTL = new Date(Date.now() + 3_600_000);
const PRE_STATE: ledgerV9.EncodedStateValue = ocrt3.StateValue.newCell(fieldValue(0x01)).encode();
// The smallest program that partitions into a DEFINED guaranteed transcript;
// an empty program partitions into a pair of `undefined`s.
const PUBLIC_TRANSCRIPT: ledgerV9.Op<ledgerV9.AlignedValue>[] = [{ noop: { n: 1 } }];

const serializedStateWith = (operation: ledgerV9.ContractOperation | undefined): Uint8Array => {
  const contractState = new ledgerV9.ContractState();
  if (operation !== undefined) {
    contractState.setOperation('increment', operation);
  }
  return contractState.serialize();
};

const keyedOperation = (): ledgerV9.ContractOperation => {
  const op = new ledgerV9.ContractOperation();
  op.verifierKey = REGISTERED_VERIFIER_KEY;
  return op;
};

const ADDRESS = ledgerV9.sampleContractAddress();
const USER = ledgerV9.sampleUserAddress();
const TOKEN = ledgerV9.sampleRawTokenType();

const callEntry = (overrides: Partial<ComposeCallEntry> = {}): ComposeCallEntry => ({
  contractAddress: ADDRESS,
  circuitId: 'increment',
  contractState: serializedStateWith(keyedOperation()),
  transcript: { kind: 'unpartitioned', preState: PRE_STATE, publicTranscript: PUBLIC_TRANSCRIPT },
  privateTranscriptOutputs: [],
  input: fieldValue(0x10),
  output: fieldValue(0x20),
  ...overrides
});

const callOptions = (overrides: Partial<ComposeCallOptions> = {}): ComposeCallOptions => ({
  calls: [callEntry()],
  networkId: NETWORK_ID,
  ttl: TTL,
  ...overrides
});

const readBack = (bytes: Uint8Array): ledgerV9.Transaction<ledgerV9.SignatureEnabled, ledgerV9.PreProof, ledgerV9.PreBinding> =>
  ledgerV9.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);

const callsIn = (
  transaction: ledgerV9.Transaction<ledgerV9.SignatureEnabled, ledgerV9.PreProof, ledgerV9.PreBinding>
): ledgerV9.ContractCall<ledgerV9.PreProof>[] =>
  [...(transaction.intents?.values() ?? [])]
    .flatMap((intent) => intent.actions)
    .filter((action) => action instanceof ledgerV9.ContractCall);

const caught = (compose: () => unknown): unknown => {
  try {
    compose();
  } catch (error) {
    return error;
  }
  throw new Error('expected composeV9CallTx to throw');
};

describe('composeV9CallTx', () => {
  it('composes a single call into one intent carrying one contract call', () => {
    const transaction = readBack(composeV9CallTx(callOptions()));

    const intents = [...(transaction.intents?.values() ?? [])];
    expect(intents).toHaveLength(1);
    const calls = callsIn(transaction);
    expect(calls).toHaveLength(1);
    expect(calls[0].address).toBe(ADDRESS);
    expect(calls[0].entryPoint).toBe('increment');
    // This program's ops are all guaranteed, so the guaranteed transcript must
    // arrive populated and the fallible one absent. Swapping the two positional
    // arguments would misplace the work between the transaction's guaranteed
    // and fallible sections and pass every other assertion here.
    expect(calls[0].guaranteedTranscript).toBeDefined();
    expect(calls[0].fallibleTranscript).toBeUndefined();
    // Intents record their ttl at second granularity, so compare floored seconds.
    expect(Math.floor(intents[0].ttl.getTime() / 1000)).toBe(Math.floor(TTL.getTime() / 1000));
  });

  // The key location is the canonical, contract-qualified form this framework's
  // provers resolve artifacts by. A bare circuit id is ambiguous across
  // contracts and cannot be resolved through the ZK config registry at all.
  it('keys the call by the contract-qualified location that hashes the deployed verifier key', () => {
    const calls = callsIn(readBack(composeV9CallTx(callOptions())));

    expect(String(calls[0].proof)).toContain(
      encodeContractKeyLocation({
        contractAddress: ADDRESS,
        circuitId: 'increment',
        verifierKeyHash: hashVerifierKey(REGISTERED_VERIFIER_KEY)
      })
    );
  });

  // A cross-contract callee must reuse the randomness the runtime bound it to
  // its caller with; the root call, being no one's callee, samples fresh
  // randomness. Reusing a caller's commitment for a root call, or sampling
  // fresh randomness for a callee, breaks the commitment the ledger checks.
  it('samples fresh randomness for a root call and reuses a supplied commitment for a callee', () => {
    const rootA = callsIn(readBack(composeV9CallTx(callOptions())))[0];
    const rootB = callsIn(readBack(composeV9CallTx(callOptions())))[0];
    expect(String(rootA.communicationCommitment)).not.toBe(String(rootB.communicationCommitment));

    const randomness = ledgerV9.communicationCommitmentRandomness();
    const boundOptions = callOptions({ calls: [callEntry({ communicationCommitmentRandomness: randomness })] });
    const calleeA = callsIn(readBack(composeV9CallTx(boundOptions)))[0];
    const calleeB = callsIn(readBack(composeV9CallTx(boundOptions)))[0];
    expect(String(calleeA.communicationCommitment)).toBe(String(calleeB.communicationCommitment));
  });

  it('carries a supplied guaranteed and fallible Zswap offer into the transaction', () => {
    const buildOffer = (): Uint8Array => {
      const coin = ledgerV9.createShieldedCoinInfo(ledgerV9.sampleRawTokenType(), 100n);
      const output = ledgerV9.ZswapOutput.new(coin, 0, ledgerV9.sampleCoinPublicKey(), ledgerV9.sampleEncryptionPublicKey());
      return ledgerV9.ZswapOffer.fromOutput(output).serialize();
    };

    const transaction = readBack(
      composeV9CallTx(callOptions({ guaranteedZswapOffer: buildOffer(), fallibleZswapOffer: buildOffer() }))
    );

    expect(transaction.guaranteedOffer?.outputs).toHaveLength(1);
    // A transaction carries ONE guaranteed offer but a fallible offer per
    // segment, and `fromPartsRandomized` picks the segment, so the fallible
    // side has to be read out of that map rather than indexed by a known id.
    const fallibleOffers = [...(transaction.fallibleOffer?.values() ?? [])];
    expect(fallibleOffers).toHaveLength(1);
    expect(fallibleOffers[0].outputs).toHaveLength(1);
  });

  it('refuses Zswap offer bytes this era cannot read, preserving the decoder failure', () => {
    const error = caught(() => composeV9CallTx(callOptions({ guaranteedZswapOffer: new Uint8Array([1, 2, 3]) })));

    expect(error).toBeInstanceOf(ComposeOptionError);
    expect(error).toMatchObject({ option: 'zswapOffer', version: 'v9' });
    expect((error as ComposeOptionError).cause).toBeInstanceOf(Error);
  });

  // An empty intent is accepted by the ledger and serializes into a transaction
  // that changes nothing, so the omission would only surface as a call that
  // appeared to succeed and had no effect.
  it('refuses a call transaction with no calls in it', () => {
    const error = caught(() => composeV9CallTx(callOptions({ calls: [] })));

    expect(error).toBeInstanceOf(ComposeFailedError);
    expect(error).toMatchObject({ stage: 'call-empty', version: 'v9', code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED });
  });

  it('refuses a contract state this era cannot read, preserving the decoder failure', () => {
    const error = caught(() =>
      composeV9CallTx(callOptions({ calls: [callEntry({ contractState: new Uint8Array([1, 2, 3]) })] }))
    );

    expect(error).toBeInstanceOf(ComposeOptionError);
    expect(error).toMatchObject({
      option: 'contractState',
      version: 'v9',
      code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID
    });
    expect((error as ComposeOptionError).cause).toBeInstanceOf(Error);
  });

  it('refuses a contract state with no registered operation for the circuit', () => {
    const error = caught(() =>
      composeV9CallTx(callOptions({ calls: [callEntry({ contractState: serializedStateWith(undefined) })] }))
    );

    expect(error).toBeInstanceOf(ComposeFailedError);
    expect(error).toMatchObject({ stage: 'call-operation', version: 'v9', circuitId: 'increment' });
  });

  it('refuses an operation registered with a blank verifier key', () => {
    const error = caught(() =>
      composeV9CallTx(
        callOptions({ calls: [callEntry({ contractState: serializedStateWith(new ledgerV9.ContractOperation()) })] })
      )
    );

    expect(error).toBeInstanceOf(ComposeFailedError);
    expect(error).toMatchObject({ stage: 'call-verifier-key', version: 'v9', circuitId: 'increment' });
  });

  // The transaction carries one unshielded offer per segment, aggregated from
  // every call. Without this the offers would never be attached at all, and a
  // call that paid a user out would compose into an unbalanced transaction the
  // node rejects on submission.
  it('attaches the unshielded offer each segment pays out', () => {
    const transcript = (owner: string, value: bigint): ledgerV9.Transcript<ledgerV9.AlignedValue> => ({
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
              { tag: 'unshielded', raw: TOKEN } as ledgerV9.TokenType,
              { tag: 'user', address: owner } as ledgerV9.PublicAddress
            ],
            value
          ]
        ])
      },
      program: []
    });
    const options = callOptions({
      calls: [
        callEntry({
          transcript: {
            kind: 'partitioned',
            guaranteed: transcript(USER, 42n),
            fallible: transcript(USER, 7n)
          }
        })
      ]
    });

    const intents = [...(readBack(composeV9CallTx(options)).intents?.values() ?? [])];

    expect(intents[0].guaranteedUnshieldedOffer?.outputs).toEqual([{ value: 42n, owner: USER, type: TOKEN }]);
    expect(intents[0].fallibleUnshieldedOffer?.outputs).toEqual([{ value: 7n, owner: USER, type: TOKEN }]);
  });

  it('refuses an empty network id rather than baking it into the transaction', () => {
    const error = caught(() => composeV9CallTx(callOptions({ networkId: '' })));

    expect(error).toBeInstanceOf(ComposeOptionError);
    expect(error).toMatchObject({ option: 'networkId', version: 'v9' });
  });

  it('refuses an invalid ttl rather than composing a transaction the ledger dates to the epoch', () => {
    const error = caught(() => composeV9CallTx(callOptions({ ttl: new Date('not-a-date') })));

    expect(error).toBeInstanceOf(ComposeOptionError);
    expect(error).toMatchObject({ option: 'ttl', version: 'v9' });
  });
});
