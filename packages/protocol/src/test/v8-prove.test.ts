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
import { Transaction } from '@midnightntwrk/ledger-v9';
import { beforeAll, describe, expect, it } from 'vitest';

import { PayloadNotATransactionError, PROTOCOL_ERROR_CODES, TRANSACTION_TAG_PREFIX } from '../errors';
import { loadLedger8 } from '../lib/v8/load';
import { proveV8Transaction } from '../lib/v8/prove';
import { V8_UNPROVEN_TX_TAG } from './fixtures';

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

describe('proveV8Transaction', () => {
  let retainedEraTxBytes: Uint8Array;
  let circuitDrivingTxBytes: Uint8Array;
  let v8Module: Awaited<ReturnType<typeof loadLedger8>>;

  beforeAll(async () => {
    const v8 = await loadLedger8();
    v8Module = v8;
    retainedEraTxBytes = v8.Transaction.fromParts(NETWORK_ID).serialize();

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
    circuitDrivingTxBytes = v8.Transaction.fromParts(
      NETWORK_ID,
      v8.ZswapOffer.fromOutput(output, rawTokenType, 100n)
    ).serialize();
  });

  it('returns bytes the retained runtime reads back as a PROVEN transaction', async () => {
    // The cost model is the substance of this assertion, and it is why the test
    // drives the real runtime rather than a stub. The retained ledger ships its
    // OWN `CostModel` class and its `prove()` type-checks the argument against
    // that class across the WASM boundary: handing it the current era's cost
    // model throws `expected instance of CostModel`. So this test passing IS
    // the check that the retained cost model is used.
    const provenBytes = await proveV8Transaction(retainedEraTxBytes, inertProvingProvider);

    // The stage marker in the tag is the observable difference between input
    // and output: an unproven transaction serializes as `proof-preimage`, a
    // proven one as `proof`. Asserting the flip is what distinguishes "the
    // transaction was proved" from "some bytes came back".
    const provenTag = V8_UNPROVEN_TX_TAG.replace('proof-preimage', 'proof');
    expect(provenTag).not.toBe(V8_UNPROVEN_TX_TAG);
    expect(asLatin1(retainedEraTxBytes, V8_UNPROVEN_TX_TAG.length)).toBe(V8_UNPROVEN_TX_TAG);
    expect(asLatin1(provenBytes, provenTag.length)).toBe(provenTag);

    expect(() => v8Module.Transaction.deserialize('signature', 'proof', 'pre-binding', provenBytes)).not.toThrow();
  });

  describe('the payload tag assertion', () => {
    it('refuses a payload that is not a serialized transaction, before the runtime sees it', async () => {
      const rejection = await proveV8Transaction(new Uint8Array([1, 2, 3, 4]), inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      // Our own coded refusal, not a runtime decode failure: the caller gets an
      // actionable error naming the seam instead of an opaque WASM message.
      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
      expect(rejection).toHaveProperty('code', PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION);
    });

    it.each([
      { label: 'a missing txBytes field', payload: undefined, described: 'undefined' },
      { label: 'a null txBytes field', payload: null, described: 'null' },
      { label: 'a plain Array of byte values', payload: [1, 2, 3], described: 'Array' },
      // A null-prototype object has no `constructor` to name. This repo builds
      // them deliberately, so it is a shape that can genuinely arrive here.
      { label: 'a null-prototype object', payload: Object.create(null), described: 'object' },
      // A constructor name is CALLER DATA on a plain object. These two pin the
      // alphabet and the bound that stop it becoming a log-injection channel.
      {
        label: 'an object whose constructor name carries punctuation',
        payload: { constructor: { name: 'SECRET-\n[fake log line]' } },
        described: 'object'
      },
      {
        label: 'an object whose constructor name is over-long',
        payload: { constructor: { name: 'A'.repeat(200) } },
        described: 'A'.repeat(32)
      },
      // Reading the constructor is itself a property access on caller data, so
      // it can fail. Naming the value is best-effort diagnostics on something
      // already refused, so neither may turn the coded refusal into a raw throw.
      {
        label: 'an object whose constructor accessor throws',
        payload: Object.defineProperty({}, 'constructor', {
          get: () => {
            throw new Error('constructor accessor exploded');
          }
        }),
        described: 'object'
      },
      {
        label: 'an exotic object whose property trap throws',
        payload: new Proxy(
          {},
          {
            get: () => {
              throw new Error('proxy trap exploded');
            }
          }
        ),
        described: 'object'
      }
    ])('refuses $label with the registered code, not a TypeError', async ({ payload, described }) => {
      // Reachable exactly as an untagged payload is: from JavaScript, from a
      // consumer built against a pre-5.0.0 `midnight-js-types`, or across an
      // untyped boundary.
      const rejection = await proveV8Transaction(payload as unknown as Uint8Array, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
      expect(rejection).toHaveProperty('code', PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION);
      const { message } = rejection as Error;
      // Asserted with the surrounding words, not as a bare substring: the
      // message tail reads "rather than a Uint8Array", so `toContain('Array')`
      // alone would pass for every value this table describes differently.
      expect(message).toContain(`'txBytes' is ${described} rather than a Uint8Array`);
      // The garbled 'undefined-byte payload' message is what reading
      // `.byteLength` off a non-array produced before this guard existed.
      expect(message).not.toContain('undefined-byte');
      // Nothing caller-supplied may arrive unbounded or unfiltered: no newline
      // to forge a log line, and no run past the 32-character cap.
      expect(message).not.toContain('\n');
      expect(message).not.toContain('fake log line');
      expect(message).not.toContain('A'.repeat(33));
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
      // seam's `version` field.
      const currentEraTxBytes = Transaction.fromParts(NETWORK_ID).serialize();

      const rejection = await proveV8Transaction(currentEraTxBytes, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(Error);
      expect(rejection).not.toBeInstanceOf(PayloadNotATransactionError);

      // The runtime names the tag it expected, which is what makes this refusal
      // diagnostic rather than merely negative.
      expect(errorChainText(rejection)).toContain('expected header tag');
    });

    it('leaves a real tag with a truncated body to the runtime, not the seam', async () => {
      // The realistic corruption case for bytes that crossed a network or a
      // storage boundary: the tag survives, the body does not. It passes the
      // seam's check by construction, so what it pins is that the seam does not
      // over-claim -- a damaged transaction is the runtime's refusal to make.
      const truncated = retainedEraTxBytes.subarray(0, V8_UNPROVEN_TX_TAG.length + 4);
      expect(asLatin1(truncated, V8_UNPROVEN_TX_TAG.length)).toBe(V8_UNPROVEN_TX_TAG);

      const rejection = await proveV8Transaction(truncated, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(Error);
      expect(rejection).not.toBeInstanceOf(PayloadNotATransactionError);
    });

    it('bounds the vendor refusal echo to the opening tag region, never the body', () => {
      // MEASURED, and recorded because it is the opposite of what one would
      // assume: the retained runtime's header-tag mismatch DOES echo the
      // payload back in its message -- verbatim, as latin1 text, from offset 0.
      //
      // What bounds the echo is the length of the tag the runtime EXPECTED, so
      // it covers the tag region and stops. A real transaction's body lies past
      // that and never reaches the message, which is the property worth holding.
      const tagRegion = 'A'.repeat(60);
      const bodyMarker = 'BODY-MARKER-MUST-NOT-BE-ECHOED';
      const payload = new Uint8Array(Buffer.from(`${TRANSACTION_TAG_PREFIX}${tagRegion}${bodyMarker}`, 'latin1'));
      const bodyOffset = TRANSACTION_TAG_PREFIX.length + tagRegion.length;
      expect(bodyOffset).toBeGreaterThan(V8_UNPROVEN_TX_TAG.length);

      // The runtime's own refusal, read directly: routing it through
      // `proveV8Transaction` would only add indirection to the same throw. The
      // read is kept out of the `try` so nothing swallows an assertion failure.
      let rejection: unknown;
      try {
        v8Module.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', payload);
      } catch (error: unknown) {
        rejection = error;
      }

      expect(rejection).toBeInstanceOf(Error);
      const text = errorChainText(rejection);
      // The echo is real, and reaches into the caller's own bytes past the prefix.
      expect(text).toContain(tagRegion.slice(0, 40));
      // And it stops before the body: `bodyMarker` starts past the expected
      // tag's length, so its absence is the bound holding rather than a
      // coincidence of encoding or offset.
      expect(text).not.toContain(bodyMarker);
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

      // Nothing of the transaction may ride along. Checked in BOTH encodings:
      // the header-mismatch case above shows the runtime echoes payload bytes
      // as latin1, so a hex-only check could never fail.
      const bodySlice = circuitDrivingTxBytes.subarray(V8_UNPROVEN_TX_TAG.length + 16, V8_UNPROVEN_TX_TAG.length + 32);
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

      const rejection = await proveV8Transaction(circuitDrivingTxBytes, recording).then(
        () => undefined,
        (error: unknown) => error
      );

      // The provider handed in is the one the retained runtime consults, and
      // WHICH member it consults is part of the claim -- labelled, so this
      // cannot pass on `check` when it says `prove`.
      expect(consulted, `proveV8Transaction rejected with: ${String(rejection)}`).toEqual([
        'prove:midnight/zswap/output'
      ]);
    });
  });
});
