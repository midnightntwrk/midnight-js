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

describe('proveV8Transaction', () => {
  let retainedEraTxBytes: Uint8Array;

  beforeAll(async () => {
    const v8 = await loadLedger8();
    retainedEraTxBytes = v8.Transaction.fromParts(NETWORK_ID).serialize();
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
    });
  });
});
