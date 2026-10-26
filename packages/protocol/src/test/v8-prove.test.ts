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

import type { ProvingProvider } from '@midnightntwrk/ledger-v9';
import { beforeAll, describe, expect, it } from 'vitest';

import { loadLedger8Protocol } from '../lib/v8/load';
import { proveLedger8Transaction } from '../lib/v8/prove';
import type { LedgerTransactionTypes } from '../transaction';
import { LEDGER8_UNPROVEN_TX_TAG } from './fixtures';

const NETWORK_ID = 'undeployed';

/**
 * A proving provider that answers but is never expected to be consulted: the
 * empty transactions these tests prove carry no contract calls, so the ledger
 * drives no circuits. It returns bytes that are NOT a proof, so a case that
 * unexpectedly reached it would fail rather than pass quietly.
 */
const inertProvingProvider: ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array()),
  lookupKey: () => Promise.resolve(undefined)
};

const asLatin1 = (bytes: Uint8Array, length: number): string =>
  Buffer.from(bytes.subarray(0, length)).toString('latin1');

/**
 * Every message in an error's cause chain, joined. Echo checks read this rather
 * than `error.message` alone, so content smuggled onto a `cause` is caught too.
 * Depth-bounded so a self-referential `cause` cannot hang the suite.
 */
const errorChainText = (error: unknown): string => {
  const parts: string[] = [];
  let current = error;
  for (let depth = 0; current instanceof Error && depth < 10; depth += 1) {
    parts.push(current.message);
    current = current.cause;
  }
  return parts.join(' | ');
};

describe('proveLedger8Transaction', () => {
  let retainedEraTx: LedgerTransactionTypes['v8']['Unproven'];
  let circuitDrivingTx: LedgerTransactionTypes['v8']['Unproven'];
  let ledger8Module: Awaited<ReturnType<typeof loadLedger8Protocol>>;

  beforeAll(async () => {
    const v8 = await loadLedger8Protocol();
    ledger8Module = v8;
    retainedEraTx = v8.Transaction.fromParts(NETWORK_ID);

    // A transaction carrying one Zswap output. Unlike the empty one above it
    // has something to prove, so `prove()` actually drives the proving
    // provider -- once, for `midnight/zswap/output`.
    const rawTokenType = v8.sampleRawTokenType();
    const output = v8.ZswapOutput.new(
      v8.createShieldedCoinInfo(rawTokenType, 100n),
      1,
      v8.sampleCoinPublicKey(),
      v8.sampleEncryptionPublicKey()
    );
    circuitDrivingTx = v8.Transaction.fromParts(NETWORK_ID, v8.ZswapOffer.fromOutput(output, rawTokenType, 100n));
  });

  it('returns an Unbound transaction object of the framework v8 module', async () => {
    // The retained ledger ships its OWN `CostModel` class and its `prove()`
    // type-checks the argument across the WASM boundary, so this passing is the
    // check that the retained cost model is used.
    const proven = await proveLedger8Transaction(retainedEraTx, inertProvingProvider);

    // An unproven transaction serializes as `proof-preimage`, a proven one as
    // `proof`: the flip is what distinguishes "proved" from "something came back".
    const provenTag = LEDGER8_UNPROVEN_TX_TAG.replace('proof-preimage', 'proof');
    expect(provenTag).not.toBe(LEDGER8_UNPROVEN_TX_TAG);
    expect(proven).toBeInstanceOf(ledger8Module.Transaction);
    expect(asLatin1(proven.serialize(), provenTag.length)).toBe(provenTag);
  });

  describe('a failing proving provider', () => {
    const PROOF_SERVER_FAILURE =
      'Failed Proof Server response: url="http://proof-server:6300/prove", code="503", status="Service Unavailable"';

    const rejectingProvingProvider: ProvingProvider = {
      check: () => Promise.reject(new Error(PROOF_SERVER_FAILURE)),
      prove: () => Promise.reject(new Error(PROOF_SERVER_FAILURE)),
      lookupKey: () => Promise.resolve(undefined)
    };

    it('propagates the failure without echoing the preimage or the payload into it', async () => {
      const rejection = await proveLedger8Transaction(circuitDrivingTx, rejectingProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      // Reached the provider and came back out: proving really was attempted.
      const text = errorChainText(rejection);
      expect(text).toContain('503');
      expect(text).toContain('Service Unavailable');

      // Nothing of the transaction may ride along. Checked in BOTH encodings:
      // the header-mismatch case in ledger-transaction.test.ts shows the runtime
      // echoes payload bytes as latin1, so a hex-only check could never fail.
      const circuitDrivingTxBytes = circuitDrivingTx.serialize();
      const bodySlice = circuitDrivingTxBytes.subarray(LEDGER8_UNPROVEN_TX_TAG.length + 16, LEDGER8_UNPROVEN_TX_TAG.length + 32);
      expect(text).not.toContain(Buffer.from(bodySlice).toString('latin1'));
      expect(text).not.toContain(Buffer.from(bodySlice).toString('hex'));
      expect(text).not.toContain('proof-preimage');
      // The length bound is what actually holds "nothing rode along": it fails
      // if the runtime ever starts appending the preimage or the body, whatever
      // encoding it chooses.
      expect(text.length).toBeLessThan(PROOF_SERVER_FAILURE.length * 3);
    });

    it('drives the proving provider once, for the output circuit', async () => {
      const consulted: string[] = [];
      const recording: ProvingProvider = {
        check: (_preimage, keyLocation) => {
          consulted.push(`check:${keyLocation}`);
          return Promise.reject(new Error(PROOF_SERVER_FAILURE));
        },
        prove: (_preimage, keyLocation) => {
          consulted.push(`prove:${keyLocation}`);
          return Promise.reject(new Error(PROOF_SERVER_FAILURE));
        },
        lookupKey: () => Promise.resolve(undefined)
      };

      const rejection = await proveLedger8Transaction(circuitDrivingTx, recording).then(
        () => undefined,
        (error: unknown) => error
      );

      // The provider handed in is the one the retained runtime consults, and
      // WHICH member it consults is part of the claim -- labelled, so this
      // cannot pass on `check` when it says `prove`.
      expect(consulted, `proveLedger8Transaction rejected with: ${String(rejection)}`).toEqual([
        'prove:midnight/zswap/output'
      ]);
    });
  });
});
