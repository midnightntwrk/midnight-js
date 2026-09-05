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

import { loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';
import type { ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { beforeAll, describe, expect, it } from 'vitest';

import { PROVIDER_ERROR_CODES } from '../error-codes';
import { PayloadNotATransactionError, proveV8Transaction } from '../prove-v8';

const NETWORK_ID = 'undeployed';

/**
 * A proving provider that answers but is never expected to be consulted: the
 * empty transactions these tests prove carry no contract calls, so the ledger
 * drives no circuits. Proving is still a real call into the retained runtime —
 * what it exercises is the deserialize/prove/serialize round trip and the cost
 * model, not the circuit loop.
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
 */
const errorChainText = (error: unknown): string => {
  const parts: string[] = [];
  for (let current = error; current instanceof Error; current = current.cause) {
    parts.push(current.message);
  }
  return parts.join(' | ');
};

describe('proveV8Transaction', () => {
  let retainedEraTxBytes: Uint8Array;
  let circuitDrivingTxBytes: Uint8Array;

  beforeAll(async () => {
    const v8 = await loadLedger8();
    retainedEraTxBytes = v8.Transaction.fromParts(NETWORK_ID).serialize();

    // A transaction carrying one Zswap output. Unlike the empty one above it
    // has something to prove, so `prove()` actually drives the proving
    // provider -- once, for `midnight/zswap/output`. That is what makes the
    // failure-propagation case below reach the provider at all.
    const rawTokenType = v8.sampleRawTokenType();
    const output = v8.ZswapOutput.new(
      v8.createShieldedCoinInfo(rawTokenType, 100n),
      1,
      v8.sampleCoinPublicKey(),
      v8.sampleEncryptionPublicKey()
    );
    circuitDrivingTxBytes = v8.Transaction.fromParts(
      NETWORK_ID,
      v8.ZswapOffer.fromOutput(output, rawTokenType, 100n)
    ).serialize();
  });

  it("proves a retained-era transaction with the retained era's own cost model", async () => {
    // The cost model is the whole substance of this assertion, and it is why
    // the test drives the real runtime rather than a stub. The retained ledger
    // ships its OWN `CostModel` class, and its `prove()` type-checks the
    // argument against that class across the WASM boundary: handing it the
    // current era's cost model throws `expected instance of CostModel`. So
    // this test passing IS the check that the retained cost model is used —
    // regress it to the current era's and this fails.
    const provenBytes = await proveV8Transaction(retainedEraTxBytes, inertProvingProvider);

    expect(provenBytes).toBeInstanceOf(Uint8Array);
    expect(provenBytes.byteLength).toBeGreaterThan(0);
  });

  it('returns bytes the retained runtime reads back as a PROVEN transaction', async () => {
    const v8 = await loadLedger8();

    const provenBytes = await proveV8Transaction(retainedEraTxBytes, inertProvingProvider);

    // The stage marker in the tag is the observable difference between input
    // and output: an unproven transaction serializes as `proof-preimage`, a
    // proven one as `proof`. Asserting the flip is what distinguishes "the
    // transaction was proved" from "some bytes came back".
    const unprovenTag = 'midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1]):';
    const provenTag = 'midnight:transaction[v9](signature[v1],proof,embedded-fr[v1]):';
    expect(asLatin1(retainedEraTxBytes, unprovenTag.length)).toBe(unprovenTag);
    expect(asLatin1(provenBytes, provenTag.length)).toBe(provenTag);

    expect(() => v8.Transaction.deserialize('signature', 'proof', 'pre-binding', provenBytes)).not.toThrow();
  });

  describe('the payload tag assertion', () => {
    it('refuses a payload that is not a serialized transaction, before the runtime sees it', async () => {
      const rejection = await proveV8Transaction(new Uint8Array([1, 2, 3, 4]), inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      // Our own coded refusal, not a runtime decode failure: the point of the
      // check is that the caller gets an actionable error naming the seam
      // instead of an opaque WASM message.
      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
      expect(rejection).toHaveProperty('code', PROVIDER_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION);
    });

    it.each([
      { label: 'a missing txBytes field', payload: undefined, described: 'undefined' },
      { label: 'a null txBytes field', payload: null, described: 'null' },
      { label: 'a plain Array of byte values', payload: [1, 2, 3], described: 'Array' },
      // A null-prototype object has no `constructor` to name. This repo builds
      // them deliberately (see the protocol package's shared-table discipline),
      // so it is a shape that can genuinely arrive here.
      { label: 'a null-prototype object', payload: Object.create(null), described: 'object' }
    ])('refuses $label with the registered code, not a TypeError', async ({ payload, described }) => {
      // Reachable exactly as an untagged payload is: from JavaScript, from a
      // consumer built against a pre-5.0.0 `midnight-js-types`, or across an
      // untyped boundary. Hardening the `version` tag but not this field would
      // leave the same hole one level down.
      const rejection = await proveV8Transaction(payload as unknown as Uint8Array, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
      expect(rejection).toHaveProperty('code', PROVIDER_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION);
      expect((rejection as Error).message).toContain(described);
      // The garbled 'undefined-byte payload' message is what reading
      // `.byteLength` off a non-array produced before this guard existed.
      expect((rejection as Error).message).not.toContain('undefined-byte');
    });

    it('refuses a payload shorter than the tag prefix', async () => {
      const rejection = await proveV8Transaction(new Uint8Array(), inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    });

    it('does not echo the payload back in the refusal', async () => {
      // The bytes are attacker-controlled at this seam. Reporting the length is
      // fine and useful; reproducing any of the content is not.
      const marker = 'DEADBEEF';
      const payload = new Uint8Array(Buffer.from(`${marker}${'x'.repeat(64)}`, 'latin1'));

      const rejection = await proveV8Transaction(payload, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
      expect((rejection as Error).message).not.toContain(marker);
      expect((rejection as Error).message).toContain(String(payload.byteLength));
    });

    it('establishes that a payload is a transaction, NOT which era wrote it', async () => {
      // Both eras' tags open `midnight:transaction[`, so a current-era payload
      // passes this check and is then refused by the retained runtime itself.
      // That is the intended division of labour: the tag is a defence-in-depth
      // discriminant on the KIND of payload, while the era is carried by the
      // seam's `version` field. Never read an era off the bracketed version.
      const currentEraTxBytes = Transaction.fromParts(NETWORK_ID).serialize();

      const rejection = await proveV8Transaction(currentEraTxBytes, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(Error);
      expect(rejection).not.toBeInstanceOf(PayloadNotATransactionError);

      // This is the one refusal raised by the vendor runtime rather than by us,
      // so it is the one that could carry payload content out in a message or a
      // cause chain. Held to the same standard as our own refusals above.
      const bodySlice = Buffer.from(currentEraTxBytes.subarray(80, 96)).toString('hex');
      expect(errorChainText(rejection)).not.toContain(bodySlice);
    });
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
      const rejection = await proveV8Transaction(circuitDrivingTxBytes, rejectingProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      // Reached the provider and came back out: proving really was attempted.
      const text = errorChainText(rejection);
      expect(text).toContain('503');
      expect(text).toContain('Service Unavailable');

      // Nothing of the transaction may ride along. The runtime builds a fresh
      // error around the provider's, and this is the assertion that it does not
      // append the proof preimage or the transaction body while doing so.
      const bodySlice = Buffer.from(circuitDrivingTxBytes.subarray(80, 96)).toString('hex');
      expect(text).not.toContain(bodySlice);
      expect(text).not.toContain('proof-preimage');
    });

    it('drives the proving provider once, for the output circuit', async () => {
      const keyLocations: string[] = [];
      const recording: ProvingProvider = {
        check: (_preimage, keyLocation) => {
          keyLocations.push(keyLocation);
          return Promise.reject(new Error(PROOF_SERVER_FAILURE));
        },
        prove: (_preimage, keyLocation) => {
          keyLocations.push(keyLocation);
          return Promise.reject(new Error(PROOF_SERVER_FAILURE));
        },
        lookupKey: () => Promise.resolve(undefined)
      };

      await proveV8Transaction(circuitDrivingTxBytes, recording).catch(() => undefined);

      // The provider handed in is the one the retained runtime consults --
      // without this, nothing would notice a seam that dropped it on the floor.
      expect(keyLocations).toEqual(['midnight/zswap/output']);
    });
  });
});
