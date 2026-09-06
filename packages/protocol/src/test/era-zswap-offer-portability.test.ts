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
 * A Zswap offer serialized by one era's ledger is accepted by the other's, and
 * both eras emit the SAME offer tag.
 *
 * This is load-bearing rather than a curiosity, and it is pinned here so that a
 * ledger bump which breaks it fails loudly instead of quietly producing an
 * offer the other era rejects.
 *
 * The consumer that depends on it is `zswapStateToSegmentedOffer`
 * (`packages/contracts/src/utils/zswap-utils.ts`), which builds its offers out
 * of the CURRENT era's ledger classes — that is the ledger the `contracts`
 * package links — and then hands the serialized bytes to whichever era the
 * retained-era pipelines are composing against. Were the two eras' offer
 * encodings different, the retained arm would need a second offer builder, and
 * an offer built by the wrong one would surface as an opaque deserialization
 * failure deep inside a composition.
 *
 * Both tags are read as raw prefix slices, never through `parseSerializedTag`:
 * that parser scans only the first 64 bytes, and while these tags happen to be
 * shorter, the two transaction tags this suite's sibling assertions compare are
 * not — so the same technique is used throughout for one reason.
 */

import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import type { LedgerVersion } from '../lib/shared/ledger-version';

/**
 * The tag both eras emit for a pre-proof Zswap offer. Measured by serializing
 * one on each era, not guessed.
 */
const ZSWAP_OFFER_TAG = 'midnight:zswap-offer[v5](proof-preimage):';

// A well-formed raw token type and nonce: both are hex STRINGS in the ledger's
// own vocabulary, not byte arrays, and the WASM rejects the wrong one outright.
const RAW_TOKEN_TYPE = '00'.repeat(32);
const NONCE = '07'.repeat(32);
const VALUE = 42n;

/**
 * The offer-building slice each era exposes. Declared once, structurally, so
 * the two arms below are the same code against two modules rather than two
 * copies of it.
 */
interface OfferLedger {
  readonly ZswapOutput: {
    readonly new: (coinInfo: { type: string; nonce: string; value: bigint }, segment: number, coinPublicKey: string, encryptionPublicKey: string) => unknown;
  };
  readonly ZswapOffer: {
    readonly fromOutput: (output: never, type: string, value: bigint) => { serialize: () => Uint8Array };
    readonly deserialize: (marker: 'pre-proof', raw: Uint8Array) => unknown;
  };
  readonly sampleCoinPublicKey: () => string;
  readonly sampleEncryptionPublicKey: () => string;
}

const ERAS: Readonly<Record<LedgerVersion, OfferLedger>> = { v8: LedgerV8, v9: ledgerV9 };
const ERA_NAMES = ['v8', 'v9'] as const;

/** Serializes a single-output pre-proof offer on `era`. */
const serializeOffer = (era: OfferLedger): Uint8Array => {
  const output = era.ZswapOutput.new(
    { type: RAW_TOKEN_TYPE, nonce: NONCE, value: VALUE },
    0,
    era.sampleCoinPublicKey(),
    era.sampleEncryptionPublicKey()
  );
  // The output type is the module's own nominal WASM class, and this slice is
  // structural, so the one place the two cannot be unified is here.
  return era.ZswapOffer.fromOutput(output as never, RAW_TOKEN_TYPE, VALUE).serialize();
};

describe('Zswap offer portability across the ledger eras', () => {
  it.each(ERA_NAMES)('%s emits the shared offer tag', (version) => {
    const bytes = serializeOffer(ERAS[version]);

    expect(Buffer.from(bytes.subarray(0, ZSWAP_OFFER_TAG.length)).toString('latin1')).toBe(ZSWAP_OFFER_TAG);
  });

  it('the retained era deserializes an offer the current era serialized', () => {
    const bytes = serializeOffer(ledgerV9);

    expect(LedgerV8.ZswapOffer.deserialize('pre-proof', bytes)).toBeDefined();
  });

  it('the current era deserializes an offer the retained era serialized', () => {
    const bytes = serializeOffer(LedgerV8);

    expect(ledgerV9.ZswapOffer.deserialize('pre-proof', bytes)).toBeDefined();
  });
});
