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

/**
 * The retained era's own UNPROVEN transaction tag, measured against the real
 * runtime. The single pinned tag literal across the provider suites: the two
 * provider packages derive their expectations from the payload in hand rather
 * than restating this, so a vendor schema bump moves this line and nothing
 * else. Its length is also what bounds the runtime's header-mismatch echo.
 */
const RETAINED_ERA_TX_TAG = 'midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1]):';

/** The prefix the seam asserts on, restated so the echo test can build past it. */
const TRANSACTION_TAG_PREFIX = 'midnight:transaction[';

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
    const provenTag = RETAINED_ERA_TX_TAG.replace('proof-preimage', 'proof');
    expect(asLatin1(retainedEraTxBytes, RETAINED_ERA_TX_TAG.length)).toBe(RETAINED_ERA_TX_TAG);
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
      { label: 'a null-prototype object', payload: Object.create(null), described: 'object' },
      // A constructor name is CALLER DATA on a plain object. These two pin the
      // alphabet and the bound that stop it becoming a log-injection channel:
      // punctuation disqualifies a name outright, and a long one is cut to 32.
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
      // it can fail: an accessor that throws, or an exotic object whose trap
      // does. Naming the value is best-effort diagnostics on something already
      // being refused, so neither may turn the coded refusal into a raw throw.
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
      // untyped boundary. Hardening the `version` tag but not this field would
      // leave the same hole one level down.
      const rejection = await proveV8Transaction(payload as unknown as Uint8Array, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
      expect(rejection).toHaveProperty('code', PROVIDER_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION);
      const { message } = rejection as Error;
      expect(message).toContain(described);
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
      // seam's `version` field. Never read an era off the bracketed version.
      const currentEraTxBytes = Transaction.fromParts(NETWORK_ID).serialize();

      const rejection = await proveV8Transaction(currentEraTxBytes, inertProvingProvider).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(Error);
      expect(rejection).not.toBeInstanceOf(PayloadNotATransactionError);

      // The runtime names the tag it expected, which is what makes this refusal
      // diagnostic rather than merely negative. What it echoes OF THE PAYLOAD
      // while doing so is a separate question, measured in the next case.
      expect(errorChainText(rejection)).toContain('expected header tag');
    });

    it('bounds the vendor refusal echo to the opening tag region, never the body', () => {
      // MEASURED, and recorded because it is the opposite of what one would
      // assume: the retained runtime's header-tag mismatch DOES echo the
      // payload back in its message — verbatim, as latin1 text, from offset 0.
      // An earlier version of this suite asserted the absence of an echo at a
      // hex offset the echo never reaches, so it could not have failed. This
      // pins what actually happens instead.
      //
      // What bounds the echo is the length of the tag the runtime EXPECTED — 71
      // bytes on this era — so it covers the tag region and stops. A real
      // transaction's body lies past that and never reaches the message, which
      // is the property worth holding.
      const tagRegion = 'A'.repeat(60);
      const bodyMarker = 'BODY-MARKER-MUST-NOT-BE-ECHOED';
      const payload = new Uint8Array(Buffer.from(`${TRANSACTION_TAG_PREFIX}${tagRegion}${bodyMarker}`, 'latin1'));
      expect(TRANSACTION_TAG_PREFIX.length + tagRegion.length).toBeGreaterThan(RETAINED_ERA_TX_TAG.length);

      // The runtime's own refusal, read directly: routing it through
      // `proveV8Transaction` would only add indirection to the same throw.
      let text = '';
      try {
        v8Module.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', payload);
        expect.fail('expected the retained runtime to refuse a payload with a bad header tag');
      } catch (error) {
        text = errorChainText(error);
      }

      // The echo is real, and reaches into the caller's own bytes past the prefix.
      expect(text).toContain(tagRegion.slice(0, 40));
      // And it stops before the body: `bodyMarker` starts at offset 81, past the
      // 71-byte bound, so its absence is the bound holding rather than a
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
