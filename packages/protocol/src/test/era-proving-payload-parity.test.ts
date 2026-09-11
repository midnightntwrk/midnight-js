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
 * Byte parity of the proof-server wire builders across the two eras.
 *
 * `httpClientProvingProvider` builds every `/check` and `/prove` payload with
 * the CURRENT era's builders and drives both eras' transactions through them:
 * the proving protocol is per-circuit, so `proveV8Transaction` hands the
 * retained runtime the same provider a v9 transaction would get. The retained
 * ledger ships its own `createCheckPayload`, `createProvingPayload` and
 * `parseCheckResult`, and nothing else in the repo checks that the two agree.
 *
 * This is the strongest assertion available without a live proof server. If a
 * vendor bump changes either era's framing, a retained-era preimage would
 * otherwise go out in the other era's envelope and fail as a 4xx, a garbage
 * proof, or a proof that serializes cleanly and fails on-chain well-formedness.
 * That silent divergence becomes a red test here.
 *
 * The preimages are CAPTURED from each runtime rather than synthesised: both
 * builders validate the `midnight:proof-preimage:` header tag, so a hand-built
 * byte string is refused and would prove nothing. Capturing them also makes
 * this the real scenario — the exact bytes a real proving provider receives.
 *
 * Byte parity is asserted deliberately, unlike in era-parity.test.ts: these are
 * not era-tagged serializations of ledger objects but a transport envelope, and
 * the whole point is that one era's is substitutable for the other's.
 */

import { readFileSync } from 'node:fs';

import * as ledgerV8 from '@midnightntwrk/ledger-v8';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { beforeAll, describe, expect, it } from 'vitest';

import { loadLedger8 } from '../lib/v8/load';
import { fixturePath } from './fixtures';

const NETWORK_ID = 'undeployed';

const readFixture = (...segments: string[]): Uint8Array =>
  new Uint8Array(readFileSync(fixturePath(...segments)));

const KEY_MATERIAL = {
  proverKey: readFixture('twin-contract', 'compiled', 'keys', 'increment.prover'),
  verifierKey: readFixture('twin-contract', 'compiled', 'keys', 'increment.verifier'),
  ir: readFixture('twin-contract', 'compiled', 'zkir', 'increment.bzkir')
};

/**
 * The serialized proof preimage a runtime hands its proving provider, captured
 * by proving a transaction that carries one Zswap output and refusing at the
 * provider. The refusal is incidental: the preimage has already been built and
 * handed over by then, which is the only thing being collected.
 */
const capturePreimage = async (
  serializedTx: Uint8Array,
  prove: (bytes: Uint8Array, provider: ledgerV9.ProvingProvider) => Promise<unknown>
): Promise<Uint8Array> => {
  let captured: Uint8Array | undefined;
  const recording: ledgerV9.ProvingProvider = {
    check: () => Promise.reject(new Error('not consulted')),
    prove: (serializedPreimage) => {
      captured ??= serializedPreimage;
      return Promise.reject(new Error('captured'));
    },
    lookupKey: () => Promise.resolve(undefined)
  };

  await prove(serializedTx, recording).catch(() => undefined);

  if (captured === undefined) {
    throw new Error('the runtime never handed a proof preimage to the proving provider');
  }
  return captured;
};

describe('proof-server wire builders are byte-identical across eras', () => {
  let v8Preimage: Uint8Array;
  let v9Preimage: Uint8Array;

  beforeAll(async () => {
    const v8 = await loadLedger8();

    const v8TokenType = v8.sampleRawTokenType();
    const v8Tx = v8.Transaction.fromParts(
      NETWORK_ID,
      v8.ZswapOffer.fromOutput(
        v8.ZswapOutput.new(
          v8.createShieldedCoinInfo(v8TokenType, 100n),
          1,
          v8.sampleCoinPublicKey(),
          v8.sampleEncryptionPublicKey()
        ),
        v8TokenType,
        100n
      )
    ).serialize();

    v8Preimage = await capturePreimage(v8Tx, (bytes, provider) =>
      v8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes).prove(
        provider,
        v8.CostModel.initialCostModel()
      )
    );

    const v9TokenType = ledgerV9.sampleRawTokenType();
    const v9Tx = ledgerV9.Transaction.fromParts(
      NETWORK_ID,
      ledgerV9.ZswapOffer.fromOutput(
        ledgerV9.ZswapOutput.new(
          ledgerV9.createShieldedCoinInfo(v9TokenType, 100n),
          1,
          ledgerV9.sampleCoinPublicKey(),
          ledgerV9.sampleEncryptionPublicKey()
        ),
        v9TokenType,
        100n
      )
    ).serialize();

    v9Preimage = await capturePreimage(v9Tx, (bytes, provider) =>
      ledgerV9.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes).prove(
        provider,
        ledgerV9.CostModel.initialCostModel()
      )
    );
  });

  // Both directions, because substitutability has to hold both ways: the
  // retained arm sends a v8 preimage through v9 builders today, and a future
  // change could just as easily route the other way.
  const preimages = (): readonly { readonly label: string; readonly preimage: Uint8Array }[] => [
    { label: 'a preimage produced by the retained runtime', preimage: v8Preimage },
    { label: 'a preimage produced by the current runtime', preimage: v9Preimage }
  ];

  it('captures a real preimage from each runtime', () => {
    // Guards every assertion below: an empty capture would make each `toEqual`
    // a comparison of two refusals rather than of two envelopes.
    for (const { preimage } of preimages()) {
      expect(preimage.byteLength).toBeGreaterThan(0);
      expect(Buffer.from(preimage.subarray(0, 24)).toString('latin1')).toBe('midnight:proof-preimage:');
    }
  });

  it('agree on createCheckPayload with no IR', () => {
    for (const { label, preimage } of preimages()) {
      expect(ledgerV8.createCheckPayload(preimage), label).toEqual(ledgerV9.createCheckPayload(preimage));
    }
  });

  it('agree on createCheckPayload with an IR', () => {
    for (const { label, preimage } of preimages()) {
      expect(ledgerV8.createCheckPayload(preimage, KEY_MATERIAL.ir), label).toEqual(
        ledgerV9.createCheckPayload(preimage, KEY_MATERIAL.ir)
      );
    }
  });

  it('agree on createProvingPayload with no binding input and no key material', () => {
    for (const { label, preimage } of preimages()) {
      expect(ledgerV8.createProvingPayload(preimage, undefined), label).toEqual(
        ledgerV9.createProvingPayload(preimage, undefined)
      );
    }
  });

  it('agree on createProvingPayload with key material', () => {
    for (const { label, preimage } of preimages()) {
      expect(ledgerV8.createProvingPayload(preimage, undefined, KEY_MATERIAL), label).toEqual(
        ledgerV9.createProvingPayload(preimage, undefined, KEY_MATERIAL)
      );
    }
  });

  // The binding input is a bigint crossing the WASM boundary, which is where a
  // width or signedness difference between the two builds would show up.
  it.each([0n, 1n, 2n ** 63n - 1n])('agree on createProvingPayload for a binding input of %s', (binding) => {
    for (const { label, preimage } of preimages()) {
      expect(ledgerV8.createProvingPayload(preimage, binding, KEY_MATERIAL), label).toEqual(
        ledgerV9.createProvingPayload(preimage, binding, KEY_MATERIAL)
      );
    }
  });

  // Read back through both eras from the SAME bytes: a check result is what the
  // proof server answers with, so the two must agree on its meaning as well as
  // on the request envelope. Malformed input is included because the two builds
  // refusing differently is a divergence just as much as two different
  // successful reads would be.
  it.each([
    { label: 'an empty result', result: new Uint8Array() },
    { label: 'a single-byte result', result: Uint8Array.from([0]) },
    { label: 'an arbitrary byte string', result: Uint8Array.from({ length: 48 }, (_u, i) => (i * 7 + 13) % 256) }
  ])('agree on parseCheckResult for $label', ({ result }) => {
    const readWith = (parse: (input: Uint8Array) => (bigint | undefined)[]): string => {
      try {
        return `ok:${JSON.stringify(parse(result).map(String))}`;
      } catch (error: unknown) {
        return `threw:${error instanceof Error ? error.message : String(error)}`;
      }
    };

    expect(readWith(ledgerV8.parseCheckResult)).toBe(readWith(ledgerV9.parseCheckResult));
  });
});
